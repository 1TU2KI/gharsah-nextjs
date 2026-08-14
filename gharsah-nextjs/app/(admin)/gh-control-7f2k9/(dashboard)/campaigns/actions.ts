"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/app/lib/auth/guard";
import { logActivity } from "@/app/lib/db/activity";
import { revalidatePublicCampaignPages } from "@/app/lib/admin/revalidate";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import { markCampaignRequestConverted } from "@/app/lib/db/requests";
import { translateCampaignFields } from "@/app/lib/translate";
import { campaignFormSchema, type CampaignFormFieldErrors, type CampaignFormState } from "@/app/lib/admin/campaignSchema";
import { MEMORIAL_PREFIX_EN } from "@/app/lib/admin/memorialPrefixOptions";
import {
  createCampaignRow,
  updateCampaignRow,
  deleteCampaignRow,
  setCampaignArchived,
  duplicateCampaignRow,
  moveCampaignRow,
  reorderCampaignRows,
  setCampaignPosition,
  updateCampaignStatus,
  isSlugTaken,
  getCampaignRowById,
  type CampaignInput,
  type CampaignRow,
} from "@/app/lib/db/campaignsRepo";

function parseForm(formData: FormData) {
  return campaignFormSchema.safeParse({
    slug: formData.get("slug"),
    platform: formData.get("platform"),
    url: formData.get("url"),
    username: formData.get("username"),
    memorialPrefixAr: formData.get("memorialPrefixAr"),
    relationAr: formData.get("relationAr"),
    titleAr: formData.get("titleAr"),
    titleSource: formData.get("titleSource") || undefined,
    descriptionAr: formData.get("descriptionAr"),
    descriptionSource: formData.get("descriptionSource") || undefined,
    status: formData.get("status"),
    percent: formData.get("percent"),
  });
}

type ParsedCampaignValues = {
  slug: string;
  platform: string;
  url: string;
  username?: string;
  memorialPrefixAr?: string;
  relationAr?: string;
  titleAr: string;
  titleSource?: "fetched" | "manual";
  descriptionAr?: string;
  descriptionSource?: "fetched" | "manual";
  status: "active" | "completed";
  percent?: number;
};

/**
 * The admin only ever submits Arabic (see campaignSchema.ts) — this is the
 * one place English gets produced, and it's the crux of the whole
 * "Arabic-only admin" feature:
 *
 * - title/description/relation ("العنوان الفرعي") all go through
 *   `translateCampaignFields` (AI). Create: every non-empty field is new,
 *   so it's translated. Update: only re-translated if the Arabic actually
 *   changed — unchanged fields keep their current English untouched (the
 *   22 seeded campaigns carry hand-authored English that's likely better
 *   than a fresh AI pass, and there's no reason to burn an API call over an
 *   unrelated edit).
 *
 * - `relation` was previously removed from admin management entirely, then
 *   reinstated as "العنوان الفرعي" — same underlying `relation_ar`/
 *   `relation_en` columns, same public combination with `@username` and
 *   the memorial-prefix phrase (see MemorialLine in CampaignCard.tsx),
 *   just editable again and now translated exactly like title/description
 *   instead of being preserved untouched.
 *
 * - `memorialPrefix` is a controlled selection (MEMORIAL_PREFIX_OPTIONS),
 *   not free text, so its English is resolved from a fixed lookup
 *   (MEMORIAL_PREFIX_EN) instead of an API call — see that file's comment
 *   for why a static map beats AI translation for a closed 3-value set. A
 *   pre-existing phrase that predates the controlled list (e.g. "رحمها الله",
 *   used by most of the original seed data) isn't in that map; if it's
 *   resubmitted unchanged (the edit form injects it as a selectable legacy
 *   option specifically so this can happen), its existing English is kept
 *   as-is rather than being blanked.
 *
 * Never throws: a translation failure still lets the Arabic content save
 * (never blocks the admin over a translation outage), falls back to the
 * Arabic source text for any field that couldn't be translated (readable,
 * never a blank gap in the required title), and returns
 * translationStatus: "error" so the admin UI surfaces it plainly with a
 * retry action — never a silent stale translation.
 */
