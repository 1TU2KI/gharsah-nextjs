import { randomUUID } from "node:crypto";
import { all, get, run } from "./client";
import { toPlain, toPlainArray } from "./utils";

export type CampaignStatusDb = "active" | "completed" | "closed";

export type CampaignRow = {
  id: string;
  slug: string;
  order_index: number;
  url: string;
  platform: string;
  memorial_prefix_ar: string | null;
  memorial_prefix_en: string | null;
  username: string | null;
  relation_ar: string;
  relation_en: string;
  title_ar: string;
  title_en: string;
  status: CampaignStatusDb;
  description_ar: string | null;
  description_en: string;
  percent: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  /** See the column comment in client.ts — 'ok' unless the last auto-translate attempt failed. */
  translation_status: "ok" | "error";
  translation_error: string | null;
  /** See the column comment in client.ts — how description_ar got its current value ('fetched' from the official platform page vs 'manual'), purely informational. */
  description_source: "fetched" | "manual" | null;
  /** Same as description_source, but for title_ar. */
  title_source: "fetched" | "manual" | null;
};

export type CampaignInput = {
  slug: string;
  url: string;
  platform: string;
  memorialPrefixAr?: string | null;
  memorialPrefixEn?: string | null;
  username?: string | null;
  relationAr: string;
  relationEn: string;
  titleAr: string;
  titleEn: string;
  status: CampaignStatusDb;
  descriptionAr?: string | null;
  descriptionEn: string;
  descriptionSource?: "fetched" | "manual" | null;
  titleSource?: "fetched" | "manual" | null;
  percent?: number | null;
  /** The *_en fields above are always AI-generated (see app/lib/translate.ts), never admin-typed — these two flag whether that generation actually succeeded, so a translation outage is visible in the admin UI instead of silently shipping stale/missing English. */
  translationStatus: "ok" | "error";
  translationError?: string | null;
};

/** Every non-archived campaign, in display order — the exact set/order the public site renders. */
export async function listCampaignRows(): Promise<CampaignRow[]> {
  return toPlainArray(
    await all<CampaignRow>("SELECT * FROM campaigns WHERE archived_at IS NULL ORDER BY order_index ASC"),
  );
}

/** Admin-only: includes archived campaigns, for the "show archived" filter. */
export async function listAllCampaignRows(): Promise<CampaignRow[]> {
  return toPlainArray(await all<CampaignRow>("SELECT * FROM campaigns ORDER BY order_index ASC"));
}

export async function getCampaignRowBySlug(slug: string): Promise<CampaignRow | undefined> {
  const row = await get<CampaignRow>("SELECT * FROM campaigns WHERE slug = ? AND archived_at IS NULL", [slug]);
  return row ? toPlain(row) : undefined;
}

export async function getCampaignRowById(id: string): Promise<CampaignRow | undefined> {
  const row = await get<CampaignRow>("SELECT * FROM campaigns WHERE id = ?", [id]);
  return row ? toPlain(row) : undefined;
}

export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const row = excludeId
    ? await get("SELECT id FROM campaigns WHERE slug = ? AND id != ?", [slug, excludeId])
    : await get("SELECT id FROM campaigns WHERE slug = ?", [slug]);
  return row !== undefined;
}

async function nextOrderIndex(): Promise<number> {
  const row = await get<{ maxOrder: number | null }>("SELECT MAX(order_index) as maxOrder FROM campaigns");
  return (row?.maxOrder ?? 0) + 1;
}

