"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/app/lib/auth/guard";
import { logActivity } from "@/app/lib/db/activity";
import { revalidatePublicCampaignPages, revalidatePublicNewsPages } from "@/app/lib/admin/revalidate";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import { markCampaignRequestConverted } from "@/app/lib/db/requests";
import { recordCampaignAddedEvent, recordCampaignCompletedEvent } from "@/app/lib/db/newsRepo";
import { campaignFieldStatuses, campaignTranslationError, resolveCampaignEnglish } from "@/app/lib/translation/campaignTranslation";
import { isLiveReplaceable, isSettled, parseManual, parseMeta, serializeMeta, TRANSLATED_FIELDS, type FieldStatus, type TranslatedField } from "@/app/lib/translation/meta";
import { normalizeArabic } from "@/app/lib/translation/arabic";
import { translateCampaignText } from "@/app/lib/translate";
import { getLiveCampaignTexts } from "@/app/lib/campaignLiveSync";
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
  listAllCampaignRows,
  updateCampaignTranslation,
  regenerateCampaignShortCode,
  setCampaignShortCode,
  type CampaignInput,
  type CampaignRow,
} from "@/app/lib/db/campaignsRepo";

/**
 * Wraps a single automatic news-event write (`recordCampaignAddedEvent`/
 * `recordCampaignCompletedEvent`, both already idempotent via `event_key` —
 * see newsRepo.ts) so a failure there can NEVER roll back or fail the
 * actual campaign create/status-change action that triggered it — that
 * action has already committed by the time this runs. Logged loudly to the
 * server console (never surfaced to the admin as an error, since the real
 * action they asked for did succeed) so a persistent failure is still
 * visible to whoever's watching logs.
 */
async function recordNewsEventSafely(fn: () => Promise<void>, label: string): Promise<void> {
  try {
    await fn();
    revalidatePublicNewsPages();
  } catch (error) {
    console.error(`[news] failed to record ${label} event`, error);
  }
}

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
    // null (field not in the form) -> undefined = "leave English as-is".
    titleEn: formData.get("titleEn") ?? undefined,
    relationEn: formData.get("relationEn") ?? undefined,
    descriptionEn: formData.get("descriptionEn") ?? undefined,
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
  /** Hand-typed English from the form; undefined = not submitted (keep as-is). */
  titleEn?: string;
  relationEn?: string;
  descriptionEn?: string;
  status: "active" | "completed";
  percent?: number;
};

/**
 * The admin only ever submits Arabic (see campaignSchema.ts) plus optional
 * hand-typed English. English for title/subtitle/description is resolved by
 * `resolveCampaignEnglish` (app/lib/translation/campaignTranslation.ts) —
 * shared with "retry translation" — which keeps hand-typed and still-current
 * English, translates only new/changed/failed fields, and never stores
 * Arabic, a URL, a guess or a partial result as English. Never throws: an
 * engine failure still saves the Arabic, keeps the previous English and
 * records the failure for the admin UI (with a retry action).
 *
 * `memorialPrefix` is a controlled selection resolved from a fixed lookup
 * (MEMORIAL_PREFIX_EN), never machine-translated.
 */
async function buildCampaignInput(values: ParsedCampaignValues, existing?: CampaignRow): Promise<CampaignInput> {
  const titleAr = values.titleAr.trim();
  const descriptionAr = values.descriptionAr?.trim() || "";
  const memorialPrefixAr = values.memorialPrefixAr?.trim() || "";
  const relationAr = values.relationAr?.trim() || "";

  // Purely informational (see the column comment in client.ts).
  const descriptionSource = descriptionAr ? (values.descriptionSource ?? existing?.description_source ?? "manual") : null;
  const titleSource = values.titleSource ?? existing?.title_source ?? "manual";

  const translation = await resolveCampaignEnglish(
    {
      title: { arabic: titleAr, previousArabic: existing?.title_ar, previousEnglish: existing?.title_en ?? "", submitted: values.titleEn },
      relation: { arabic: relationAr, previousArabic: existing?.relation_ar, previousEnglish: existing?.relation_en ?? "", submitted: values.relationEn },
      description: {
        arabic: descriptionAr,
        previousArabic: existing ? (existing.description_ar ?? "") : undefined,
        previousEnglish: existing?.description_en ?? "",
        submitted: values.descriptionEn,
      },
    },
    existing,
    { memorialPrefixAr },
  );

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
    relationEn: translation.english.relation,
    titleAr,
    titleEn: translation.english.title,
    titleSource,
    status: values.status,
    descriptionAr: descriptionAr || null,
    descriptionEn: translation.english.description,
    descriptionSource,
    percent: values.percent ?? null,
    translationStatus: translation.translationStatus,
    translationError: translation.translationError,
    translationManual: translation.translationManual,
    translationMeta: translation.translationMeta,
  };
}