async function buildCampaignInput(
  values: ParsedCampaignValues,
  existing?: CampaignRow,
  options?: { forceRetranslate?: boolean },
): Promise<CampaignInput> {
  const titleAr = values.titleAr.trim();
  const descriptionAr = values.descriptionAr?.trim() || "";
  const memorialPrefixAr = values.memorialPrefixAr?.trim() || "";

  // Purely informational (see the column comment in client.ts) — meaningless
  // once descriptionAr is empty, so don't persist a stale 'fetched'/'manual'
  // tag for a field that no longer has any content.
  const descriptionSource = descriptionAr ? (values.descriptionSource ?? existing?.description_source ?? "manual") : null;
  // titleAr is always required/non-empty (unlike description), so this
  // never needs the same empty-field guard.
  const titleSource = values.titleSource ?? existing?.title_source ?? "manual";

  const relationAr = values.relationAr?.trim() || "";

  const needsTranslation = {
    title: Boolean(options?.forceRetranslate) || !existing || existing.title_ar !== titleAr,
    description: Boolean(options?.forceRetranslate) || !existing || (existing.description_ar ?? "") !== descriptionAr,
    relation: Boolean(options?.forceRetranslate) || !existing || existing.relation_ar !== relationAr,
  };

  const toTranslate: Parameters<typeof translateCampaignFields>[0] = {};
  if (needsTranslation.title) toTranslate.title = titleAr;
  if (needsTranslation.description && descriptionAr) toTranslate.description = descriptionAr;
  if (needsTranslation.relation && relationAr) toTranslate.relation = relationAr;

  const result = await translateCampaignFields(toTranslate);

  const titleEn = pickTranslation(result, "title", needsTranslation.title, titleAr, existing?.title_en);
  const descriptionEn = descriptionAr
    ? pickTranslation(result, "description", needsTranslation.description, descriptionAr, existing?.description_en)
    : "";
  const relationEn = relationAr
    ? pickTranslation(result, "relation", needsTranslation.relation, relationAr, existing?.relation_en)
    : "";
  const memorialPrefixEn = resolveMemorialPrefixEn(
    memorialPrefixAr,
    existing?.memorial_prefix_ar ?? null,
    existing?.memorial_prefix_en ?? null,
  );

  return {
    slug: values.slug,
    url: values.url,
    platform: values.platform,
    memorialPrefixAr: memorialPrefixAr || null,
    memorialPrefixEn: memorialPrefixEn || null,
    username: values.username?.trim() || null,
    relationAr,
    relationEn,
    titleAr,
    titleEn,
    titleSource,
    status: values.status,
    descriptionAr: descriptionAr || null,
    descriptionEn,
    descriptionSource,
    percent: values.percent ?? null,
    translationStatus: result.ok ? "ok" : "error",
    translationError: result.ok ? null : result.error,
  };
}

/** Picks the freshly translated value for a field that needed it, otherwise keeps whatever English it already had (update) or falls back to the Arabic source itself (create, or translation failed) rather than ever leaving it blank. */
function pickTranslation(
  result: Awaited<ReturnType<typeof translateCampaignFields>>,
  key: "title" | "description" | "relation",
  needed: boolean,
  arabicSource: string,
  previousEnglish: string | null | undefined,
): string {
  if (!needed) return previousEnglish ?? arabicSource;
  if (result.ok && result.fields[key]) return result.fields[key]!;
  return previousEnglish ?? arabicSource;
}