export async function createCampaignRow(input: CampaignInput): Promise<CampaignRow> {
  const now = new Date().toISOString();
  const row: CampaignRow = {
    id: randomUUID(),
    slug: input.slug,
    order_index: await nextOrderIndex(),
    url: input.url,
    platform: input.platform,
    memorial_prefix_ar: input.memorialPrefixAr ?? null,
    memorial_prefix_en: input.memorialPrefixEn ?? null,
    username: input.username ?? null,
    relation_ar: input.relationAr,
    relation_en: input.relationEn,
    title_ar: input.titleAr,
    title_en: input.titleEn,
    status: input.status,
    description_ar: input.descriptionAr ?? null,
    description_en: input.descriptionEn,
    percent: input.percent ?? null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    completed_at: input.status === "completed" ? now : null,
    translation_status: input.translationStatus,
    translation_error: input.translationError ?? null,
    description_source: input.descriptionSource ?? null,
    title_source: input.titleSource ?? null,
  };
  await run(
    `INSERT INTO campaigns
      (id, slug, order_index, url, platform, memorial_prefix_ar, memorial_prefix_en, username, relation_ar, relation_en, title_ar, title_en, status, description_ar, description_en, percent, archived_at, created_at, updated_at, completed_at, translation_status, translation_error, description_source, title_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.slug,
      row.order_index,
      row.url,
      row.platform,
      row.memorial_prefix_ar,
      row.memorial_prefix_en,
      row.username,
      row.relation_ar,
      row.relation_en,
      row.title_ar,
      row.title_en,
      row.status,
      row.description_ar,
      row.description_en,
      row.percent,
      row.archived_at,
      row.created_at,
      row.updated_at,
      row.completed_at,
      row.translation_status,
      row.translation_error,
      row.description_source,
      row.title_source,
    ],
  );
  return row;
}

export async function updateCampaignRow(id: string, input: CampaignInput): Promise<CampaignRow | undefined> {
  const existing = await getCampaignRowById(id);
  const completedAt = resolveCompletedAt(existing?.status, existing?.completed_at ?? null, input.status);

  await run(
    `UPDATE campaigns SET
      slug = ?, url = ?, platform = ?, memorial_prefix_ar = ?, memorial_prefix_en = ?, username = ?,
      relation_ar = ?, relation_en = ?, title_ar = ?, title_en = ?, status = ?,
      description_ar = ?, description_en = ?, percent = ?, updated_at = ?, completed_at = ?,
      translation_status = ?, translation_error = ?, description_source = ?, title_source = ?
     WHERE id = ?`,
    [
      input.slug,
      input.url,
      input.platform,
      input.memorialPrefixAr ?? null,
      input.memorialPrefixEn ?? null,
      input.username ?? null,
      input.relationAr,
      input.relationEn,
      input.titleAr,
      input.titleEn,
      input.status,
      input.descriptionAr ?? null,
      input.descriptionEn,
      input.percent ?? null,
      new Date().toISOString(),
      completedAt,
      input.translationStatus,
      input.translationError ?? null,
      input.descriptionSource ?? null,
      input.titleSource ?? null,
      id,
    ],
  );
  return getCampaignRowById(id);
}

/**
 * Shared by both `updateCampaignRow` and `updateCampaignStatus`: only sets
 * `completed_at` the moment status actually transitions INTO "completed"
 * (never overwrites an existing completion date on a no-op re-save), and
 * clears it if status moves back OUT of "completed" — so it always reflects
 * the most recent real transition, never a stale one from a prior status
 * change.
 */
function resolveCompletedAt(
  previousStatus: CampaignStatusDb | undefined,
  previousCompletedAt: string | null,
  nextStatus: CampaignStatusDb,
): string | null {
  if (nextStatus !== "completed") return null;
  if (previousStatus === "completed" && previousCompletedAt) return previousCompletedAt;
  return new Date().toISOString();
}

export async function updateCampaignStatus(id: string, status: CampaignStatusDb): Promise<void> {
  const existing = await getCampaignRowById(id);
  const completedAt = resolveCompletedAt(existing?.status, existing?.completed_at ?? null, status);
  await run("UPDATE campaigns SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?", [
    status,
    completedAt,
    new Date().toISOString(),
    id,
  ]);
}

export async function deleteCampaignRow(id: string): Promise<void> {
  await run("DELETE FROM campaigns WHERE id = ?", [id]);
}

export async function setCampaignArchived(id: string, archived: boolean): Promise<void> {
  await run("UPDATE campaigns SET archived_at = ?, updated_at = ? WHERE id = ?", [
    archived ? new Date().toISOString() : null,
    new Date().toISOString(),
    id,
  ]);
}

/** Copies every field except identity (new id/slug) and ordering (appended at the end), status carried over unchanged. */
export async function duplicateCampaignRow(id: string): Promise<CampaignRow | undefined> {
  const source = await getCampaignRowById(id);
  if (!source) return undefined;

  let candidateSlug = `${source.slug}-copy`;
  let suffix = 2;
  while (await isSlugTaken(candidateSlug)) {
    candidateSlug = `${source.slug}-copy-${suffix}`;
    suffix += 1;
  }

  return createCampaignRow({
    slug: candidateSlug,
    url: source.url,
    platform: source.platform,
    memorialPrefixAr: source.memorial_prefix_ar,
    memorialPrefixEn: source.memorial_prefix_en,
    username: source.username,
    relationAr: source.relation_ar,
    relationEn: source.relation_en,
    titleAr: `${source.title_ar} (نسخة)`,
    titleEn: `${source.title_en} (Copy)`,
    // The title text itself changes here ("(نسخة)" appended), unlike
    // description which is copied verbatim — so unlike descriptionSource
    // below, this can't honestly claim to still be the literal fetched
    // text even if the source campaign's title was.
    titleSource: "manual",
    status: source.status,
    descriptionAr: source.description_ar,
    descriptionEn: source.description_en,
    descriptionSource: source.description_source,
    percent: source.percent,
    // Copying already-translated text verbatim, not re-translating — carry
    // the source's own translation status/error through unchanged.
    translationStatus: source.translation_status,
    translationError: source.translation_error,
  });
}

/** Full reorder: `orderedIds` is the complete new top-to-bottom id order (drag-and-drop drop result). Ids not present keep their relative order appended after. */
export async function reorderCampaignRows(orderedIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  for (const [index, id] of orderedIds.entries()) {
    await run("UPDATE campaigns SET order_index = ?, updated_at = ? WHERE id = ?", [index + 1, now, id]);
  }
}

/** Single-step move (the accessible up/down-button fallback to drag-and-drop): swaps order_index with the adjacent campaign in the full (non-archived) list. */
export async function moveCampaignRow(id: string, direction: "up" | "down"): Promise<void> {
  const rows = await listCampaignRows();
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) return;

  const current = rows[index];
  const swapWith = rows[swapIndex];
  const now = new Date().toISOString();
  await run("UPDATE campaigns SET order_index = ?, updated_at = ? WHERE id = ?", [swapWith.order_index, now, current.id]);
  await run("UPDATE campaigns SET order_index = ?, updated_at = ? WHERE id = ?", [current.order_index, now, swapWith.id]);
}

/**
 * Moves a single campaign to an explicit 1-based position among the
 * non-archived list (the "set a numeric priority/order" field on the edit
 * form) — removes it from its current spot and re-numbers everyone else
 * sequentially, rather than trying to resolve order_index collisions.
 * `position` is clamped to the valid range.
 */
export async function setCampaignPosition(id: string, position: number): Promise<void> {
  const rows = await listCampaignRows();
  const currentIndex = rows.findIndex((row) => row.id === id);
  if (currentIndex === -1) return;

  const [moved] = rows.splice(currentIndex, 1);
  const targetIndex = Math.min(Math.max(position - 1, 0), rows.length);
  rows.splice(targetIndex, 0, moved);

  await reorderCampaignRows(rows.map((row) => row.id));
}

// ---- Aggregates for the admin overview/statistics pages ----

export async function countCampaigns(): Promise<number> {
  const row = await get<{ count: number }>("SELECT COUNT(*)::int as count FROM campaigns WHERE archived_at IS NULL");
  return row?.count ?? 0;
}

export async function countCampaignsByStatus(): Promise<Record<CampaignStatusDb, number>> {
  const rows = await all<{ status: CampaignStatusDb; count: number }>(
    "SELECT status, COUNT(*)::int as count FROM campaigns WHERE archived_at IS NULL GROUP BY status",
  );
  const result: Record<CampaignStatusDb, number> = { active: 0, completed: 0, closed: 0 };
  for (const row of rows) result[row.status] = row.count;
  return result;
}

export async function countCampaignsByPlatform(): Promise<{ platform: string; count: number }[]> {
  return toPlainArray(
    await all<{ platform: string; count: number }>(
      "SELECT platform, COUNT(*)::int as count FROM campaigns WHERE archived_at IS NULL GROUP BY platform ORDER BY count DESC",
    ),
  );
}

/** Campaign creation activity bucketed by day (for the "campaigns added over time" chart) — ISO date string -> count. */
export async function campaignsCreatedByDay(): Promise<{ day: string; count: number }[]> {
  return toPlainArray(
    await all<{ day: string; count: number }>(
      "SELECT substr(created_at, 1, 10) as day, COUNT(*)::int as count FROM campaigns GROUP BY day ORDER BY day ASC",
    ),
  );
}

/**
 * Campaign completion activity bucketed by day, from the real `completed_at`
 * event (see its column comment in client.ts) — NOT a proxy like
 * `updated_at`. Campaigns that were already completed when seeded have no
 * true historical date and are correctly absent here rather than guessed.
 */
export async function campaignsCompletedByDay(): Promise<{ day: string; count: number }[]> {
  return toPlainArray(
    await all<{ day: string; count: number }>(
      "SELECT substr(completed_at, 1, 10) as day, COUNT(*)::int as count FROM campaigns WHERE completed_at IS NOT NULL GROUP BY day ORDER BY day ASC",
    ),
  );
}
