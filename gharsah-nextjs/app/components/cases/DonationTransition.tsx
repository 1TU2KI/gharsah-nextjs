"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import { track } from "../../lib/analytics/track";

/**
 * Full choreography (overlay fade-in + the logo growing from seed to
 * complete bloom, then crossfading into the real /logo.png — see
 * `.donation-logo-*`/`.donation-transition-*` in globals.css) finishes at
 * ~1.14s; this is set just past that so the same-tab redirect never cuts
 * the animation off mid-motion, while still landing inside the
 * "~1–1.3s, no extra pause" target. Reduced motion collapses the whole
 * thing to one quick 0.6s fade of the finished logo (see globals.css), so
 * it gets a shorter pause matched to that instead of the full-motion one.
 */
const TRANSITION_MS = 1200;
const REDUCED_MOTION_TRANSITION_MS = 650;

type Phase = "idle" | "transitioning";

/**
 * The exact same five petal paths as GharsahLoader (ui/GharsahLoader.tsx) —
 * a hand-derived approximation of the real Gharsah lotus mark, fanned from
 * one base point. Reusing the identical shapes (not a new illustration) is
 * the point: this should read as "the Gharsah logo itself growing," and
 * its final frame crossfades into the real /logo.png, exactly like that
 * component's own idle-loading animation does — just compressed to this
 * transition's own faster timing (see the doc comment on the CSS above).
 */
const PETALS = [
  { key: "bottom-left", className: "donation-logo-petal--bottom-left", d: "M100,170 Q82.46,108.06 29.88,135.84 Q40.4,194.36 100,170 Z" },
  { key: "bottom-right", className: "donation-logo-petal--bottom-right", d: "M100,170 Q117.54,108.06 170.12,135.84 Q159.6,194.36 100,170 Z" },
  { key: "mid-left", className: "donation-logo-petal--mid-left", d: "M100,170 Q101.64,111.6 46.9,91.25 Q45.26,149.6 100,170 Z" },
  { key: "mid-right", className: "donation-logo-petal--mid-right", d: "M100,170 Q98.36,111.6 153.1,91.25 Q154.74,149.6 100,170 Z" },
  { key: "top", className: "donation-logo-petal--top", d: "M100,170 Q126,111.5 100,40 Q74,111.5 100,170 Z" },
];

/**
 * ONE focal visual, deliberately large and alone (no other animated
 * elements competing with it): a seed pops in, the stem draws itself
 * upward, then the five petals unfold one after another into the complete
 * lotus mark, which crossfades into the real logo artwork the instant it's
 * done — see the `.donation-logo-*` rules in globals.css for the timing.
 * `prefers-reduced-motion` swaps the whole growth to a single short fade
 * straight to the finished logo (handled entirely in CSS, no JS branching
 * needed here).
 */