/** "" -> no phrase. One of the three controlled options -> its fixed translation. Anything else (a legacy phrase kept unchanged from before the controlled list existed) -> whatever English it already had, or the Arabic text itself as a last-resort fallback if it somehow has none. */
function resolveMemorialPrefixEn(ar: string, existingAr: string | null, existingEn: string | null): string {
  if (!ar) return "";
  if (MEMORIAL_PREFIX_EN[ar]) return MEMORIAL_PREFIX_EN[ar];
  if (ar === existingAr && existingEn) return existingEn;
  return ar;
}

export async function createCampaignAction(
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const session = await requireAdminSession();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as CampaignFormFieldErrors, formError: null };
  }

  if (isSlugTaken(parsed.data.slug)) {
    return { fieldErrors: { slug: "هذا الرابط الداخلي مستخدم بالفعل" }, formError: null };
  }

  const input = await buildCampaignInput(parsed.data);
  const row = createCampaignRow(input);

  const sourceRequestId = String(formData.get("sourceRequestId") ?? "").trim();
  if (sourceRequestId) {
    markCampaignRequestConverted(sourceRequestId, row.id);
    logActivity({
      action: "request_converted",
      targetType: "request",
      targetId: sourceRequestId,
      targetLabel: row.title_ar,
      adminUsername: session.username,
    });
  }

  logActivity({
    action: "campaign_created",
    targetType: "campaign",
    targetId: row.id,
    targetLabel: row.title_ar,
    adminUsername: session.username,
  });

  revalidatePublicCampaignPages(row.slug);
  redirect(`${ADMIN_BASE_PATH}/campaigns/${row.id}?created=1`);
}

export async function updateCampaignAction(
  id: string,
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const session = await requireAdminSession();

  const existing = getCampaignRowById(id);
  if (!existing) return { fieldErrors: {}, formError: "الحملة غير موجودة." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as CampaignFormFieldErrors, formError: null };
  }

  if (isSlugTaken(parsed.data.slug, id)) {
    return { fieldErrors: { slug: "هذا الرابط الداخلي مستخدم بالفعل" }, formError: null };
  }

  const statusChanged = existing.status !== parsed.data.status;
  const input = await buildCampaignInput(parsed.data, existing);
  updateCampaignRow(id, input);

  logActivity({
    action: "campaign_updated",
    targetType: "campaign",
    targetId: id,
    targetLabel: parsed.data.titleAr,
    adminUsername: session.username,
  });
  if (statusChanged) {
    logActivity({
      action: "campaign_status_changed",
      targetType: "campaign",
      targetId: id,
      targetLabel: parsed.data.titleAr,
      adminUsername: session.username,
      details: `${existing.status} → ${parsed.data.status}`,
    });
  }

  revalidatePublicCampaignPages(existing.slug);
  if (existing.slug !== parsed.data.slug) revalidatePublicCampaignPages(parsed.data.slug);

  // Translation failure is deliberately NOT echoed here — the sidebar's
  // "الترجمة الإنجليزية" panel already shows the status badge, the detailed
  // error, and a retry action for it. Surfacing it a second time in this
  // top-of-form banner would just be a duplicate message for the same event.
  return { fieldErrors: {}, formError: null };
}

/** Re-attempts translation for title/description/relation regardless of whether they changed (bypasses buildCampaignInput's normal change-detection via `forceRetranslate`) — used after a prior failure, or to force-regenerate English without touching the Arabic. memorialPrefix is unaffected by this and resolves exactly as it would on a normal edit (from its fixed lookup). */
export async function retryCampaignTranslationAction(id: string): Promise<{ error: string | null }> {
  const session = await requireAdminSession();
  const existing = getCampaignRowById(id);
  if (!existing) return { error: "الحملة غير موجودة." };

  const input = await buildCampaignInput(
    {
      slug: existing.slug,
      platform: existing.platform,
      url: existing.url,
      username: existing.username ?? undefined,
      memorialPrefixAr: existing.memorial_prefix_ar ?? undefined,
      relationAr: existing.relation_ar ?? undefined,
      titleAr: existing.title_ar,
      descriptionAr: existing.description_ar ?? undefined,
      status: existing.status === "completed" ? "completed" : "active",
      percent: existing.percent ?? undefined,
    },
    existing,
    { forceRetranslate: true }, // title/description/relation re-translate regardless of whether they "changed" (they haven't, since the values above came straight from `existing`)
  );

  updateCampaignRow(id, input);
  logActivity({
    action: "campaign_updated",
    targetType: "campaign",
    targetId: id,
    targetLabel: existing.title_ar,
    adminUsername: session.username,
    details: "retried translation",
  });
  revalidatePublicCampaignPages(existing.slug);

  return { error: input.translationStatus === "error" ? (input.translationError ?? null) : null };
}

