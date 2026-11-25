/**
 * Scoped automated sync — Ehsan campaigns only, four fields only.
 *
 * WHAT THIS DOES: on each request, after Next's cache window expires
 * (REVALIDATE_SECONDS), re-fetches a campaign's own page server-side
 * (ONE fetch covers all four fields below) and extracts:
 *
 *   - status: completed if EITHER the achievement message
 *     ("...تم الوصول للمبلغ المستهدف") is present OR the percent below is
 *     >= 100. IMPORTANT: the donate button's `disabled` class, originally
 *     thought to be a second redundant signal, was verified (2026-07-28)
 *     to be present on BOTH active and completed campaigns — Ehsan renders
 *     it disabled by default and presumably enables it client-side via JS
 *     once a donor picks an amount. It is NOT a status signal and must not
 *     be used as one.
 *     CORRECTED (2026-07-29): the achievement message alone is NOT a
 *     sufficient discriminator either — confirmed in practice that
 *     campaigns which keep collecting past their target (107%, 102%) stop
 *     rendering that banner entirely, even though they're clearly done.
 *     percent >= 100 closes that gap; it reads the same redundant
 *     data-value/aria-valuenow pair already relied on for display.
 *   - title: the `og:title` meta tag.
 *   - description: the `og:description` meta tag.
 *   - percent: the progress bar's `data-value`/`aria-valuenow` attribute.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO (see CLAUDE.md for the full deferred
 * plan): no raised amount / goal amount / donor count / image sync (all
 * confirmed too fragile or unavailable), no database, no admin panel, no
 * persistence beyond Next's own fetch cache, no support for platforms
 * other than Ehsan.
 *
 * FALLBACK RULE: if the fetch fails or a given field's markup isn't found
 * in a recognizable shape, that field falls back to the campaign's manual
 * value in `campaigns.ts`. Never guess — a missing field stays missing
 * (undefined) or reverts to the manual fallback, it is never invented.
 */

import type { Campaign, CampaignStatus } from "./campaigns";
import { getCampaignBySlug, getCampaigns } from "./campaigns";
import { extractMetaContent } from "./ehsanParse";
import { looksLikeUrl, normalizeArabic } from "./translation/arabic";
import { knownDescriptionEnglish } from "./translation/knownTexts";
import { cacheKey, getCachedTranslations, type CachedTranslation } from "./db/translationCache";

const REVALIDATE_SECONDS = 60 * 60; // re-check each campaign at most once an hour

const GOAL_REACHED_MESSAGE = "تم الوصول للمبلغ المستهدف";

const EHSAN_PLATFORM_NAME = "منصة إحسان";

type LiveFields = {
  status: CampaignStatus;
  title: string | null;
  description: string | null;
  percent: number | null;
};

function extractPercent(html: string): number | null {
  const raw = html.match(/data-value="(\d+)"/i)?.[1] ?? html.match(/aria-valuenow="(\d+)"/i)?.[1];
  if (!raw) return null;
  const value = parseInt(raw, 10);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
}

/**
 * Fetches a single Ehsan campaign page server-side and extracts all four
 * synced fields from that one response. Returns null only when the fetch
 * itself fails/errors — individual fields inside a successful response
 * are allowed to be null on their own (meaning: not found, use fallback).
 */
async function fetchLiveEhsanData(url: string): Promise<LiveFields | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GharsahLiveSync/1.0)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const percent = extractPercent(html);

    // Two independent signals, either one is sufficient: the achievement
    // banner text, OR the progress percentage reaching/exceeding 100.
    // CORRECTED (see header comment): the banner text alone is not
    // sufficient — campaigns that keep collecting past their target (107%,
    // 102% confirmed in practice) stop rendering it entirely, even though
    // they're clearly done. percent is the same redundant data-value/
    // aria-valuenow pair already verified reliable for display, so treating
    // percent >= 100 as completion closes that gap without weakening the
    // signal.
    const goalReachedByMessage = html.includes(GOAL_REACHED_MESSAGE);
    const goalReachedByPercent = percent !== null && percent >= 100;
    const status: CampaignStatus = goalReachedByMessage || goalReachedByPercent ? "completed" : "active";

    return {
      status,
      title: extractMetaContent(html, "og:title"),
      description: extractMetaContent(html, "og:description"),
      percent,
    };
  } catch (error) {
    console.warn(`[campaignLiveSync] Live fetch failed for ${url}:`, error);
    return null;
  }
}

