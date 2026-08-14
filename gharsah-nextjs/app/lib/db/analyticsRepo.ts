import { randomUUID } from "node:crypto";
import { all, get, run } from "./client";
import { toPlainArray } from "./utils";
import { listAllCampaignRows } from "./campaignsRepo";

/**
 * The full vocabulary of tracked interactions — see app/lib/analytics/ for
 * where each one fires. Kept as one flat union (same pattern as
 * `ActivityAction` in activity.ts) so every call site is type-checked
 * against this exact list.
 */
export type AnalyticsEventType =
  | "page_view"
  | "campaign_card_click"
  | "campaign_detail_view"
  | "donation_click"
  | "campaign_link_copy"
  | "random_campaign_use"
  | "random_campaign_selected"
  | "nav_click"
  | "language_switch"
  | "theme_toggle"
  | "contact_submit"
  | "campaign_request_submit";

export async function recordAnalyticsEvent(input: {
  eventType: AnalyticsEventType;
  campaignId?: string | null;
  route?: string | null;
  visitorId: string;
  sessionId: string;
  referrerSource?: string | null;
  deviceCategory?: string | null;
  browser?: string | null;
  os?: string | null;
  metadata?: string | null;
}): Promise<void> {
  await run(
    `INSERT INTO analytics_events
      (id, event_type, campaign_id, route, visitor_id, session_id, referrer_source, device_category, browser, os, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      input.eventType,
      input.campaignId ?? null,
      input.route ?? null,
      input.visitorId,
      input.sessionId,
      input.referrerSource ?? null,
      input.deviceCategory ?? null,
      input.browser ?? null,
      input.os ?? null,
      input.metadata ?? null,
      new Date().toISOString(),
    ],
  );
}

/** Simple all-time total for one event type — used for the Overview page's single-number stat cards (e.g. total donation-button clicks). */
export async function countEventsByType(eventType: AnalyticsEventType): Promise<number> {
  const row = await get<{ c: number }>(`SELECT COUNT(*)::int as c FROM analytics_events WHERE event_type = ?`, [eventType]);
  return row?.c ?? 0;
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function isoTodayStartUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export type VisitTotals = {
  totalVisits: number;
  uniqueVisitors: number;
  visitsToday: number;
  visitsLast7d: number;
  visitsLast30d: number;
  uniqueToday: number;
  uniqueLast7d: number;
  uniqueLast30d: number;
};

/**
 * "Visit" = a distinct session (the 30-minute-sliding `gh_sid` cookie — see
 * trackAction.ts), so one visitor browsing several pages back-to-back counts
 * once. "Unique visitor" = a distinct long-lived `gh_vid` cookie, so the
 * same person returning across days is still one visitor overall but counts
 * toward each day/week/month window they showed up in. Both are computed
 * from `page_view` events specifically (not every event type), since a
 * "visit" should mean an actual page load.
 */
export async function getVisitTotals(): Promise<VisitTotals> {
  const today = isoTodayStartUtc();
  const d7 = isoDaysAgo(7);
  const d30 = isoDaysAgo(30);

  const countDistinct = async (column: "session_id" | "visitor_id", sinceIso?: string) => {
    const sql = sinceIso
      ? `SELECT COUNT(DISTINCT ${column})::int as c FROM analytics_events WHERE event_type = 'page_view' AND created_at >= ?`
      : `SELECT COUNT(DISTINCT ${column})::int as c FROM analytics_events WHERE event_type = 'page_view'`;
    const row = await get<{ c: number }>(sql, sinceIso ? [sinceIso] : []);
    return row?.c ?? 0;
  };

  return {
    totalVisits: await countDistinct("session_id"),
    uniqueVisitors: await countDistinct("visitor_id"),
    visitsToday: await countDistinct("session_id", today),
    visitsLast7d: await countDistinct("session_id", d7),
    visitsLast30d: await countDistinct("session_id", d30),
    uniqueToday: await countDistinct("visitor_id", today),
    uniqueLast7d: await countDistinct("visitor_id", d7),
    uniqueLast30d: await countDistinct("visitor_id", d30),
  };
}

/** Page views (raw load count, not deduplicated) grouped by route — excludes campaign detail pages, which are tracked separately via `campaign_detail_view` (see campaignEngagement) so they can carry a campaign id. */
export async function pageViewsByRoute(): Promise<{ route: string; count: number }[]> {
  return toPlainArray(
    await all<{ route: string; count: number }>(
      `SELECT route, COUNT(*)::int as count FROM analytics_events
       WHERE event_type = 'page_view' AND route IS NOT NULL
       GROUP BY route ORDER BY count DESC`,
    ),
  );
}

export type CampaignEngagementRow = {
  campaignId: string;
  titleAr: string;
  slug: string;
  status: string;
  views: number;
  cardClicks: number;
  donationClicks: number;
  linkCopies: number;
  randomSelected: number;
  /** donationClicks / views, 0 when there are no views yet — format as a percentage at display time. */
  ctr: number;
};

/**
 * One row per CURRENT campaign (including ones with zero events, per "start
 * at zero, never fabricate") — never a row for a deleted campaign's
 * orphaned events, since there's nothing to link them to for admin display.
 */
export async function campaignEngagement(): Promise<CampaignEngagementRow[]> {
  const rows = await all<{ campaign_id: string; event_type: string; count: number }>(
    `SELECT campaign_id, event_type, COUNT(*)::int as count
     FROM analytics_events
     WHERE campaign_id IS NOT NULL
       AND event_type IN ('campaign_detail_view','campaign_card_click','donation_click','campaign_link_copy','random_campaign_selected')
     GROUP BY campaign_id, event_type`,
  );

  const byCampaign = new Map<string, Partial<Record<AnalyticsEventType, number>>>();
  for (const r of rows) {
    const entry = byCampaign.get(r.campaign_id) ?? {};
    entry[r.event_type as AnalyticsEventType] = r.count;
    byCampaign.set(r.campaign_id, entry);
  }

  const campaigns = await listAllCampaignRows();
  return campaigns.map((c) => {
    const counts = byCampaign.get(c.id) ?? {};
    const views = counts.campaign_detail_view ?? 0;
    const donationClicks = counts.donation_click ?? 0;
    return {
      campaignId: c.id,
      titleAr: c.title_ar,
      slug: c.slug,
      status: c.status,
      views,
      cardClicks: counts.campaign_card_click ?? 0,
      donationClicks,
      linkCopies: counts.campaign_link_copy ?? 0,
      randomSelected: counts.random_campaign_selected ?? 0,
      ctr: views > 0 ? donationClicks / views : 0,
    };
  });
}

/** e.g. "activeCases" -> count — see the fixed tag vocabulary Header.tsx sends as `metadata`. */
export async function navClicksBreakdown(): Promise<{ key: string; count: number }[]> {
  return toPlainArray(
    await all<{ key: string; count: number }>(
      `SELECT metadata as key, COUNT(*)::int as count FROM analytics_events
       WHERE event_type = 'nav_click' AND metadata IS NOT NULL
       GROUP BY metadata ORDER BY count DESC`,
    ),
  );
}

export async function toggleUsageCounts(): Promise<{ languageSwitch: number; themeToggle: number }> {
  const langRow = await get<{ c: number }>(`SELECT COUNT(*)::int as c FROM analytics_events WHERE event_type = 'language_switch'`);
  const themeRow = await get<{ c: number }>(`SELECT COUNT(*)::int as c FROM analytics_events WHERE event_type = 'theme_toggle'`);
  return { languageSwitch: langRow?.c ?? 0, themeToggle: themeRow?.c ?? 0 };
}

/**
 * Whether a `random_campaign_selected` pick was "followed" by that same
 * visitor clicking that same campaign's donation button shortly after —
 * computed by correlating the two event types on (campaign_id, visitor_id)
 * within a 30-minute window, entirely in JS rather than SQL date arithmetic
 * (this codebase's other day-bucketing already relies on plain ISO-string
 * comparison, not SQL date functions — matching that rather than
 * introducing a new pattern). Volumes here are small enough for this project
 * that the O(n·m) scan is instant.
 */
async function randomToDonationFollowThrough(): Promise<{ selected: number; followedToDonation: number }> {
  const WINDOW_MS = 30 * 60 * 1000;
  const selected = await all<{ campaign_id: string; visitor_id: string; created_at: string }>(
    `SELECT campaign_id, visitor_id, created_at FROM analytics_events WHERE event_type = 'random_campaign_selected'`,
  );
  const donations = await all<{ campaign_id: string; visitor_id: string; created_at: string }>(
    `SELECT campaign_id, visitor_id, created_at FROM analytics_events WHERE event_type = 'donation_click'`,
  );

  let followed = 0;
  for (const s of selected) {
    const sTime = new Date(s.created_at).getTime();
    const match = donations.some((d) => {
      if (d.campaign_id !== s.campaign_id || d.visitor_id !== s.visitor_id) return false;
      const delta = new Date(d.created_at).getTime() - sTime;
      return delta >= 0 && delta <= WINDOW_MS;
    });
    if (match) followed++;
  }
  return { selected: selected.length, followedToDonation: followed };
}

export type RandomFeatureStats = {
  uses: number;
  selectedCount: number;
  followedToDonation: number;
  topCampaigns: { campaignId: string; titleAr: string; count: number }[];
};

export async function randomFeatureStats(): Promise<RandomFeatureStats> {
  const usesRow = await get<{ c: number }>(`SELECT COUNT(*)::int as c FROM analytics_events WHERE event_type = 'random_campaign_use'`);

  const topRows = await all<{ campaign_id: string; count: number }>(
    `SELECT campaign_id, COUNT(*)::int as count FROM analytics_events
     WHERE event_type = 'random_campaign_selected'
     GROUP BY campaign_id ORDER BY count DESC LIMIT 5`,
  );

  const campaigns = await listAllCampaignRows();
  const titleById = new Map(campaigns.map((c) => [c.id, c.title_ar]));
  const topCampaigns = topRows.map((r) => ({
    campaignId: r.campaign_id,
    titleAr: titleById.get(r.campaign_id) ?? "(حملة محذوفة)",
    count: r.count,
  }));

  const { selected, followedToDonation } = await randomToDonationFollowThrough();

  return { uses: usesRow?.c ?? 0, selectedCount: selected, followedToDonation, topCampaigns };
}

/** Distinct-session breakdowns (one visit counted once, not once per click) — computed from `page_view` events, the one event every real visit always includes. */
export async function deviceBreakdown(): Promise<{ label: string; count: number }[]> {
  return toPlainArray(
    await all<{ label: string; count: number }>(
      `SELECT device_category as label, COUNT(DISTINCT session_id)::int as count FROM analytics_events
       WHERE event_type = 'page_view' AND device_category IS NOT NULL
       GROUP BY device_category ORDER BY count DESC`,
    ),
  );
}

export async function browserBreakdown(): Promise<{ label: string; count: number }[]> {
  return toPlainArray(
    await all<{ label: string; count: number }>(
      `SELECT browser as label, COUNT(DISTINCT session_id)::int as count FROM analytics_events
       WHERE event_type = 'page_view' AND browser IS NOT NULL
       GROUP BY browser ORDER BY count DESC`,
    ),
  );
}

export async function osBreakdown(): Promise<{ label: string; count: number }[]> {
  return toPlainArray(
    await all<{ label: string; count: number }>(
      `SELECT os as label, COUNT(DISTINCT session_id)::int as count FROM analytics_events
       WHERE event_type = 'page_view' AND os IS NOT NULL
       GROUP BY os ORDER BY count DESC`,
    ),
  );
}

export async function referrerBreakdown(): Promise<{ source: string; count: number }[]> {
  return toPlainArray(
    await all<{ source: string; count: number }>(
      `SELECT referrer_source as source, COUNT(DISTINCT session_id)::int as count FROM analytics_events
       WHERE event_type = 'page_view' AND referrer_source IS NOT NULL
       GROUP BY referrer_source ORDER BY count DESC`,
    ),
  );
}

/** Zero-day-safe: `bucketByMonth`-style helpers in chartUtils.ts fill in the gaps this leaves for a fixed-length range — this only returns days that actually had at least one event. */
export async function eventCountsByDay(eventTypes: AnalyticsEventType[], sinceIso: string | null): Promise<{ day: string; count: number }[]> {
  const placeholders = eventTypes.map(() => "?").join(",");
  const params: string[] = [...eventTypes];
  let sql = `SELECT substr(created_at,1,10) as day, COUNT(*)::int as count FROM analytics_events WHERE event_type IN (${placeholders})`;
  if (sinceIso) {
    sql += " AND created_at >= ?";
    params.push(sinceIso);
  }
  sql += " GROUP BY day ORDER BY day ASC";
  return toPlainArray(await all<{ day: string; count: number }>(sql, params));
}

/** Same as `eventCountsByDay` but deduplicated to one count per session per day — the correct definition for a "visits over time" chart (see getVisitTotals's doc comment). */
export async function visitsByDay(sinceIso: string | null): Promise<{ day: string; count: number }[]> {
  const params: string[] = [];
  let sql = `SELECT substr(created_at,1,10) as day, COUNT(DISTINCT session_id)::int as count FROM analytics_events WHERE event_type = 'page_view'`;
  if (sinceIso) {
    sql += " AND created_at >= ?";
    params.push(sinceIso);
  }
  sql += " GROUP BY day ORDER BY day ASC";
  return toPlainArray(await all<{ day: string; count: number }>(sql, params));
}

/** Distinct visitor_id (not session_id) per day — for the "unique visitors" drilldown's own time series, separate from the session-based "visits" one above. */
export async function uniqueVisitorsByDay(sinceIso: string | null): Promise<{ day: string; count: number }[]> {
  const params: string[] = [];
  let sql = `SELECT substr(created_at,1,10) as day, COUNT(DISTINCT visitor_id)::int as count FROM analytics_events WHERE event_type = 'page_view'`;
  if (sinceIso) {
    sql += " AND created_at >= ?";
    params.push(sinceIso);
  }
  sql += " GROUP BY day ORDER BY day ASC";
  return toPlainArray(await all<{ day: string; count: number }>(sql, params));
}

/**
 * "New" = the day a visitor_id's very first-ever page_view happened;
 * "returning" = any later day the same visitor_id shows up again. Computed
 * entirely in JS from the two small aggregate queries below rather than one
 * complex SQL statement — this project's event volume makes that trivial,
 * and it keeps the logic readable. This is real, derived data (never
 * invented): a brand-new site with no repeat visitors yet will correctly
 * show `returningCount: 0` for every day.
 */
export async function newVsReturningVisitorsByDay(
  sinceIso: string | null,
): Promise<{ day: string; newCount: number; returningCount: number }[]> {
  const firstSeenRows = await all<{ visitor_id: string; first_day: string }>(
    `SELECT visitor_id, MIN(substr(created_at,1,10)) as first_day FROM analytics_events
     WHERE event_type = 'page_view' GROUP BY visitor_id`,
  );
  const firstSeenByVisitor = new Map(firstSeenRows.map((r) => [r.visitor_id, r.first_day]));

  const params: string[] = [];
  let sql = `SELECT DISTINCT substr(created_at,1,10) as day, visitor_id FROM analytics_events WHERE event_type = 'page_view'`;
  if (sinceIso) {
    sql += " AND created_at >= ?";
    params.push(sinceIso);
  }
  const dayVisitorRows = await all<{ day: string; visitor_id: string }>(sql, params);

  const byDay = new Map<string, { newCount: number; returningCount: number }>();
  for (const row of dayVisitorRows) {
    const entry = byDay.get(row.day) ?? { newCount: 0, returningCount: 0 };
    if (firstSeenByVisitor.get(row.visitor_id) === row.day) entry.newCount++;
    else entry.returningCount++;
    byDay.set(row.day, entry);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, counts]) => ({ day, ...counts }));
}
