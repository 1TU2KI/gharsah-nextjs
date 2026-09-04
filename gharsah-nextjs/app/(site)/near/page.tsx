import type { Metadata } from "next";
import NearPageClient from "./NearPageClient";
import { getAlmostThereCampaigns } from "@/app/lib/almostThere";

export const metadata: Metadata = {
  title: "اقتربت... | غرسة",
};

/**
 * Dedicated, permanently-shareable page for اقتربت... — a short, stable
 * URL (gharsah.sa/near) for the WHOLE current top-3 list, not any single
 * campaign (that's what /c/<code> is for). Same `getAlmostThereCampaigns`
 * ranking helper the homepage section uses — one source of truth, never a
 * second ranking implementation.
 *
 * Deliberately campaign-focused only — the OBS/streamer overlay tools that
 * used to live on this page moved to their own `/overlay` page (reached via
 * the nav item or the CTA at the end of NearPageClient.tsx), so this page
 * no longer fetches or renders any overlay data.
 */
export default async function NearPage() {
  const campaigns = await getAlmostThereCampaigns(3);
  return <NearPageClient campaigns={campaigns} />;
}
