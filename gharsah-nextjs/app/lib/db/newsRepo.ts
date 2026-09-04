import { randomUUID } from "node:crypto";
import { all, get, run } from "./client";
import { toPlain, toPlainArray } from "./utils";

/**
 * "الأخبار" — Gharsah's public news/updates feed. Two campaign event types
 * are written automatically (never by an admin form), the other four are
 * fully admin-authored. See the `news_items` column comment in client.ts
 * for the table shape, and the two call sites in
 * `(dashboard)/campaigns/actions.ts` for where the automatic events
 * actually get written (never from a per-request/live-sync read path — see
 * that file's own comments on why).
 */
export type NewsType = "campaign_completed" | "campaign_added" | "urgent" | "maintenance" | "dev_update" | "general";
export type NewsSource = "automatic" | "manual";
export type ManualNewsType = Exclude<NewsType, "campaign_completed" | "campaign_added">;

export const MANUAL_NEWS_TYPES: ManualNewsType[] = ["urgent", "maintenance", "dev_update", "general"];

export type NewsItemRow = {
  id: string;
  type: NewsType;
  source: NewsSource;
  title_ar: string | null;
  title_en: string | null;
  body_ar: string;
  /** Always NULL for manual posts — admin-written text is shown verbatim in both locales, never auto-translated (see the brief). Always set for automatic posts, generated from fixed bilingual templates + the campaign's own already-translated fields. */
  body_en: string | null;
  campaign_id: string | null;
  custom_url: string | null;
  published: number;
  event_key: string | null;
  created_at: string;
  updated_at: string;
};

/** Public feed: published only, newest first. `limit` is used by the homepage's "آخر التحديثات" preview (latest 3); omitted for the full `/updates` page. */
export async function listPublishedNewsItems(limit?: number): Promise<NewsItemRow[]> {
  if (limit) {
    return toPlainArray(
      await all<NewsItemRow>("SELECT * FROM news_items WHERE published = 1 ORDER BY created_at DESC LIMIT ?", [limit]),
    );
  }
  return toPlainArray(await all<NewsItemRow>("SELECT * FROM news_items WHERE published = 1 ORDER BY created_at DESC"));
}

/** Admin-only: every post regardless of published state, for the "الأخبار" dashboard section. */
export async function listAllNewsItems(): Promise<NewsItemRow[]> {
  return toPlainArray(await all<NewsItemRow>("SELECT * FROM news_items ORDER BY created_at DESC"));
}

export async function getNewsItemById(id: string): Promise<NewsItemRow | undefined> {
  const row = await get<NewsItemRow>("SELECT * FROM news_items WHERE id = ?", [id]);
  return row ? toPlain(row) : undefined;
}

export type ManualNewsInput = {
  type: ManualNewsType;
  titleAr?: string | null;
  bodyAr: string;
  customUrl?: string | null;
  published: boolean;
};

