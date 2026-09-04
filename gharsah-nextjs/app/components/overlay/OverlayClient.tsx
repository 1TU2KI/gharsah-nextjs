"use client";

import { useEffect, useRef, useState } from "react";
import OverlayCard from "./OverlayCard";
import type { OverlayApiResponse, OverlayCampaign } from "@/app/lib/overlay/types";
import type { ResolvedOverlayDisplay } from "@/app/lib/overlay/queryParams";

const POLL_INTERVAL_MS = 20000;

// Fixed, short demo cadence for `previewMode` only (see below) — never used
// by the real OBS overlay. ~6.5s sits in the middle of the "5-8 seconds"
// the public preview is meant to show each campaign for.
const PREVIEW_DISPLAY_DURATION_MS = 6500;

const POSITION_WRAPPER_CLASS: Record<ResolvedOverlayDisplay["position"], string> = {
  // Physical corners, deliberately NOT the project's usual RTL-aware
  // start/end utilities — a streamer picking "top-right" means the actual
  // top-right of the 1920x1080 canvas, regardless of the overlay's own
  // Arabic/RTL content inside the card.
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6",
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
};

/**
 * Owns two independent loops for as long as this overlay page stays open in
 * OBS:
 *
 * 1. Polling — fetches `/api/overlay/near` with the query string to use
 *    (see `queryString` below) every ~20s. The result only ever lands in
 *    `latestRef`, never applied to what's on screen immediately — see (2).
 *    A failed fetch just leaves `latestRef` untouched (last-known-good data
 *    keeps being shown) and tries again next tick — never a visible error
 *    on stream.
 * 2. The display cycle — show a campaign, wait `displayDurationMs`, exit
 *    (`transitionDurationMs`), advance, enter, repeat. The gap before the
 *    next campaign appears is normally 0 between campaigns within a cycle
 *    and `restDurationMs` only after the last one (existing default
 *    behavior, untouched) — UNLESS `settings.intervalMinutes` is set (only
 *    ever via a streamer's own `?interval=` override, never an admin
 *    default — see queryParams.ts), in which case that same interval
 *    applies uniformly between every campaign, wrap included, replacing
 *    both. The latest polled data is only adopted at a cycle-wrap boundary
 *    (a genuinely safe moment — nothing is on screen) or immediately if the
 *    campaign currently showing has actually dropped out of the fresh data
 *    entirely (no longer worth protecting) — never an ordinary mid-display
 *    swap.
 *
 * Renders nothing if the overlay is administratively disabled, the branded
 * static fallback (no cycling, periodically re-checking for real data) if
 * there are simply no qualifying campaigns right now.
 *
 * `previewMode` (see prop doc below) is the one deliberate exception to all
 * of the above: it's for the public `/near` page's demo previews only,
 * which must stay visually active and keep looping regardless of whatever
 * `displayDurationMs`/`restDurationMs`/`intervalMinutes` the fetched
 * settings actually contain — real campaign data and real visual settings
 * (theme/position/progress/etc.) still come through untouched; only the
 * PACING is overridden. The real OBS overlay never passes this prop, so its
 * timing is completely unaffected.
 */
