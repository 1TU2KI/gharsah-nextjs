import type { Metadata } from "next";
import OverlayPageClient from "./OverlayPageClient";
import { buildOverlayResponse, buildSubtitle } from "@/app/lib/overlay/data";
import { buildGharsahOverlayResponse } from "@/app/lib/overlay/gharsah/data";
import { getRequestOrigin } from "@/app/lib/requestOrigin";
import { getActiveCampaignsLive } from "@/app/lib/campaignLiveSync";
import type { PickableCampaign } from "@/app/lib/overlay/types";

export const metadata: Metadata = {
  title: "الأوفرلاي | غرسة",
};

/**
 * Dedicated public page for the OBS/streamer overlay tools — everything
 * that used to live inside `/near` (permanent URL, copy/preview buttons,
 * both live previews, OBS steps, the custom interval slider) now lives
 * here instead, reached via the "الأوفرلاي" nav item or the CTA at the end
 * of `/near`. `/near` itself stays focused on the "اقتربت..." campaigns
 * only. Not to be confused with `/overlay/near`/`/overlay/gharsah`
 * (sibling top-level routes, NOT under this `(site)` route group — see
 * app/overlay/layout.tsx), which are the actual transparent OBS Browser
 * Source outputs and are untouched by this page's existence.
 *
 * Now hosts TWO overlay categories (see OverlayPageClient.tsx's tab
 * switcher) — fetches the initial server-rendered frame for BOTH so
 * whichever tab a visitor lands on already has real data, never a
 * blank/loading preview:
 * - Campaign Overlay: the SAME data the OBS overlay itself broadcasts (via
 *   `buildOverlayResponse` — read-only here, untouched) plus the same
 *   `getActiveCampaignsLive()` list `resolveCampaigns.ts` uses, to populate
 *   the "اختيار حالات محددة" picker.
 * - Gharsah Overlay: `buildGharsahOverlayResponse` — no DB read, just the
 *   resolved timing defaults + the request's own host + the existing
 *   brand tagline (see gharsah/data.ts).
 */
export default async function OverlayPage() {
  const origin = await getRequestOrigin();
  const [overlayData, activeCampaigns, gharsahOverlayData] = await Promise.all([
    buildOverlayResponse(new URLSearchParams(), origin),
    getActiveCampaignsLive(),
    buildGharsahOverlayResponse(new URLSearchParams(), origin),
  ]);

  const pickableCampaigns: PickableCampaign[] = activeCampaigns.map((c) => ({
    slug: c.slug,
    title: c.title.ar,
    subtitle: buildSubtitle(c, "ar"),
  }));

  return (
    <OverlayPageClient
      overlayUrl={`${origin}/overlay/near`}
      overlayData={overlayData}
      pickableCampaigns={pickableCampaigns}
      gharsahOverlayUrl={`${origin}/overlay/gharsah`}
      gharsahOverlayData={gharsahOverlayData}
    />
  );
}
