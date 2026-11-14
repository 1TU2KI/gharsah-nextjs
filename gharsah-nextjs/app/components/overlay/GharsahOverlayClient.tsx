"use client";

import { useEffect, useState } from "react";
import GharsahOverlayCard from "./GharsahOverlayCard";
import type { GharsahOverlayApiResponse } from "@/app/lib/overlay/gharsah/types";
import type { OverlayPosition } from "@/app/lib/db/settings";

const POLL_INTERVAL_MS = 20000;

const POSITION_WRAPPER_CLASS: Record<OverlayPosition, string> = {
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6",
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
};

/**
 * Gharsah Overlay's own poll engine — deliberately NOT sharing
 * OverlayClient.tsx's implementation (see the approved plan: campaign-
 * specific and Gharsah-specific rendering logic stay separated).
 *
 * Continuously visible: there's only ever ONE thing to show (the Gharsah
 * brand/logo card, never a rotating array like Campaign Overlay), and
 * `hostUrl`/`message`/`style`/`theme`/`compact`/`position` are all derived
 * purely from this page's own URL (never the database, never time-varying)
 * — so, unlike Campaign Overlay, there is nothing here that can ever
 * actually change while a given Browser Source URL stays loaded. `visible`
 * is therefore simply `true` from mount onward and never toggled again:
 * no hide/reappear cycle, no blink, no blank period, ever. Polling still
 * runs exactly as before (preserved, per the brief) and its result is
 * applied directly — there's no "safe point to adopt it" concern left to
 * manage, since a changed response can only ever mean identical content
 * re-fetched, never a mid-display swap to protect against. `style`/
 * `theme`/`compact`/`position`/`transitionDurationMs` are still read from
 * the polled data and passed straight through to GharsahOverlayCard
 * (its own `.overlay-card`/`.overlay-card--visible` CSS transition stays
 * fully wired up, exactly as Campaign Overlay's does) — simply inert in
 * practice today, since nothing ever triggers it for this overlay type.
 * `intervalMinutes` is no longer read at all: there is no more
 * appearance-to-appearance gap for it to pace (see
 * GharsahOverlayPromoSection.tsx's own comment on why its interval slider
 * was removed) — "where applicable" per the brief, it simply isn't here.
 * `previewMode` is gone for the same reason — it used to swap in a short
 * fixed demo cadence for the two live previews instead of the real
 * hide/reappear cycle; with no cycle left at all, there is nothing left for
 * it to override, so both previews now just mount this exactly like the
 * real `/overlay/gharsah` route does. `center` is unaffected and still
 * accepted, same as before.
 */
export default function GharsahOverlayClient({
  initialData,
  queryString,
  center = false,
}: {
  initialData: GharsahOverlayApiResponse;
  /** Query string used for every poll — defaults to this page's own `window.location.search`, which is what the real `/overlay/gharsah` route relies on. */
  queryString?: string;
  /** "معاينة مصغرة"-only: renders the card flex-centered instead of corner-anchored. */
  center?: boolean;
}) {
  const [displayed, setDisplayed] = useState<GharsahOverlayApiResponse>(initialData);

  // Always visible once mounted — see the doc comment above.
  const visible = true;

  // Polling loop — unchanged cadence/shape; applies each fresh response
  // directly (no deferred "safe point" needed, see the doc comment above).
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const qs = queryString ?? window.location.search;
        const res = await fetch(`/api/overlay/gharsah${qs}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as GharsahOverlayApiResponse;
        if (!cancelled) setDisplayed(data);
      } catch {
        // Network hiccup — keep showing the last-known-good data; retry next tick.
      }
    }

    const id = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [queryString]);

  return (
    <div className={center ? "fixed inset-0 flex items-center justify-center" : `fixed flex ${POSITION_WRAPPER_CLASS[displayed.settings.position]}`}>
      <GharsahOverlayCard
        visible={visible}
        hostUrl={displayed.hostUrl}
        message={displayed.message}
        style={displayed.settings.style}
        theme={displayed.settings.theme}
        compact={displayed.settings.compact}
        position={displayed.settings.position}
        transitionDurationMs={displayed.settings.transitionDurationMs}
        qrValue={displayed.qrValue}
      />
    </div>
  );
}