export async function createManualNewsItem(input: ManualNewsInput): Promise<NewsItemRow> {
  const now = new Date().toISOString();
  const row: NewsItemRow = {
    id: randomUUID(),
    type: input.type,
    source: "manual",
    title_ar: input.titleAr?.trim() || null,
    title_en: null,
    body_ar: input.bodyAr.trim(),
    body_en: null,
    campaign_id: null,
    custom_url: input.customUrl?.trim() || null,
    published: input.published ? 1 : 0,
    event_key: null,
    created_at: now,
    updated_at: now,
  };
  await run(
    `INSERT INTO news_items (id, type, source, title_ar, title_en, body_ar, body_en, campaign_id, custom_url, published, event_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.type,
      row.source,
      row.title_ar,
      row.title_en,
      row.body_ar,
      row.body_en,
      row.campaign_id,
      row.custom_url,
      row.published,
      row.event_key,
      row.created_at,
      row.updated_at,
    ],
  );
  return row;
}

/** Manual posts only (`AND source = 'manual'` guards against ever rewriting an automatic campaign event's meaning through this path). */
export async function updateManualNewsItem(id: string, input: ManualNewsInput): Promise<void> {
  await run(
    `UPDATE news_items SET type = ?, title_ar = ?, body_ar = ?, custom_url = ?, published = ?, updated_at = ?
     WHERE id = ? AND source = 'manual'`,
    [
      input.type,
      input.titleAr?.trim() || null,
      input.bodyAr.trim(),
      input.customUrl?.trim() || null,
      input.published ? 1 : 0,
      new Date().toISOString(),
      id,
    ],
  );
}

/** Works for BOTH manual and automatic rows — an admin can hide an automatic campaign event from the public feed without deleting the underlying record (per the brief). */
export async function setNewsItemPublished(id: string, published: boolean): Promise<void> {
  await run("UPDATE news_items SET published = ?, updated_at = ? WHERE id = ?", [published ? 1 : 0, new Date().toISOString(), id]);
}

/** Manual posts only — deleting an automatic campaign-event record isn't offered (see the brief: admin can view/hide automatic events but never change their underlying meaning); use setNewsItemPublished to hide one instead. */
export async function deleteManualNewsItem(id: string): Promise<void> {
  await run("DELETE FROM news_items WHERE id = ? AND source = 'manual'", [id]);
}

// ---- Automatic campaign events ----

type CampaignEventInput = {
  id: string;
  titleAr: string;
  titleEn: string;
  relationAr: string;
  relationEn: string;
  username: string | null;
  memorialPrefixAr: string | null;
  memorialPrefixEn: string | null;
};

function buildMemorialLine(input: CampaignEventInput, lang: "ar" | "en"): string {
  const relation = lang === "ar" ? input.relationAr : input.relationEn;
  const memorialPrefix = lang === "ar" ? input.memorialPrefixAr : input.memorialPrefixEn;
  return [relation, input.username ? `@${input.username}` : "", memorialPrefix ?? ""].filter(Boolean).join(" ");
}

async function insertAutomaticEvent(input: {
  type: NewsType;
  eventKey: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  campaignId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  // `ON CONFLICT (event_key) DO NOTHING` is the whole idempotency
  // guarantee — a second call for the same campaign+event (a retried
  // request, re-saving a form without changing anything, concurrent admin
  // tabs) silently inserts nothing rather than a duplicate post. Never
  // called from a per-request/polling path — see campaigns/actions.ts.
  await run(
    `INSERT INTO news_items (id, type, source, title_ar, title_en, body_ar, body_en, campaign_id, custom_url, published, event_key, created_at, updated_at)
     VALUES (?, ?, 'automatic', ?, ?, ?, ?, ?, NULL, 1, ?, ?, ?)
     ON CONFLICT (event_key) DO NOTHING`,
    [randomUUID(), input.type, input.titleAr, input.titleEn, input.bodyAr, input.bodyEn, input.campaignId, input.eventKey, now, now],
  );
}

/**
 * Called ONLY from `createCampaignAction` for a campaign that's genuinely
 * active/public at creation time — never for a duplicated campaign (see
 * that file), never for a campaign created directly as completed/closed.
 * `event_key = campaign_added:<id>` — see insertAutomaticEvent.
 */
export async function recordCampaignAddedEvent(campaign: CampaignEventInput): Promise<void> {
  const memorialAr = buildMemorialLine(campaign, "ar");
  const memorialEn = buildMemorialLine(campaign, "en");

  await insertAutomaticEvent({
    type: "campaign_added",
    eventKey: `campaign_added:${campaign.id}`,
    titleAr: "حالة جديدة",
    titleEn: "New Case",
    bodyAr: `تمت إضافة حالة جديدة إلى غرسة: «${campaign.titleAr}»${memorialAr ? ` — ${memorialAr}` : ""}`,
    bodyEn: `A new case has been added to Gharsah: "${campaign.titleEn}"${memorialEn ? ` — ${memorialEn}` : ""}`,
    campaignId: campaign.id,
  });
}

/**
 * Called ONLY on a genuine active→completed transition, from the two
 * admin actions that actually detect one synchronously
 * (`updateCampaignAction`'s `statusChanged` branch and
 * `quickChangeStatusAction`) — never for a campaign created already-
 * completed (no real "transition" happened) and never from the per-request
 * Ehsan live-sync path. `event_key = campaign_completed:<id>` — see
 * insertAutomaticEvent.
 */
export async function recordCampaignCompletedEvent(campaign: CampaignEventInput): Promise<void> {
  const memorialAr = buildMemorialLine(campaign, "ar");
  const memorialEn = buildMemorialLine(campaign, "en");

  await insertAutomaticEvent({
    type: "campaign_completed",
    eventKey: `campaign_completed:${campaign.id}`,
    titleAr: "اكتملت حالة",
    titleEn: "Case Completed",
    bodyAr: `بحمد الله اكتملت حملة «${campaign.titleAr}»${memorialAr ? ` — ${memorialAr}` : ""}`,
    bodyEn: `Alhamdulillah, the campaign "${campaign.titleEn}" has been completed${memorialEn ? ` — ${memorialEn}` : ""}`,
    campaignId: campaign.id,
  });
}
