"use client";

import { useEffect, useRef, useState } from "react";
import GharsahOverlayCard from "./GharsahOverlayCard";
import type { GharsahOverlayApiResponse } from "@/app/lib/overlay/gharsah/types";
import type { OverlayPosition } from "@/app/lib/db/settings";

const POLL_INTERVAL_MS = 20000;

// Fixed, short demo cadence for `previewMode` only — never used by the real
// OBS overlay. Same value as Campaign Overlay's own preview cadence
// (OverlayClient.tsx), for a consistent demo feel between the two types.
const PREVIEW_DISPLAY_DURATION_MS = 6500;

const POSITION_WRAPPER_CLASS: Record<OverlayPosition, string> = {
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6",
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
};

/**
 * Gharsah Overlay's own poll+cycle engine — deliberately NOT sharing
 * OverlayClient.tsx's implementation (see the approved plan: campaign-
 * specific and Gharsah-specific rendering logic stay separated, so the
 * working campaign engine is never touched or put at risk). Much simpler
 * than OverlayClient because there's only ever ONE thing to show (the
 * Gharsah brand card, never a rotating array) — so the loop is just:
 * show → wait `displayDurationMs` → hide (exit animation) → wait the
 * configured interval (or the short fixed `previewMode` gap) → show again.
 * Same `previewMode`/`center` contract and the same polling cadence as
 * OverlayClient, for a consistent feel between the two overlay types.
 *
 * `previewMode` never waits the real 1–60 minute interval — it loops with
 * zero gap between hide and reappear, so the public previews stay visually
 * active continuously, exactly like the campaign overlay's own previews.
 */
export default function GharsahOverlayClient({
  initialData,
  queryString,
  previewMode = false,
  center = false,
}: {
  initialData: GharsahOverlayApiResponse;
  /** Query string used for every poll — defaults to this page's own `window.location.search`, which is what the real `/overlay/gharsah` route relies on. */
  queryString?: string;
  /** Public-preview-only: ignores the real interval entirely, reappearing with zero gap so the preview stays visually active. Never set by the real `/overlay/gharsah` route. */
  previewMode?: boolean;
  /** "معاينة مصغرة"-only: renders the card flex-centered instead of corner-anchored. */
  center?: boolean;
}) {
  const latestRef = useRef<GharsahOverlayApiResponse>(initialData);
  const [displayed, setDisplayed] = useState<GharsahOverlayApiResponse>(initialData);
  const [visible, setVisible] = useState(true);

  // Polling loop — identical shape to OverlayClient's own: only ever
  // updates `latestRef`, adopted at the next safe "reappear" point below.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const qs = queryString ?? window.location.search;
        const res = await fetch(`/api/overlay/gharsah${qs}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as GharsahOverlayApiResponse;
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

  // Show/hide cycle — one self-scheduling timer chain, set up exactly once.
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    function schedule(fn: () => void, ms: number) {
      timeoutId = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    }

    function showThenWait() {
      setVisible(true);
      schedule(hide, previewMode ? PREVIEW_DISPLAY_DURATION_MS : latestRef.current.settings.displayDurationMs);
    }

    function hide() {
      setVisible(false);
      schedule(reappear, latestRef.current.settings.transitionDurationMs);
    }

    function reappear() {
      const fresh = latestRef.current;
      setDisplayed(fresh);
      const gapMs = previewMode ? 0 : fresh.settings.intervalMinutes * 60000;
      schedule(showThenWait, gapMs);
    }

    showThenWait();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // Deliberately empty deps — same reasoning as OverlayClient: this timer
    // chain must run exactly once for this overlay instance's whole
    // lifetime, never restart on a state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      />
    </div>
  );
}