function LogoGrowthVisual() {
  return (
    <div className="relative h-52 w-52 sm:h-64 sm:w-64" role="status" aria-hidden="true">
      {/* Soft static glow behind the mark for depth — not animated (the
          whole transition is too short for a pulse to read as anything
          but a flicker), and deliberately faint. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 scale-110 rounded-full bg-primary/25 blur-2xl"
      />

      <svg className="donation-logo-svg absolute inset-0 h-full w-full" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <linearGradient id="donation-logo-flower" x1="100" y1="200" x2="100" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--primary-dark)" />
            <stop offset="55%" stopColor="var(--turquoise-soft)" />
            <stop offset="100%" stopColor="#0c787e" />
          </linearGradient>
        </defs>

        <line className="donation-logo-stem" x1="100" y1="190" x2="100" y2="170" strokeWidth="5" strokeLinecap="round" />
        <circle className="donation-logo-seed" cx="100" cy="190" r="5" />

        {PETALS.map((petal) => (
          <path
            key={petal.key}
            d={petal.d}
            fill="url(#donation-logo-flower)"
            fillOpacity={0.92}
            className={`donation-logo-petal ${petal.className}`}
          />
        ))}
      </svg>

      <Image
        src="/logo.png"
        alt=""
        aria-hidden="true"
        width={256}
        height={256}
        className="donation-logo-image absolute inset-0 h-full w-full object-contain"
        priority
      />
    </div>
  );
}

/**
 * Wraps an existing donate link with a brief, full-screen "widen your
 * intention" interstitial before actually leaving Gharsah for the official
 * donation platform — then navigates there in the SAME tab. The donate link
 * itself is passed in via the render-prop `children`, so its exact
 * classes/label/position never change here; this component only supplies
 * the click handler and renders the overlay through a portal. Reusable
 * across any campaign card/page that needs the same behavior, so the
 * transition/timing/reduced-motion logic isn't duplicated per place.
 *
 * The wrapped link keeps its real `href`/`target="_blank"`/`rel="noopener
 * noreferrer"` exactly as before — a modified click (ctrl/cmd/shift/middle
 * click) is deliberately never intercepted, so it still behaves like a
 * normal link for anyone who wants to skip the pause, and the link keeps
 * working even if this component's JS fails entirely.
 *
 * Deliberately NOT `window.open()`: this is a same-tab redirect
 * (`window.location.assign`), so there's no popup to be blocked and no
 * fallback UI is needed — once the timer fires, the browser is already
 * navigating away.
 *
 * Rendered via a portal to `document.body` rather than in place: donate
 * buttons live inside cards that use `backdrop-blur`, which (per the CSS
 * spec) makes that card a containing block for any `position: fixed`
 * descendant — without the portal, the overlay would be clipped to the
 * card's box instead of covering the full viewport.
 */
export default function DonationTransition({
  url,
  campaignId,
  metadata,
  children,
}: {
  url: string;
  /** Attaches this click to a campaign in the analytics data — omit for any future non-campaign donate link this component might wrap. */
  campaignId?: string;
  /** Optional short plain-text tag forwarded to the `donation_click` event — e.g. "short_link" when this donate click follows a gharsah.sa/c/<code> visit (see CampaignDetailClient.tsx), so the admin's short-link stats can attribute it. Omitted everywhere else, unchanged from before this prop existed. */
  metadata?: string;
  children: (onDonateClick: (e: React.MouseEvent<HTMLAnchorElement>) => void) => React.ReactNode;
}) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>("idle");
  // The pending timer's id is kept in state rather than a ref: the donate
  // click handler below is handed to `children` (a render prop) and called
  // later as an event handler, but React's stricter ref rules flag *any*
  // function that touches `ref.current` being passed through an opaque call
  // during render — even one only ever invoked afterward — since it can't
  // prove the callee won't invoke it synchronously. State sidesteps that
  // entirely and is perfectly fine to read/write from an event handler.
  const [timeoutId, setTimeoutId] = useState<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(timeoutId);
  }, [timeoutId]);

  // Lock page scroll for exactly as long as the full-screen transition is
  // showing, and always restore the previous value afterward — including if
  // this component unmounts mid-transition.
  useEffect(() => {
    if (phase !== "transitioning") return;

    const { style } = document.documentElement;
    const previousOverflow = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = previousOverflow;
    };
  }, [phase]);

  const handleDonateClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        // Let the browser handle modified clicks exactly like a normal link.
        return;
      }

      // Already mid-transition — never start a second timer or navigate
      // twice from one click (or from a second card's button while the
      // full-screen overlay is covering it).
      if (phase !== "idle") {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      setPhase("transitioning");

      // Fired the instant the real click is committed to (not on every
      // render) — non-blocking, so it can never delay the transition timer
      // scheduled right below.
      track({ type: "donation_click", campaignId, metadata });

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const duration = prefersReducedMotion ? REDUCED_MOTION_TRANSITION_MS : TRANSITION_MS;

      setTimeoutId(
        window.setTimeout(() => {
          // Same-tab navigation, not window.open — the instant the
          // animation finishes, Gharsah is left behind for the official
          // campaign page. No extra pause, nothing to reset afterward.
          window.location.assign(url);
        }, duration),
      );
    },
    [phase, url, campaignId, metadata],
  );

  const overlay = phase === "transitioning" && (
    <div
      role="status"
      aria-live="polite"
      className="donation-transition-overlay fixed inset-0 z-[999] flex h-screen w-screen items-center justify-center bg-background/95 backdrop-blur-md"
    >
      {/* Ambient tint reusing the site's own green/turquoise flowing
          gradient variables — not a new color system. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60vw 60vh at 50% 30%, var(--flow-2), transparent 70%), radial-gradient(50vw 50vh at 80% 80%, var(--flow-3), transparent 70%)",
        }}
      />

      {/* The growing logo is the one focal element — large, centered, with
          real room around it — everything else (title/description/progress)
          is deliberately smaller and lighter so it reads as secondary. */}
      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center px-6 text-center">
        <LogoGrowthVisual />

        <h2 className="donation-transition-title mt-8 text-lg font-bold text-foreground sm:text-xl">
          {t.campaignDetail.transition.title}
        </h2>
        <p className="donation-transition-description mt-2 text-xs leading-6 text-foreground/70 sm:text-sm">
          {t.campaignDetail.transition.description}
        </p>

        {/* Determinate-feeling progress line (fills once, over the same
            duration as the pause), not an indeterminate spinner. */}
        <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-primary-100">
          <div
            className="donation-transition-progress h-full rounded-full bg-gradient-to-l from-primary to-primary-light"
            style={{ animationDuration: `${TRANSITION_MS}ms` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {children(handleDonateClick)}
      {/* `overlay` (and so this portal) can only ever be truthy after
          `phase` is flipped to "transitioning" inside the click handler
          above — a client-only interaction that happens well after mount —
          so `document.body` is always available here; no SSR guard needed. */}
      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
