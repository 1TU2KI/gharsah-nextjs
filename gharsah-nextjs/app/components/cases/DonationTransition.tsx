"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Amiri } from "next/font/google";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import { track } from "../../lib/analytics/track";

/** Same face and weight as the About page couplet (typography reference for the heading). */
const amiri = Amiri({ subsets: ["arabic"], weight: ["700"] });

/**
 * A small, simple Gharsah sprout — a short stem with two leaves, drawn in
 * the current theme's primary colors (green in Light Mode, saffron in Dark
 * Mode; the completed palette when leaving from a completed campaign). It only fades in (`.donation-sprout` in globals.css); there is no
 * growth choreography to wait for.
 */
function Sprout() {
  return (
    <svg className="donation-sprout h-14 w-14" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 42 C24 35 23.5 29 24 22" stroke="var(--primary-dark)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 27 C17 27 12.5 22.5 12 15 C19 15 23.5 19.5 24 27 Z" fill="var(--primary)" />
      <path d="M24 22 C24.5 14.5 29.5 9.5 37 9 C36.5 16.5 31.5 21.5 24 22 Z" fill="var(--primary-light)" />
    </svg>
  );
}

/**
 * Wraps an existing donate link and sends the visitor to the official
 * donation platform in the SAME tab, immediately — no minimum display time,
 * no timer, no waiting for an animation. The destination URL is already
 * known at click time, so there is nothing to prepare: the click starts the
 * navigation right away, and the "اجعل نيتك أوسع" overlay (small sprout +
 * the existing text) only covers the real time the browser takes to load
 * the platform. If that's instant, the overlay is simply never seen.
 *
 * The donate link itself is passed in via the render-prop `children`, so its
 * classes/label/position never change here. It keeps its real `href`/
 * `target="_blank"`/`rel` — modified clicks (ctrl/cmd/shift/middle) are
 * never intercepted and behave like a normal link, and the link still works
 * if this component's JS fails.
 *
 * Rendered via a portal to `document.body`: donate buttons sit inside cards
 * with `backdrop-blur`, which would otherwise clip a `position: fixed`
 * overlay to the card's box.
 *
 * Look: the page the visitor came from stays visible, blurred and tinted,
 * behind a centered Liquid Glass card (sprout, heading, message, bar), in
 * the current theme. The card's glass is tinted by the campaign's real
 * status (`completed` prop): Gharsah green for active, Completed teal for
 * completed (which also switches the sprout/title/bar to the completed
 * palette), from the homepage, listings and detail pages alike.
 *
 * The thin bar is honestly indeterminate: once the navigation has started,
 * a page cannot measure how far the official platform has loaded, so it
 * shows a soft moving shimmer — never a percentage — and nothing waits on it.
 */
export default function DonationTransition({
  url,
  campaignId,
  metadata,
  completed = false,
  children,
}: {
  url: string;
  /** Attaches this click to a campaign in the analytics data — omit for any future non-campaign donate link this component might wrap. */
  campaignId?: string;
  /** Optional short plain-text tag forwarded to the `donation_click` event — e.g. "short_link" when this donate click follows a gharsah.sa/c/<code> visit (see CampaignDetailClient.tsx), so the admin's short-link stats can attribute it. */
  metadata?: string;
  /** The campaign's actual status is "completed" — selects the completed palette and the teal glass tint on the transition card (otherwise the active green). Callers pass `campaign.status === "completed"`. */
  completed?: boolean;
  children: (onDonateClick: (e: React.MouseEvent<HTMLAnchorElement>) => void) => React.ReactNode;
}) {
  const { t, locale } = useLanguage();
  const [leaving, setLeaving] = useState(false);
  const [completedTone, setCompletedTone] = useState(false);

  // Coming back with the browser's Back button can restore this page from
  // the back/forward cache with the overlay still up — clear it then.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLeaving(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const handleDonateClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        // Let the browser handle modified clicks exactly like a normal link.
        return;
      }
      e.preventDefault();
      if (leaving) return;

      // Fire-and-forget; sent before the navigation starts, never awaited.
      track({ type: "donation_click", campaignId, metadata });
      // The official link is already known — navigate right now; the
      // overlay below only renders on top of the load that's already running.
      window.location.assign(url);
      // The campaign's real status, passed by every caller (CampaignCard,
      // CampaignDetailClient; AlmostThereCard is active-only) — drives the
      // card's green (active) / teal (completed) glass tint and palette.
      setCompletedTone(completed);
      setLeaving(true);
    },
    [leaving, url, campaignId, metadata, completed],
  );

  const description = t.campaignDetail.transition.description;

  const overlay = leaving && (
    <div
      role="status"
      aria-live="polite"
      className={`donation-transition-overlay fixed inset-0 z-[999] flex h-[100dvh] items-center justify-center px-4 ${
        completedTone ? "donation-transition--completed" : ""
      }`}
    >
      <div
        className={`donation-transition-card glass-surface glass-clear relative z-10 flex w-full max-w-sm flex-col items-center rounded-3xl border border-border px-6 py-8 text-center sm:max-w-md sm:px-10 sm:py-10 ${
          completedTone ? "glass-surface--completed" : ""
        }`}
      >
        <Sprout />
        <h2
          className={`donation-transition-title mt-3 text-[26px] leading-[1.6] sm:text-3xl sm:leading-[1.6] ${
            locale === "ar" ? amiri.className : "font-extrabold tracking-tight"
          }`}
        >
          {t.campaignDetail.transition.title}
        </h2>
        {/* Arabic: exactly two centered lines, split at the `\n` in the
            translation; `.donation-transition-text--ar` (globals.css) sizes
            them to fit the card width. Lines can still wrap as a last resort
            on very narrow screens instead of clipping. */}
        <p
          className={`donation-transition-text mt-4 w-full text-base font-medium leading-[1.85] sm:text-[17px] sm:leading-[1.9] ${
            locale === "ar" ? "donation-transition-text--ar" : ""
          }`}
        >
          {locale === "ar" ? (
            description.split("\n").map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))
          ) : (
            <span className="block text-balance">{description}</span>
          )}
        </p>
        <div role="progressbar" aria-label={t.campaignDetail.transition.title} className="donation-transition-bar mt-6">
          <span />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {children(handleDonateClick)}
      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
