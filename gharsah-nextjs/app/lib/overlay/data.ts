import { getOverlaySettings } from "@/app/lib/db/settings";
import type { Campaign } from "@/app/lib/campaigns";
import { resolveOverlayDisplay, type OverlayLang } from "./queryParams";
import { resolveOverlayCampaigns } from "./resolveCampaigns";
import type { OverlayApiResponse, OverlayCampaign } from "./types";

/**
 * Builds one overlay response — used by BOTH `/api/overlay/near` (every
 * client poll) and `/overlay/near/page.tsx` (the very first server-rendered
 * frame, so there's no blank/loading flash before the client's own polling
 * takes over). One implementation, never duplicated between the two.
 * Which campaigns are actually shown is entirely `resolveOverlayCampaigns`'s
 * job (see that file) — this function never picks campaigns itself.
 */
export async function buildOverlayResponse(searchParams: URLSearchParams, origin: string): Promise<OverlayApiResponse> {
  const defaults = await getOverlaySettings();
  const settings = resolveOverlayDisplay(searchParams, defaults);

  const campaigns = settings.enabled ? await resolveOverlayCampaigns(settings.mode, settings.selectedSlugs, settings.campaignCount) : [];

  return {
    campaigns: campaigns.map((c) => toOverlayCampaign(c, settings.lang, origin)),
    settings,
  };
}

function toOverlayCampaign(campaign: Campaign, lang: OverlayLang, origin: string): OverlayCampaign {
  const percent = campaign.percent ?? 0;
  return {
    id: campaign.id,
    title: campaign.title[lang],
    subtitle: buildSubtitle(campaign, lang),
    percent,
    remaining: Math.max(0, 100 - percent),
    // Absolute host so it reads correctly on stream regardless of what
    // displays it — correct in both production (gharsah.sa) and local dev
    // (localhost:3000) automatically, since it's derived from the
    // request's own origin rather than a hardcoded domain.
    shortUrl: campaign.shortCode ? `${new URL(origin).host}/c/${campaign.shortCode}` : new URL(origin).host,
    platformLabel: campaign.platformLabel[lang],
  };
}

/**
 * Same composition as MemorialLine (CampaignCard.tsx) — relation + optional
 * @username + optional memorial prefix — flattened to a plain string since
 * the overlay has no JSX/locale context of its own. Exported so the
 * "اختيار حالات محددة" campaign picker on `/overlay` (see that page's
 * server component) can show the exact same dedication line callers
 * already see elsewhere, instead of re-deriving its own summary text.
 */
export function buildSubtitle(campaign: Campaign, lang: OverlayLang): string {
  let text = campaign.relation[lang];
  if (campaign.username) text += ` @${campaign.username}`;
  if (campaign.memorialPrefix) text += ` ${campaign.memorialPrefix[lang]}`;
  return text;
}
