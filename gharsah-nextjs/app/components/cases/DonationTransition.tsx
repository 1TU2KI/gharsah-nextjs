"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import { track } from "../../lib/analytics/track";

/**
 * A calm, unhurried growth (see `.donation-plant-*` in globals.css for the
 * full choreography: a tiny sprout at the ground → the lower stem draws
 * itself upward → a lower-left and a lower-right branch grow outward, each
 * with its own small secondary twig → their leaves unfold → the stem's
 * upper section continues the SAME curve further up → a second branch pair
 * (left and right, at different heights) grows → their leaves unfold → a
 * third branch pair grows → their leaves unfold → the crown: the stem's own
 * tip forks into a final left/right pair, replacing what would otherwise be
 * a lone top leaf → their leaves unfold last — every tier grows on BOTH
 * sides of the stem, matching the reference's silhouette, never just one
 * side per tier) —
 * the whole point of "اجعل نيتك أوسع" is a real pause for intention before
 * leaving Gharsah, not a quick transition effect. The redirect itself is
 * timed dynamically, not on a fixed delay — see DonationTransition's own
 * doc comment below for how MIN/MAX_TRANSITION_MS and destination
 * readiness combine, which is why this visual may occasionally be cut off
 * before its own ~4.15s full bloom on a very fast destination (never
 * before MIN_TRANSITION_MS though). Reduced motion collapses the whole
 * thing to one quick 0.65s fade of the finished plant (see globals.css),
 * on its own fixed timing, not gated on destination readiness.
 *
 * Deliberately its own component/CSS namespace (`donation-plant-*`), fully
 * independent from the main site loader (GharsahLoader.tsx's
 * `gharsah-loader__*` classes) and from that loader's own lotus mark —
 * this is a small plant growing, not the Gharsah logo, and the two loading
 * experiences must never be conflated or share timing/markup.
 *
 * Deliberately asymmetric throughout, by design, not by accident: the stem
 * is two gentle curves continuing one another (not a straight line). Four
 * branch tiers climb the stem — lower (l1/l2), middle (l3-left/l3-right),
 * upper (l4/l4-right), and the crown fork (top-left/top-right) — each tier
 * with a branch on BOTH sides (matching the reference's silhouette), plus
 * two secondary twigs off the lowest pair; every branch within a pair sits
 * at a different height with a different length/curve, never a mirror
 * image of its opposite. No leaf sits alone at the very top: the stem's
 * own tip splits into two diverging branches instead (matching how a real
 * sapling's growing tip actually forks). Modeled closely after a reference
 * image: most branch tips carry a small pair of leaves, and the fuller
 * right-side clusters (l2, l3-right) carry a third — twenty-one leaves in
 * total, elongated/pointed rather than round, still small and simple
 * individually.
 *
 * Colors: one gradient, sampled the same way from base to tip — soft green
 * at the roots, softening through turquoise at mid-height, into a subtle
 * blue-leaning teal (#0c787e) near the crown. Every stroke/fill below
 * reads off this single gradient, never a hardcoded color, so the stem,
 * every branch/twig, and every leaf shift together as one continuous,
 * natural transition.
 */
// The redirect fires as soon as BOTH of these are true: the destination has
// signaled it's ready (see the `<link rel="prefetch">` in the click handler
// below) AND at least MIN_TRANSITION_MS has passed — never a fixed wait
// regardless of readiness. MIN_TRANSITION_MS alone is what the progress bar
// animates over (see PlantGrowthVisual's sibling `<div>` below): it's the
// one duration known upfront, and is enough for the growth to read as
// intentional even on an instant destination. MAX_TRANSITION_MS is a safety
// ceiling for the rare case the destination-ready signal never fires at all
// (e.g. the prefetch request itself gets blocked) — same worst-case wait as
// the old fixed timing, never longer.
const MIN_TRANSITION_MS = 2800;
const MAX_TRANSITION_MS = 4400;
const REDUCED_MOTION_TRANSITION_MS = 650;

type Phase = "idle" | "transitioning";

