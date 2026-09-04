"use client";

import { useEffect, useState } from "react";
import GharsahLoader from "./GharsahLoader";
import GharsahLoaderDots from "./GharsahLoaderDots";

// A short hold so the loader never flashes away on the very next tick, even
// when the page is already `document.readyState === "complete"` by the time
// this client component hydrates (common on a fast/dev load) — not a wait
// for any construction animation to finish (there isn't one anymore: the
// logo is fully static, see GharsahLoader), just enough for the loader's
// presence to register as intentional. One flat value for everyone — with
// no animation left to protect, reduced motion doesn't need a shorter case
// of its own (the dots are simply hidden outright under
// `prefers-reduced-motion`, see globals.css).
const MIN_VISIBLE_MS = 400;

/**
 * Covers the very first paint of a hard page load (before hydration), which
 * `app/loading.tsx` cannot do since Suspense fallbacks only activate for
 * async Server Component data-fetching, not the base HTML delivery itself.
 * Mounted once in the root layout, so it only appears on a real navigation
 * to the site (reload/first visit), never on client-side route changes —
 * those are handled by the per-route `loading.tsx` files instead (see
 * GharsahLoadingState, built on the same GharsahLoader/GharsahLoaderDots).
 *
 * Hides once BOTH are true: the real `window.load` signal has fired (all
 * resources fetched) AND MIN_VISIBLE_MS has passed — never a fixed fake
 * timer on its own, and never an artificial wait tacked on after the page
 * is already ready and the minimum has elapsed.
 */
export default function InitialLoadOverlay() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    let removeTimeout: ReturnType<typeof setTimeout>;
    let pageReady = false;
    let minDurationElapsed = false;
    let revealed = false;

    function revealIfReady() {
      if (revealed || !pageReady || !minDurationElapsed) return;
      revealed = true;
      setVisible(false);
      removeTimeout = setTimeout(() => setMounted(false), 500);
    }

    function markPageReady() {
      pageReady = true;
      revealIfReady();
    }

    const minDurationTimeout = setTimeout(() => {
      minDurationElapsed = true;
      revealIfReady();
    }, MIN_VISIBLE_MS);

    if (document.readyState === "complete") {
      markPageReady();
    } else {
      window.addEventListener("load", markPageReady, { once: true });
    }

    return () => {
      window.removeEventListener("load", markPageReady);
      clearTimeout(removeTimeout);
      clearTimeout(minDurationTimeout);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      // `.gharsah-atmosphere-bg` (globals.css), not a flat `bg-background`
      // swatch — this cover fades OUT via opacity to reveal the real page,
      // whose own body already paints the same flowing gradient from the
      // very first byte (pure CSS, no JS/hydration wait). A flat color
      // fading out over a multi-stop gradient necessarily passes through a
      // visible mismatch moment; the identical recipe here means the fade
      // reveals nothing but real content mounting in, no seam.
      className={`gharsah-atmosphere-bg fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 transition-opacity duration-500 ease-out ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <GharsahLoader size={112} />
      <GharsahLoaderDots />
    </div>
  );
}
