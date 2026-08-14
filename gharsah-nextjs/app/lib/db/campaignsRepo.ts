import { randomUUID } from "node:crypto";
import { db } from "./client";
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
export function listCampaignRows(): CampaignRow[] {
  return toPlainArray(
    db.prepare("SELECT * FROM campaigns WHERE archived_at IS NULL ORDER BY order_index ASC").all() as CampaignRow[],
  );
}

/** Admin-only: includes archived campaigns, for the "show archived" filter. */
export function listAllCampaignRows(): CampaignRow[] {
  return toPlainArray(db.prepare("SELECT * FROM campaigns ORDER BY order_index ASC").all() as CampaignRow[]);
}

export function getCampaignRowBySlug(slug: string): CampaignRow | undefined {
  const row = db.prepare("SELECT * FROM campaigns WHERE slug = ? AND archived_at IS NULL").get(slug) as
    | CampaignRow
    | undefined;
  return row ? toPlain(row) : undefined;
}

export function getCampaignRowById(id: string): CampaignRow | undefined {
  const row = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as CampaignRow | undefined;
  return row ? toPlain(row) : undefined;
}

export function isSlugTaken(slug: string, excludeId?: string): boolean {
  const row = excludeId
    ? db.prepare("SELECT id FROM campaigns WHERE slug = ? AND id != ?").get(slug, excludeId)
    : db.prepare("SELECT id FROM campaigns WHERE slug = ?").get(slug);
  return row !== undefined;
}

function nextOrderIndex(): number {
  const row = db.prepare("SELECT MAX(order_index) as maxOrder FROM campaigns").get() as { maxOrder: number | null };
  return (row.maxOrder ?? 0) + 1;
}