/** "" -> no phrase. One of the controlled options -> its fixed translation. Anything else (a legacy phrase kept unchanged from before the controlled list existed) -> whatever English it already had, or no English at all — never the Arabic text itself. */
function resolveMemorialPrefixEn(ar: string, existingAr: string | null, existingEn: string | null): string {
  if (!ar) return "";
  if (MEMORIAL_PREFIX_EN[ar]) return MEMORIAL_PREFIX_EN[ar];
  if (ar === existingAr && existingEn) return existingEn;
  return "";
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

  if (await isSlugTaken(parsed.data.slug)) {
    return { fieldErrors: { slug: "هذا الرابط الداخلي مستخدم بالفعل" }, formError: null };
  }

  const input = await buildCampaignInput(parsed.data);
  const row = await createCampaignRow(input);

  const sourceRequestId = String(formData.get("sourceRequestId") ?? "").trim();
  if (sourceRequestId) {
    await markCampaignRequestConverted(sourceRequestId, row.id);
    await logActivity({
      action: "request_converted",
      targetType: "request",
      targetId: sourceRequestId,
      targetLabel: row.title_ar,
      adminUsername: session.username,
    });
  }

  await logActivity({
    action: "campaign_created",
    targetType: "campaign",
    targetId: row.id,
    targetLabel: row.title_ar,
    adminUsername: session.username,
  });

  // "الأخبار" — only a genuinely new, immediately-public campaign gets a
  // green "حالة جديدة" post (never one created directly as
  // completed/closed, and never a duplicate campaign — see
  // duplicateCampaignAction below, which deliberately does NOT call this).
  if (row.status === "active") {
    await recordNewsEventSafely(
      () =>
        recordCampaignAddedEvent({
          id: row.id,
          titleAr: row.title_ar,
          titleEn: row.title_en,
          relationAr: row.relation_ar,
          relationEn: row.relation_en,
          username: row.username,
          memorialPrefixAr: row.memorial_prefix_ar,
          memorialPrefixEn: row.memorial_prefix_en,
        }),
      "campaign_added",
    );
  }

  revalidatePublicCampaignPages(row.slug);
  redirect(`${ADMIN_BASE_PATH}/campaigns/${row.id}?created=1`);
}

export async function updateCampaignAction(
  id: string,
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const session = await requireAdminSession();

  const existing = await getCampaignRowById(id);
  if (!existing) return { fieldErrors: {}, formError: "الحملة غير موجودة." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as CampaignFormFieldErrors, formError: null };
  }

  if (await isSlugTaken(parsed.data.slug, id)) {
    return { fieldErrors: { slug: "هذا الرابط الداخلي مستخدم بالفعل" }, formError: null };
  }

  const statusChanged = existing.status !== parsed.data.status;
  const input = await buildCampaignInput(parsed.data, existing);
  await updateCampaignRow(id, input);

  await logActivity({
    action: "campaign_updated",
    targetType: "campaign",
    targetId: id,
    targetLabel: parsed.data.titleAr,
    adminUsername: session.username,
  });
  if (statusChanged) {
    await logActivity({
      action: "campaign_status_changed",
      targetType: "campaign",
      targetId: id,
      targetLabel: parsed.data.titleAr,
      adminUsername: session.username,
      details: `${existing.status} → ${parsed.data.status}`,
    });

    // "الأخبار" — only a REAL active → completed transition gets a blue
    // "اكتملت حالة" post (never closed → completed or any other pairing).
    if (existing.status === "active" && parsed.data.status === "completed") {
      await recordNewsEventSafely(
        () =>
          recordCampaignCompletedEvent({
            id,
            titleAr: input.titleAr,
            titleEn: input.titleEn,
            relationAr: input.relationAr,
            relationEn: input.relationEn,
            username: input.username ?? null,
            memorialPrefixAr: input.memorialPrefixAr ?? null,
            memorialPrefixEn: input.memorialPrefixEn ?? null,
          }),
        "campaign_completed",
      );
    }
  }

  revalidatePublicCampaignPages(existing.slug);
  if (existing.slug !== parsed.data.slug) revalidatePublicCampaignPages(parsed.data.slug);

  // Translation failure is deliberately NOT echoed here — the sidebar's
  // "الترجمة الإنجليزية" panel already shows the status badge, the detailed
  // error, and a retry action for it. Surfacing it a second time in this
  // top-of-form banner would just be a duplicate message for the same event.
  return { fieldErrors: {}, formError: null };
}

