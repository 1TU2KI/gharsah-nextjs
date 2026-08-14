"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/app/lib/analytics/track";

/**
 * Mounted exactly once, in `app/(site)/layout.tsx` only — never in the admin
 * layout — which is what structurally keeps Admin Dashboard page views out
 * of public analytics (rather than a filter that could be forgotten later).
 *
 * Fires one `page_view` per actual route change. The `lastTracked` ref
 * (rather than firing unconditionally on every effect run) is what prevents
 * double-counting: it survives React's development-only Strict Mode
 * mount→cleanup→mount replay (component state/refs aren't reset by that,
 * only the effect callbacks re-run), so the replay's second run sees the
 * same pathname already recorded and skips it. Query strings are
 * deliberately not tracked as part of the route — they don't change which
 * "page" this is for the per-page metrics this feeds.
 *
 * Campaign detail pages (`/cases/active/[slug]`) are deliberately skipped
 * here — they're tracked separately as `campaign_detail_view` (with a
 * campaign id attached) by CampaignDetailClient itself, so the "page views
 * by route" breakdown this feeds stays a clean, fixed set of real pages
 * (Homepage / Active list / Completed list / About / Contact / Terms)
 * instead of one row per campaign slug.
 */
const CAMPAIGN_DETAIL_ROUTE = /^\/cases\/active\/[^/]+$/;

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    if (CAMPAIGN_DETAIL_ROUTE.test(pathname)) return;
    track({ type: "page_view", route: pathname, referrer: document.referrer || null });
  }, [pathname]);

  return null;
}