/** Ehsan's live Arabic title/description for a campaign (same hourly-cached fetch the public pages use). null = not Ehsan, or the fetch failed. A URL is never accepted as a title. */
export async function getLiveCampaignTexts(platform: string, url: string): Promise<{ title: string | null; description: string | null } | null> {
  if (platform !== EHSAN_PLATFORM_NAME) return null;
  const live = await fetchLiveEhsanData(url);
  if (!live) return null;
  return {
    title: live.title && !looksLikeUrl(live.title) ? live.title : null,
    description: live.description && !looksLikeUrl(live.description) ? live.description : null,
  };
}

const differs = (live: string | null, stored: string | undefined) =>
  Boolean(live && normalizeArabic(live) !== normalizeArabic(stored ?? ""));

/**
 * Resolves display fields: live values from Ehsan where possible, manual
 * fallback values otherwise. Never throws.
 *
 * English and live Arabic: Ehsan is Arabic-only, so a live Arabic text that
 * differs from the saved Arabic has NO English of its own. English mode
 * then shows a translation of that live text only if one was already
 * produced and cached (by the admin's "retry translation" — never on a page
 * view); otherwise it keeps the saved English (never Arabic), and the admin
 * shows the field as needing translation. Only automatically generated (or
 * missing) English is ever replaced this way — hand-typed, reviewed and
 * hand-authored legacy English always stays.
 */
async function resolveCampaignsLiveFields(campaigns: Campaign[]): Promise<Campaign[]> {
  const lives = await Promise.all(
    campaigns.map(async (campaign) => (campaign.platform === EHSAN_PLATFORM_NAME ? fetchLiveEhsanData(campaign.url) : null)),
  );

  const keys: string[] = [];
  lives.forEach((live, i) => {
    if (!live) return;
    const campaign = campaigns[i];
    if (live.title && !looksLikeUrl(live.title) && differs(live.title, campaign.title.ar)) keys.push(cacheKey("title", live.title));
    if (live.description && differs(live.description, campaign.description.ar)) keys.push(cacheKey("description", live.description));
  });
  let cached = new Map<string, CachedTranslation>();
  try {
    cached = await getCachedTranslations(keys);
  } catch (error) {
    console.warn("[campaignLiveSync] translation cache read failed:", error instanceof Error ? error.message : error);
  }

  return campaigns.map((campaign, i) => {
    const live = lives[i];
    if (!live) return campaign;
    const replaceable = new Set(campaign.liveReplaceableEnglish ?? []);
    const liveTitle = live.title && !looksLikeUrl(live.title) ? live.title : null;

    let titleEn = campaign.title.en;
    if (liveTitle && differs(liveTitle, campaign.title.ar) && replaceable.has("title")) {
      titleEn = cached.get(cacheKey("title", liveTitle))?.english ?? titleEn;
    }
    let descriptionEn = campaign.description.en;
    if (live.description && differs(live.description, campaign.description.ar) && replaceable.has("description")) {
      descriptionEn =
        knownDescriptionEnglish(live.description) ?? cached.get(cacheKey("description", live.description))?.english ?? descriptionEn;
    }

    return {
      ...campaign,
      status: live.status,
      title: { ar: liveTitle ?? campaign.title.ar, en: titleEn },
      description: { ar: live.description ?? campaign.description.ar, en: descriptionEn },
      percent: live.percent ?? campaign.percent,
    };
  });
}

export async function resolveCampaignLiveFields(campaign: Campaign): Promise<Campaign> {
  const [resolved] = await resolveCampaignsLiveFields([campaign]);
  return resolved;
}

/** All campaigns with live fields resolved, in display order. */
export async function getCampaignsWithLiveFields(): Promise<Campaign[]> {
  return resolveCampaignsLiveFields(await getCampaigns());
}

/** Campaigns whose (live-resolved) status is "active" — filtering follows the live status, not the manual fallback. */
export async function getActiveCampaignsLive(): Promise<Campaign[]> {
  const campaigns = await getCampaignsWithLiveFields();
  return campaigns.filter((c) => c.status === "active");
}

/** Campaigns whose (live-resolved) status is "completed"/"closed". */
export async function getCompletedCampaignsLive(): Promise<Campaign[]> {
  const campaigns = await getCampaignsWithLiveFields();
  return campaigns.filter((c) => c.status === "completed" || c.status === "closed");
}

/** Single campaign by slug with live fields resolved, for the detail page. */
export async function getCampaignBySlugLive(slug: string): Promise<Campaign | undefined> {
  const campaign = await getCampaignBySlug(slug);
  if (!campaign) return undefined;
  return resolveCampaignLiveFields(campaign);
}