export function createCampaignRow(input: CampaignInput): CampaignRow {
  const now = new Date().toISOString();
  const row: CampaignRow = {
    id: randomUUID(),
    slug: input.slug,
    order_index: nextOrderIndex(),
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
  db.prepare(
    `INSERT INTO campaigns
      (id, slug, order_index, url, platform, memorial_prefix_ar, memorial_prefix_en, username, relation_ar, relation_en, title_ar, title_en, status, description_ar, description_en, percent, archived_at, created_at, updated_at, completed_at, translation_status, translation_error, description_source, title_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
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
  );
  return row;
}

export function updateCampaignRow(id: string, input: CampaignInput): CampaignRow | undefined {
  const existing = getCampaignRowById(id);
  const completedAt = resolveCompletedAt(existing?.status, existing?.completed_at ?? null, input.status);

  db.prepare(
    `UPDATE campaigns SET
      slug = ?, url = ?, platform = ?, memorial_prefix_ar = ?, memorial_prefix_en = ?, username = ?,
      relation_ar = ?, relation_en = ?, title_ar = ?, title_en = ?, status = ?,
      description_ar = ?, description_en = ?, percent = ?, updated_at = ?, completed_at = ?,
      translation_status = ?, translation_error = ?, description_source = ?, title_source = ?
     WHERE id = ?`,
  ).run(
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

export function updateCampaignStatus(id: string, status: CampaignStatusDb): void {
  const existing = getCampaignRowById(id);
  const completedAt = resolveCompletedAt(existing?.status, existing?.completed_at ?? null, status);
  db.prepare("UPDATE campaigns SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?").run(
    status,
    completedAt,
    new Date().toISOString(),
    id,
  );
}

export function deleteCampaignRow(id: string): void {
  db.prepare("DELETE FROM campaigns WHERE id = ?").run(id);
}

export function setCampaignArchived(id: string, archived: boolean): void {
  db.prepare("UPDATE campaigns SET archived_at = ?, updated_at = ? WHERE id = ?").run(
    archived ? new Date().toISOString() : null,
    new Date().toISOString(),
    id,
  );
}

/** Copies every field except identity (new id/slug) and ordering (appended at the end), status carried over unchanged. */
export function duplicateCampaignRow(id: string): CampaignRow | undefined {
  const source = getCampaignRowById(id);
  if (!source) return undefined;

  let candidateSlug = `${source.slug}-copy`;
  let suffix = 2;
  while (isSlugTaken(candidateSlug)) {
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
export function reorderCampaignRows(orderedIds: string[]): void {
  const update = db.prepare("UPDATE campaigns SET order_index = ?, updated_at = ? WHERE id = ?");
  const now = new Date().toISOString();
  orderedIds.forEach((id, index) => {
    update.run(index + 1, now, id);
  });
}

/** Single-step move (the accessible up/down-button fallback to drag-and-drop): swaps order_index with the adjacent campaign in the full (non-archived) list. */
export function moveCampaignRow(id: string, direction: "up" | "down"): void {
  const rows = listCampaignRows();
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) return;

  const current = rows[index];
  const swapWith = rows[swapIndex];
  const now = new Date().toISOString();
  db.prepare("UPDATE campaigns SET order_index = ?, updated_at = ? WHERE id = ?").run(
    swapWith.order_index,
    now,
    current.id,
  );
  db.prepare("UPDATE campaigns SET order_index = ?, updated_at = ? WHERE id = ?").run(
    current.order_index,
    now,
    swapWith.id,
  );
}

/**
 * Moves a single campaign to an explicit 1-based position among the
 * non-archived list (the "set a numeric priority/order" field on the edit
 * form) — removes it from its current spot and re-numbers everyone else
 * sequentially, rather than trying to resolve order_index collisions.
 * `position` is clamped to the valid range.
 */
export function setCampaignPosition(id: string, position: number): void {
  const rows = listCampaignRows();
  const currentIndex = rows.findIndex((row) => row.id === id);
  if (currentIndex === -1) return;

  const [moved] = rows.splice(currentIndex, 1);
  const targetIndex = Math.min(Math.max(position - 1, 0), rows.length);
  rows.splice(targetIndex, 0, moved);

  reorderCampaignRows(rows.map((row) => row.id));
}

// ---- Aggregates for the admin overview/statistics pages ----

export function countCampaigns(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE archived_at IS NULL").get() as {
    count: number;
  };
  return row.count;
}

export function countCampaignsByStatus(): Record<CampaignStatusDb, number> {
  const rows = db
    .prepare("SELECT status, COUNT(*) as count FROM campaigns WHERE archived_at IS NULL GROUP BY status")
    .all() as { status: CampaignStatusDb; count: number }[];
  const result: Record<CampaignStatusDb, number> = { active: 0, completed: 0, closed: 0 };
  for (const row of rows) result[row.status] = row.count;
  return result;
}

export function countCampaignsByPlatform(): { platform: string; count: number }[] {
  return toPlainArray(
    db
      .prepare(
        "SELECT platform, COUNT(*) as count FROM campaigns WHERE archived_at IS NULL GROUP BY platform ORDER BY count DESC",
      )
      .all() as { platform: string; count: number }[],
  );
}

/** Campaign creation activity bucketed by day (for the "campaigns added over time" chart) — ISO date string -> count. */
export function campaignsCreatedByDay(): { day: string; count: number }[] {
  return toPlainArray(
    db
      .prepare(
        "SELECT substr(created_at, 1, 10) as day, COUNT(*) as count FROM campaigns GROUP BY day ORDER BY day ASC",
      )
      .all() as { day: string; count: number }[],
  );
}

/**
 * Campaign completion activity bucketed by day, from the real `completed_at`
 * event (see its column comment in client.ts) — NOT a proxy like
 * `updated_at`. Campaigns that were already completed when seeded have no
 * true historical date and are correctly absent here rather than guessed.
 */
export function campaignsCompletedByDay(): { day: string; count: number }[] {
  return toPlainArray(
    db
      .prepare(
        "SELECT substr(completed_at, 1, 10) as day, COUNT(*) as count FROM campaigns WHERE completed_at IS NOT NULL GROUP BY day ORDER BY day ASC",
      )
      .all() as { day: string; count: number }[],
  );
}