/** Per-campaign result of a retry — shown in the admin after "retry all". */
export type RetryOutcomeKind = "translated" | "review" | "pending" | "failed";
export type RetryReportItem = {
  id: string;
  slug: string;
  titleAr: string;
  outcome: RetryOutcomeKind;
  /** English was (re)written by this retry. */
  changed: boolean;
  error: string | null;
};

function outcomeOf(statuses: Record<TranslatedField, FieldStatus>, liveKind: RetryOutcomeKind | null): RetryOutcomeKind {
  const all = TRANSLATED_FIELDS.map((f) => statuses[f]);
  if (all.includes("pending") || liveKind === "pending") return "pending";
  if (all.some((s) => s === "failed" || s === "missing" || s === "stale") || liveKind === "failed") return "failed";
  if (all.includes("review_recommended") || liveKind === "review") return "review";
  return "translated";
}

/**
 * Re-attempts translation for ONE campaign without changing anything but its
 * English/translation columns (never Arabic, status, order, URL…):
 * - saved fields that are missing / pending / failed / stale are
 *   re-translated (hand-typed and still-current English is left alone);
 * - for Ehsan campaigns, live Arabic that differs from the saved Arabic is
 *   translated into the shared cache, so English mode can show it.
 */
async function retryCampaignTranslation(row: CampaignRow): Promise<RetryReportItem> {
  const outcome = await resolveCampaignEnglish(
    {
      title: { arabic: row.title_ar, previousArabic: row.title_ar, previousEnglish: row.title_en },
      relation: { arabic: row.relation_ar, previousArabic: row.relation_ar, previousEnglish: row.relation_en },
      description: { arabic: row.description_ar ?? "", previousArabic: row.description_ar ?? "", previousEnglish: row.description_en },
    },
    row,
    { memorialPrefixAr: row.memorial_prefix_ar },
  );
  // Legacy markers alone ({method:"legacy"} for still-valid older English)
  // are not a change worth writing — such rows are recognized without them.
  const withoutLegacy = (raw: string | null) => {
    const meta = parseMeta(raw);
    for (const f of TRANSLATED_FIELDS) if (meta[f]?.method === "legacy" && !meta[f]?.pending) delete meta[f];
    return serializeMeta(meta);
  };
  const changed =
    outcome.english.title !== row.title_en ||
    outcome.english.relation !== row.relation_en ||
    outcome.english.description !== row.description_en ||
    withoutLegacy(outcome.translationMeta) !== withoutLegacy(row.translation_meta) ||
    outcome.translationStatus !== row.translation_status ||
    outcome.translationError !== row.translation_error;
  if (changed) {
    await updateCampaignTranslation(row.id, {
      titleEn: outcome.english.title,
      relationEn: outcome.english.relation,
      descriptionEn: outcome.english.description,
      translationStatus: outcome.translationStatus,
      translationError: outcome.translationError,
      translationMeta: outcome.translationMeta,
    });
  }

  let liveError: string | null = null;
  let liveKind: RetryOutcomeKind | null = null;
  const live = await getLiveCampaignTexts(row.platform, row.url);
  if (live) {
    // Only for fields whose English live sync may actually replace — never
    // hand-typed, reviewed or hand-authored English (see isLiveReplaceable).
    const manual = parseManual(outcome.translationManual);
    const meta = parseMeta(outcome.translationMeta);
    const request: { title?: string; description?: string } = {};
    if (
      live.title &&
      normalizeArabic(live.title) !== normalizeArabic(row.title_ar) &&
      isLiveReplaceable(outcome.english.title, manual.has("title"), meta.title)
    ) {
      request.title = live.title;
    }
    if (
      live.description &&
      normalizeArabic(live.description) !== normalizeArabic(row.description_ar ?? "") &&
      isLiveReplaceable(outcome.english.description, manual.has("description"), meta.description)
    ) {
      request.description = live.description;
    }
    if (request.title || request.description) {
      // Successful results are cached by translateCampaignText; nothing on the campaign row changes.
      const results = await translateCampaignText(request, {
        titleAr: row.title_ar,
        relationAr: row.relation_ar,
        memorialPrefixAr: row.memorial_prefix_ar,
      });
      for (const result of Object.values(results)) {
        if (result?.state === "error") {
          liveError ??= `نص إحسان المحدَّث: ${result.error}`;
          liveKind = result.kind === "unavailable" ? "pending" : "failed";
        } else if (result?.review && !liveKind) {
          liveKind = "review";
        }
      }
    }
  }

  const kind = outcomeOf(outcome.statuses, liveKind);
  const error = kind === "pending" || kind === "failed" ? (outcome.translationError ?? liveError) : null;
  return { id: row.id, slug: row.slug, titleAr: row.title_ar, outcome: kind, changed, error };
}