export async function deleteCampaignAction(id: string): Promise<void> {
  const session = await requireAdminSession();
  const existing = getCampaignRowById(id);
  if (!existing) return;

  deleteCampaignRow(id);
  logActivity({
    action: "campaign_deleted",
    targetType: "campaign",
    targetId: id,
    targetLabel: existing.title_ar,
    adminUsername: session.username,
  });
  revalidatePublicCampaignPages(existing.slug);
}

export async function setCampaignArchivedAction(id: string, archived: boolean): Promise<void> {
  const session = await requireAdminSession();
  const existing = getCampaignRowById(id);
  if (!existing) return;

  setCampaignArchived(id, archived);
  logActivity({
    action: archived ? "campaign_archived" : "campaign_restored",
    targetType: "campaign",
    targetId: id,
    targetLabel: existing.title_ar,
    adminUsername: session.username,
  });
  revalidatePublicCampaignPages(existing.slug);
}

export async function duplicateCampaignAction(id: string): Promise<void> {
  const session = await requireAdminSession();
  const duplicate = duplicateCampaignRow(id);
  if (!duplicate) return;

  logActivity({
    action: "campaign_duplicated",
    targetType: "campaign",
    targetId: duplicate.id,
    targetLabel: duplicate.title_ar,
    adminUsername: session.username,
  });
  revalidatePublicCampaignPages(duplicate.slug);
  redirect(`${ADMIN_BASE_PATH}/campaigns/${duplicate.id}`);
}

export async function quickChangeStatusAction(id: string, status: "active" | "completed"): Promise<void> {
  const session = await requireAdminSession();
  const existing = getCampaignRowById(id);
  if (!existing) return;

  updateCampaignStatus(id, status);
  logActivity({
    action: "campaign_status_changed",
    targetType: "campaign",
    targetId: id,
    targetLabel: existing.title_ar,
    adminUsername: session.username,
    details: `${existing.status} → ${status}`,
  });
  revalidatePublicCampaignPages(existing.slug);
}

export async function moveCampaignAction(id: string, direction: "up" | "down"): Promise<void> {
  const session = await requireAdminSession();
  moveCampaignRow(id, direction);
  logActivity({
    action: "campaign_reordered",
    targetType: "campaign",
    targetId: id,
    targetLabel: null,
    adminUsername: session.username,
    details: direction,
  });
  revalidatePublicCampaignPages();
}

export async function reorderCampaignsAction(orderedIds: string[]): Promise<void> {
  const session = await requireAdminSession();
  reorderCampaignRows(orderedIds);
  logActivity({
    action: "campaign_reordered",
    targetType: "campaign",
    targetId: null,
    targetLabel: null,
    adminUsername: session.username,
    details: "drag-and-drop",
  });
  revalidatePublicCampaignPages();
}

export async function setCampaignPositionAction(id: string, position: number): Promise<void> {
  const session = await requireAdminSession();
  setCampaignPosition(id, position);
  logActivity({
    action: "campaign_reordered",
    targetType: "campaign",
    targetId: id,
    targetLabel: null,
    adminUsername: session.username,
    details: `set position → ${position}`,
  });
  revalidatePublicCampaignPages();
}
