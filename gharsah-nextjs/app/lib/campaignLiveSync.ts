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

/**
 * Resolves a campaign's display fields: live values from Ehsan where
 * possible, manual fallback values otherwise. Never throws — worst case,
 * returns the campaign exactly as passed in.
 */
export async function resolveCampaignLiveFields(campaign: Campaign): Promise<Campaign> {
  if (campaign.platform !== EHSAN_PLATFORM_NAME) {
    // No verified live detector for this platform yet (currently:
    // Dawa Al-Qasba) — stay entirely on manual fallback values.
    return campaign;
  }

  const live = await fetchLiveEhsanData(campaign.url);
  if (!live) {
    // Whole fetch failed — keep every field on its manual fallback.
    return campaign;
  }

  return {
    ...campaign,
    status: live.status,
    // Ehsan's live page is Arabic-only, so only the `.ar` side is ever
    // replaced here — `.en` always stays the manually-authored translation
    // from campaigns.ts, live sync never touches it.
    title: { ar: live.title ?? campaign.title.ar, en: campaign.title.en },
    description: { ar: live.description ?? campaign.description.ar, en: campaign.description.en },
    percent: live.percent ?? campaign.percent,
  };
}

async function resolveCampaignsLiveFields(campaigns: Campaign[]): Promise<Campaign[]> {
  return Promise.all(campaigns.map(resolveCampaignLiveFields));
}

/** All campaigns with live fields resolved, in display order. */
export async function getCampaignsWithLiveFields(): Promise<Campaign[]> {
  return resolveCampaignsLiveFields(getCampaigns());
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
  const campaign = getCampaignBySlug(slug);
  if (!campaign) return undefined;
  return resolveCampaignLiveFields(campaign);
}