/** "إعادة محاولة الترجمة" for one campaign — see retryCampaignTranslation. */
export async function retryCampaignTranslationAction(id: string): Promise<{ error: string | null; outcome: RetryOutcomeKind | null }> {
  const session = await requireAdminSession();
  const existing = await getCampaignRowById(id);
  if (!existing) return { error: "الحملة غير موجودة.", outcome: null };

  const result = await retryCampaignTranslation(existing);
  if (result.changed) {
    await logActivity({
      action: "campaign_updated",
      targetType: "campaign",
      targetId: id,
      targetLabel: existing.title_ar,
      adminUsername: session.username,
      details: `retried translation: ${result.outcome}`,
    });
  }
  revalidatePublicCampaignPages(existing.slug);
  return { error: result.error, outcome: result.outcome };
}

/**
 * Retries every non-archived campaign (only missing / pending / failed /
 * stale fields, plus changed live Ehsan text, are actually translated) and
 * reports the outcome for EACH campaign. Only translation columns are
 * written, and only for campaigns that change. Never re-translates current
 * or hand-typed English.
 */
export async function retryAllCampaignTranslationsAction(): Promise<{ items: RetryReportItem[] }> {
  const session = await requireAdminSession();
  const rows = (await listAllCampaignRows()).filter((row) => !row.archived_at);
  const items: RetryReportItem[] = [];
  for (const row of rows) items.push(await retryCampaignTranslation(row));
  const count = (k: RetryOutcomeKind) => items.filter((i) => i.outcome === k).length;
  await logActivity({
    action: "campaign_updated",
    targetType: "campaign",
    targetId: null,
    targetLabel: null,
    adminUsername: session.username,
    details: `retried all translations: ${items.filter((i) => i.changed).length} updated; translated ${count("translated")}, review ${count("review")}, pending ${count("pending")}, failed ${count("failed")}`,
  });
  revalidatePublicCampaignPages();
  return { items };
}

/**
 * Marks a published "Review recommended" field as checked by an admin (the
 * English stays exactly as it is). Stored as "reviewed", so a later Arabic
 * edit re-translates it normally. To change the wording, type English in
 * the form instead (that makes it hand-typed and protected).
 */
export async function confirmTranslationReviewAction(id: string, field: TranslatedField): Promise<{ error: string | null }> {
  const session = await requireAdminSession();
  if (!TRANSLATED_FIELDS.includes(field)) return { error: "حقل غير معروف." };
  const row = await getCampaignRowById(id);
  if (!row) return { error: "الحملة غير موجودة." };
  if (campaignFieldStatuses(row)[field] !== "review_recommended") {
    return { error: "لا توجد ترجمة بانتظار المراجعة لهذا الحقل." };
  }
  const meta = parseMeta(row.translation_meta);
  meta[field] = { src: meta[field]?.src, method: "reviewed" };
  const next = { ...row, translation_meta: serializeMeta(meta) };
  const translated = TRANSLATED_FIELDS.every((f) => isSettled(campaignFieldStatuses(next)[f]));
  await updateCampaignTranslation(id, {
    titleEn: row.title_en,
    relationEn: row.relation_en,
    descriptionEn: row.description_en,
    translationStatus: translated ? "ok" : "error",
    translationError: translated ? null : (campaignTranslationError(next) ?? row.translation_error),
    translationMeta: next.translation_meta,
  });
  await logActivity({
    action: "campaign_updated",
    targetType: "campaign",
    targetId: id,
    targetLabel: row.title_ar,
    adminUsername: session.username,
    details: `confirmed ${field} translation review`,
  });
  revalidatePublicCampaignPages(row.slug);
  return { error: null };
}