export default function OverlayClient({
  initialData,
  queryString,
  previewMode = false,
  center = false,
}: {
  initialData: OverlayApiResponse;
  /**
   * Query string (e.g. `"?interval=5"`) used for every poll — defaults to
   * this page's own `window.location.search`, which is what the real
   * `/overlay/near` route relies on (unchanged).
   */
  queryString?: string;
  /**
   * Public-preview-only: ignores `displayDurationMs`, `restDurationMs`, and
   * `intervalMinutes` entirely, showing each campaign for a fixed ~6.5s with
   * zero gap before the next — a short, continuous demo loop that never
   * enters the real overlay's long rest/interval period. Never set by the
   * real `/overlay/near` route.
   */
  previewMode?: boolean;
  /**
   * "معاينة مصغرة"-only: renders the card flex-centered in the middle of
   * the canvas instead of corner-anchored via `position`/`POSITION_WRAPPER_CLASS`
   * below. Purely a wrapper-layout swap — `OverlayCard` itself, its size,
   * and everything it displays are completely unaffected. Never set by the
   * real `/overlay/near` route or "معاينة كبيرة", so their corner-anchored
   * positioning (an accurate simulation of the real OBS canvas) is
   * untouched.
   */
  center?: boolean;
}) {
  const latestRef = useRef<OverlayApiResponse>(initialData);

  // What's actually on screen — only ever changed by the cycle effect
  // below, at one of the safe points described above.
  const [displayedCampaigns, setDisplayedCampaigns] = useState<OverlayCampaign[]>(initialData.campaigns);
  const [displayedSettings, setDisplayedSettings] = useState<ResolvedOverlayDisplay>(initialData.settings);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Polling loop — restarts if `queryString` itself changes (e.g. the
  // interval slider moves), which only ever affects what the NEXT poll
  // fetches; the cycle effect below picks up the result from `latestRef` on
  // its own schedule, exactly like an admin setting change would.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const qs = queryString ?? window.location.search;
        const res = await fetch(`/api/overlay/near${qs}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as OverlayApiResponse;
        if (!cancelled) latestRef.current = data;
      } catch {
        // Network hiccup — latestRef keeps its last-known-good value; retry next tick.
      }
    }

    const id = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [queryString]);

  // Display cycle — one self-scheduling timer chain, set up exactly once.
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let campaigns = initialData.campaigns;
    let settings = initialData.settings;
    let i = 0;

    function schedule(fn: () => void, ms: number) {
      timeoutId = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    }

    function showCurrentThenWait() {
      setVisible(true);
      if (campaigns.length === 0) {
        // Nothing to cycle right now (disabled, or no qualifying campaigns)
        // — periodically re-check the latest poll instead of freezing
        // forever, so re-enabling the overlay or a campaign newly
        // qualifying takes effect without reloading the Browser Source.
        schedule(adoptLatestAndShow, POLL_INTERVAL_MS);
        return;
      }
      schedule(afterDisplay, previewMode ? PREVIEW_DISPLAY_DURATION_MS : settings.displayDurationMs);
    }

    function afterDisplay() {
      const shownId = campaigns[i]?.id;
      const fresh = latestRef.current;
      const stillQualifies = !shownId || fresh.campaigns.some((c) => c.id === shownId);
      exit(stillQualifies ? advance : adoptLatestAndShow);
    }

    function exit(next: () => void) {
      setVisible(false);
      schedule(next, settings.transitionDurationMs);
    }

    function advance() {
      const wrapping = i + 1 >= campaigns.length;
      let gapMs: number;
      if (previewMode) {
        // Demo mode: never the long rest/interval period — loop straight
        // into the next campaign (or back to the first) with no gap at all,
        // so the preview stays visually active continuously.
        gapMs = 0;
      } else {
        // `settings.intervalMinutes` is either a streamer's own `?interval=`
        // override or, when a URL has none at all, Gharsah's own
        // recommended 25-minute default (see queryParams.ts +
        // overlay/defaults.ts) — resolveOverlayDisplay() never actually
        // leaves it `null` anymore, so this now IS the normal path for
        // every URL, not just an opt-in override. It replaces BOTH the old
        // "no gap within a cycle" and "restDurationMs gap after the cycle"
        // behavior with one uniform wait between every single campaign,
        // wrap included, exactly as described in the "إعداد الأوفرلاي"
        // slider's own spec. The `restDurationMs` fallback below only still
        // matters if `intervalMinutes` were ever missing some other way —
        // never through the normal resolver.
        const intervalMs = settings.intervalMinutes ? settings.intervalMinutes * 60000 : null;
        gapMs = intervalMs ?? (wrapping ? settings.restDurationMs : 0);
      }

      schedule(() => {
        if (wrapping) {
          adoptLatestAndShow();
        } else {
          i += 1;
          setIndex(i);
          showCurrentThenWait();
        }
      }, gapMs);
    }

    function adoptLatestAndShow() {
      const fresh = latestRef.current;
      campaigns = fresh.campaigns;
      settings = fresh.settings;
      i = 0;
      setDisplayedCampaigns(campaigns);
      setDisplayedSettings(settings);
      setIndex(0);
      showCurrentThenWait();
    }

    showCurrentThenWait();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // Deliberately empty deps: this timer chain owns its own local
    // campaigns/settings/index state and reads latestRef for fresh data —
    // it must run exactly once for this overlay instance's whole lifetime,
    // never restart on a state change (that would reset cycle position on
    // every single poll).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!displayedSettings.enabled) return null;

  const current = displayedCampaigns[index] ?? null;

  return (
    <div className={center ? "fixed inset-0 flex items-center justify-center" : `fixed flex ${POSITION_WRAPPER_CLASS[displayedSettings.position]}`}>
      <OverlayCard
        campaign={current}
        visible={visible}
        showProgress={displayedSettings.showProgress}
        showRemaining={displayedSettings.showRemaining}
        showShortLink={displayedSettings.showShortLink}
        showLogo={displayedSettings.showLogo}
        theme={displayedSettings.theme}
        compact={displayedSettings.compact}
        titleText={displayedSettings.titleText}
        position={displayedSettings.position}
        transitionDurationMs={displayedSettings.transitionDurationMs}
        lang={displayedSettings.lang}
      />
    </div>
  );
}
