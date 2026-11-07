import type { Metadata } from "next";
import DesignPreviewClient from "./DesignPreviewClient";

export const metadata: Metadata = {
  title: "معاينة تصميم تجريبية | غرسة",
  // Experimental, not a real page — never indexed or linked from anywhere
  // on the actual site.
  robots: { index: false, follow: false },
};

/**
 * Standalone experimental design preview — `/design-preview`, requested
 * explicitly, not reachable from any nav link or other page. Deliberately
 * a sibling of `(site)`/`(admin)`/`overlay` (same reasoning as those: see
 * app/overlay/layout.tsx), so it inherits ONLY the true root layout
 * (app/layout.tsx — `<html>`/`<body>`, the Cairo font, nothing else) and
 * none of the real site's Header/Footer/AmbientBackground/LanguageProvider
 * chrome. Every bit of header/hero/card markup below is a fresh, self-
 * contained mockup built just for this page — never the real
 * Header.tsx/Hero.tsx/CampaignCard.tsx components — so nothing here can
 * accidentally change how those look on the actual site.
 *
 * No database read of any kind: DesignPreviewClient's two sample campaign
 * cards are hardcoded mock objects, not `campaigns.ts`/`campaignLiveSync`/
 * any `db/` import. This page is server-rendered (it's not forced into
 * `force-dynamic` the way the OBS overlay routes are) but there is
 * nothing dynamic in it to render differently between requests.
 */
export default function DesignPreviewPage() {
  return <DesignPreviewClient />;
}