export async function deleteCampaignAction(id: string): Promise<void> {
  const session = await requireAdminSession();
  const existing = await getCampaignRowById(id);
  if (!existing) return;

  await deleteCampaignRow(id);
  await logActivity({
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
  const existing = await getCampaignRowById(id);
  if (!existing) return;

  await setCampaignArchived(id, archived);
  await logActivity({
    action: archived ? "campaign_archived" : "campaign_restored",
    targetType: "campaign",
    targetId: id,
    targetLabel: existing.title_ar,
    adminUsername: session.username,
  });
  revalidatePublicCampaignPages(existing.slug);
}

/** Deliberately does NOT record a "الأخبار" campaign_added event — a duplicate is a copy of existing content, not a genuine new campaign (see recordCampaignAddedEvent's own doc comment). */
export async function duplicateCampaignAction(id: string): Promise<void> {
  const session = await requireAdminSession();
  const duplicate = await duplicateCampaignRow(id);
  if (!duplicate) return;

  await logActivity({
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
  const existing = await getCampaignRowById(id);
  if (!existing) return;

  await updateCampaignStatus(id, status);
  await logActivity({
    action: "campaign_status_changed",
    targetType: "campaign",
    targetId: id,
    targetLabel: existing.title_ar,
    adminUsername: session.username,
    details: `${existing.status} → ${status}`,
  });

  if (existing.status === "active" && status === "completed") {
    await recordNewsEventSafely(
      () =>
        recordCampaignCompletedEvent({
          id,
          titleAr: existing.title_ar,
          titleEn: existing.title_en,
          relationAr: existing.relation_ar,
          relationEn: existing.relation_en,
          username: existing.username,
          memorialPrefixAr: existing.memorial_prefix_ar,
          memorialPrefixEn: existing.memorial_prefix_en,
        }),
      "campaign_completed",
    );
  }

  revalidatePublicCampaignPages(existing.slug);
}

export async function moveCampaignAction(id: string, direction: "up" | "down"): Promise<void> {
  const session = await requireAdminSession();
  await moveCampaignRow(id, direction);
  await logActivity({
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
  await reorderCampaignRows(orderedIds);
  await logActivity({
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
  await setCampaignPosition(id, position);
  await logActivity({
    action: "campaign_reordered",
    targetType: "campaign",
    targetId: id,
    targetLabel: null,
    adminUsername: session.username,
    details: `set position → ${position}`,
  });
  revalidatePublicCampaignPages();
}

/** Discards whatever short code the campaign had (auto-generated or a custom alias) and assigns a fresh random one — reuses "campaign_updated" in the activity log rather than adding a new ActivityAction value, same pattern retryCampaignTranslationAction already uses for its own minor, non-content edit. */
export async function regenerateShortCodeAction(id: string): Promise<{ code: string | null; error: string | null }> {
  const session = await requireAdminSession();
  const existing = await getCampaignRowById(id);
  if (!existing) return { code: null, error: "الحملة غير موجودة." };

  const code = await regenerateCampaignShortCode(id);
  await logActivity({
    action: "campaign_updated",
    targetType: "campaign",
    targetId: id,
    targetLabel: existing.title_ar,
    adminUsername: session.username,
    details: `short link regenerated → ${code}`,
  });
  revalidatePublicCampaignPages(existing.slug);
  return { code, error: null };
}

/** Sets a custom alias (e.g. "turki") in place of the auto-generated code — validated (format + uniqueness) in setCampaignShortCode itself, not just campaignSchema.ts, since this is reachable directly as its own action. */
export async function setCustomShortCodeAction(id: string, code: string): Promise<{ code: string | null; error: string | null }> {
  const session = await requireAdminSession();
  const existing = await getCampaignRowById(id);
  if (!existing) return { code: null, error: "الحملة غير موجودة." };

  const result = await setCampaignShortCode(id, code);
  if (!result.ok) return { code: null, error: result.error };

  await logActivity({
    action: "campaign_updated",
    targetType: "campaign",
    targetId: id,
    targetLabel: existing.title_ar,
    adminUsername: session.username,
    details: `short link customized → ${result.code}`,
  });
  revalidatePublicCampaignPages(existing.slug);
  return { code: result.code, error: null };
}