/**
 * ONE focal visual, deliberately elegant and alone (no other animated
 * elements competing with it), fuller than before but still simple: a tiny
 * sprout pops at the ground, the lower stem draws itself upward along a
 * single subtle curve, a lower-left and a lower-right branch grow outward
 * (each sprouting its own small secondary twig) and their leaves unfold,
 * the stem's upper section then continues the SAME curve further up — a
 * real continuation, not a stretch — two middle branches grow at different
 * heights on opposite sides and their leaves unfold, and finally three
 * upper branches grow — including the two that fork outward from the
 * stem's own tip, replacing what would otherwise be an isolated top leaf —
 * with their leaves unfolding last. The stem/branches/twigs use real SVG
 * path-drawing (`pathLength` + `stroke-dasharray`/`stroke-dashoffset`, see
 * globals.css) rather than a Y-axis scale trick — the only technique that
 * grows a curved line without visibly warping it — while every leaf
 * unfurls via a combination of non-uniform scale, opacity, and a slight
 * settling rotation (thin/closed/tilted → fully open), never a flat
 * fade/pop. `prefers-reduced-motion` swaps the whole growth to a single
 * short fade of the finished plant (handled entirely in CSS, no JS
 * branching needed here).
 */
function PlantGrowthVisual() {
  return (
    <div className="relative h-72 w-36 sm:h-96 sm:w-44" role="status" aria-hidden="true">
      {/* Soft static glow behind the mark for depth — deliberately faint,
          not animated. */}
      <div aria-hidden="true" className="absolute inset-0 scale-110 rounded-full bg-primary/20 blur-2xl" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 140 300" aria-hidden="true">
        <defs>
          <linearGradient id="donation-plant-gradient" x1="70" y1="290" x2="70" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--primary-dark)" />
            <stop offset="55%" stopColor="var(--turquoise-soft)" />
            <stop offset="100%" stopColor="#0c787e" />
          </linearGradient>
        </defs>

        <circle className="donation-plant-seed" cx="70" cy="290" r="3.5" fill="url(#donation-plant-gradient)" />

        {/* The stem in two continuing segments, not one — the lower
            segment grows first, the lower branches around it appear, and
            only then does the upper segment continue the SAME curve
            further up, so the extra height is a real continuation of the
            plant's own growth rather than the artwork being stretched.
            The upper segment ends where it forks into the two top
            branches below — there is no separate stem tip beyond that. */}
        <path
          className="donation-plant-stem donation-plant-stem--lower"
          pathLength={1}
          d="M70,290 C76,230 62,185 68,160"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="donation-plant-stem donation-plant-stem--upper"
          pathLength={1}
          d="M68,160 C73,125 63,100 68,70"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Lower-left branch — shorter, sharper curve. */}
        <path
          className="donation-plant-branch donation-plant-branch--l1"
          pathLength={1}
          d="M72,228 Q54,222 39,208"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="2.25"
          strokeLinecap="round"
          fill="none"
        />
        {/* A small secondary twig off the lower-left branch — never
            mirrored by the lower-right branch's own twig below. */}
        <path
          className="donation-plant-branch donation-plant-branch--twig1"
          pathLength={1}
          d="M54,222 Q42,213 46,203"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Lower-right branch — opposite side, a little higher, longer,
            gentler curve. */}
        <path
          className="donation-plant-branch donation-plant-branch--l2"
          pathLength={1}
          d="M66,197 Q85,188 98,175"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="2.25"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="donation-plant-branch donation-plant-branch--twig2"
          pathLength={1}
          d="M85,188 Q97,180 93,169"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Two middle branches, growing from the newly-extended upper
            stem — different heights, lengths, and curves, never a
            mirrored pair despite sitting on opposite sides. */}
        <path
          className="donation-plant-branch donation-plant-branch--l3-left"
          pathLength={1}
          d="M65,155 Q47,146 32,133"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="donation-plant-branch donation-plant-branch--l3-right"
          pathLength={1}
          d="M67,150 Q87,143 101,131"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Third branch pair — every tier grows on both sides of the stem
            (matching the reference), never just one. */}
        <path
          className="donation-plant-branch donation-plant-branch--l4"
          pathLength={1}
          d="M65,110 Q48,100 35,87"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="donation-plant-branch donation-plant-branch--l4-right"
          pathLength={1}
          d="M69,102 Q88,92 102,80"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="1.9"
          strokeLinecap="round"
          fill="none"
        />

        {/* The crown: instead of one leaf sitting alone on the stem's
            tip, the stem forks into two diverging branches here — this is
            what replaces the old isolated top leaf. */}
        <path
          className="donation-plant-branch donation-plant-branch--top-left"
          pathLength={1}
          d="M68,70 Q52,58 40,44"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="1.85"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="donation-plant-branch donation-plant-branch--top-right"
          pathLength={1}
          d="M68,70 Q86,60 100,48"
          stroke="url(#donation-plant-gradient)"
          strokeWidth="1.85"
          strokeLinecap="round"
          fill="none"
        />

        {/* Twenty-one small, elongated leaves — a pair near most of the nine
            main branch tips (matching the reference's small leaf clusters,
            not one leaf per branch), a third leaf added to the fuller
            right-side clusters (l2, l3-right), plus one at each of the two
            twig tips. Each leaf sits at a slightly different point/angle
            along its branch, never identical, and every leaf unfurls only
            once its own branch has finished drawing. */}
        <path
          className="donation-plant-leaf donation-plant-leaf--1"
          style={{ transformOrigin: "39px 208px" }}
          d="M39,208 Q27,200 16,206 Q23,216 39,208 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--1b"
          style={{ transformOrigin: "49px 214px" }}
          d="M49,214 Q42,224 33,222 Q38,211 49,214 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--twig1"
          style={{ transformOrigin: "46px 203px" }}
          d="M46,203 Q35,196 26,202 Q34,211 46,203 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.9}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--2"
          style={{ transformOrigin: "98px 175px" }}
          d="M98,175 Q111,165 124,172 Q116,184 98,175 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--2b"
          style={{ transformOrigin: "88px 182px" }}
          d="M88,182 Q99,189 96,199 Q86,192 88,182 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--2c"
          style={{ transformOrigin: "79px 188px" }}
          d="M79,188 Q87,196 84,206 Q75,200 79,188 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.9}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--twig2"
          style={{ transformOrigin: "93px 169px" }}
          d="M93,169 Q105,161 116,167 Q107,178 93,169 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.9}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--l3left"
          style={{ transformOrigin: "32px 133px" }}
          d="M32,133 Q19,125 8,131 Q16,142 32,133 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--l3leftb"
          style={{ transformOrigin: "42px 140px" }}
          d="M42,140 Q33,132 24,137 Q31,147 42,140 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--l3right"
          style={{ transformOrigin: "101px 131px" }}
          d="M101,131 Q114,121 128,128 Q119,140 101,131 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--l3rightb"
          style={{ transformOrigin: "91px 137px" }}
          d="M91,137 Q101,129 111,134 Q103,144 91,137 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--l3rightc"
          style={{ transformOrigin: "81px 142px" }}
          d="M81,142 Q90,148 87,158 Q78,153 81,142 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.9}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--l4"
          style={{ transformOrigin: "35px 87px" }}
          d="M35,87 Q22,79 11,85 Q19,96 35,87 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--l4b"
          style={{ transformOrigin: "44px 94px" }}
          d="M44,94 Q33,89 25,96 Q34,103 44,94 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--l4right"
          style={{ transformOrigin: "102px 80px" }}
          d="M102,80 Q116,71 128,77 Q119,89 102,80 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--l4rightb"
          style={{ transformOrigin: "92px 86px" }}
          d="M92,86 Q83,94 74,90 Q80,80 92,86 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--topleft"
          style={{ transformOrigin: "40px 44px" }}
          d="M40,44 Q28,35 17,41 Q25,52 40,44 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--topleftb"
          style={{ transformOrigin: "48px 52px" }}
          d="M48,52 Q42,42 50,35 Q56,45 48,52 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--topright"
          style={{ transformOrigin: "100px 48px" }}
          d="M100,48 Q113,38 126,45 Q117,57 100,48 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
        <path
          className="donation-plant-leaf donation-plant-leaf--toprightb"
          style={{ transformOrigin: "90px 55px" }}
          d="M90,55 Q98,46 108,50 Q100,60 90,55 Z"
          fill="url(#donation-plant-gradient)"
          fillOpacity={0.92}
        />
      </svg>
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
 * Redirect timing (non-reduced-motion): NOT a fixed delay. The click
 * handler starts the plant growing and, in parallel, injects a `<link
 * rel="prefetch">` for `url` — the closest real "is the destination ready"
 * signal available for a same-tab redirect to a cross-origin page (browsers
 * don't expose anything deeper than that on purpose). The actual redirect
 * fires the instant BOTH are true: MIN_TRANSITION_MS (~2.8s) has elapsed
 * AND that prefetch has settled (loaded or errored — either means there's
 * nothing more to usefully wait for). A slow destination just keeps the
 * plant growing naturally past MIN_TRANSITION_MS, up to MAX_TRANSITION_MS
 * (~4.4s) as an absolute ceiling in case the prefetch signal never fires at
 * all — never longer than the old fixed wait, but never a fixed wait when
 * the destination is already ready sooner.
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
  // Everything the click handler schedules — the two timers plus the
  // prefetch `<link>` it injects — is kept in state rather than a ref: the
  // donate click handler below is handed to `children` (a render prop) and
  // called later as an event handler, but React's stricter ref rules flag
  // *any* function that touches `ref.current` being passed through an
  // opaque call during render — even one only ever invoked afterward —
  // since it can't prove the callee won't invoke it synchronously. State
  // sidesteps that entirely and is perfectly fine to read/write from an
  // event handler.
  const [pendingRedirect, setPendingRedirect] = useState<{
    minTimerId: number;
    maxTimerId: number;
    prefetchLink: HTMLLinkElement | null;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (!pendingRedirect) return;
      window.clearTimeout(pendingRedirect.minTimerId);
      window.clearTimeout(pendingRedirect.maxTimerId);
      pendingRedirect.prefetchLink?.remove();
    };
  }, [pendingRedirect]);

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

      if (prefersReducedMotion) {
        // Reduced motion has no growth to protect — same short fixed fade
        // as always, not gated on destination readiness (a network-bound
        // wait would only make the "reduced" experience feel slower).
        const reducedTimerId = window.setTimeout(() => {
          window.location.assign(url);
        }, REDUCED_MOTION_TRANSITION_MS);
        setPendingRedirect({ minTimerId: reducedTimerId, maxTimerId: reducedTimerId, prefetchLink: null });
        return;
      }

      // Same-tab navigation, so there's no ordinary way to know when a
      // cross-origin destination is "ready" — browsers deliberately don't
      // expose that. A `<link rel="prefetch">` is the closest real signal:
      // it fetches the destination document in the background (nothing is
      // executed or saved to disk) and warms the browser's cache for it, so
      // the actual redirect below tends to land faster too. Its load/error
      // event is what "destination ready" means here; either counts, since
      // a failed prefetch means there's nothing more to usefully wait for.
      let destinationReady = false;
      let minDurationElapsed = false;
      let redirected = false;

      const redirectIfReady = () => {
        if (redirected || !destinationReady || !minDurationElapsed) return;
        redirected = true;
        window.location.assign(url);
      };

      const markDestinationReady = () => {
        destinationReady = true;
        redirectIfReady();
      };

      const minTimerId = window.setTimeout(() => {
        minDurationElapsed = true;
        redirectIfReady();
      }, MIN_TRANSITION_MS);

      // Absolute ceiling: if the prefetch's load/error never fires at all,
      // redirect anyway once this elapses rather than stranding the user on
      // the transition screen — the same worst-case wait as the old fixed
      // timing, never longer.
      const maxTimerId = window.setTimeout(markDestinationReady, MAX_TRANSITION_MS);

      const prefetchLink = document.createElement("link");
      prefetchLink.rel = "prefetch";
      prefetchLink.href = url;
      prefetchLink.addEventListener("load", markDestinationReady);
      prefetchLink.addEventListener("error", markDestinationReady);
      document.head.appendChild(prefetchLink);

      setPendingRedirect({ minTimerId, maxTimerId, prefetchLink });
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

      {/* The growing plant is the one focal element — large, centered, with
          real room around it — everything else (title/description/progress)
          is deliberately smaller and lighter so it reads as secondary. */}
      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center px-6 text-center">
        <PlantGrowthVisual />

        <h2 className="donation-transition-title mt-8 text-lg font-bold text-foreground sm:text-xl">
          {t.campaignDetail.transition.title}
        </h2>
        <p className="donation-transition-description mt-2 text-xs leading-6 text-foreground/70 sm:text-sm">
          {t.campaignDetail.transition.description}
        </p>

        {/* Determinate-feeling progress line, filling over the guaranteed
            minimum duration — the one span known upfront. If the
            destination takes longer than that to become ready, this simply
            holds at 100% for the remainder rather than restarting or
            stalling partway; the actual redirect timing lives in the click
            handler above, not here. */}
        <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-primary-100">
          <div
            className="donation-transition-progress h-full rounded-full bg-gradient-to-l from-primary to-primary-light"
            style={{ animationDuration: `${MIN_TRANSITION_MS}ms` }}
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
