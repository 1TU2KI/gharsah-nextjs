"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Campaign } from "../../lib/campaigns";
import { pickRandom } from "../../lib/random";
import { DiceIcon } from "../home/icons";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import { track } from "../../lib/analytics/track";

/** Matches the `dice-roll` keyframes duration in globals.css. */
const ROLL_ANIMATION_MS = 700;

const TOOLTIP_ID = "random-case-tooltip";

/**
 * Compact floating action button, not a card: only the circular dice button
 * is visible by default. The info tooltip is purely a hover/focus reveal on
 * devices that support hover (real cursors, `lg:group-hover`/
 * `lg:group-focus-within` below — CSS-only, no JS involved); on touch
 * devices (no `hover: hover` media match) the first tap opens the tooltip
 * instead of immediately firing the pick, and a tap outside closes it again
 * — see `handleClick`.
 *
 * Positioning: below `lg` the button sits in normal flow, centered under
 * the intro block. From `lg` up it detaches into an absolutely-positioned
 * float pinned to its parent's own bottom-inline-start corner (see the
 * `relative` wrapper around the intro block in the active-cases page) —
 * scoped to that block specifically so it can never drift into the grid or
 * footer regardless of how many campaigns are listed. Deliberately uses the
 * logical `start-0`/`justify-start` utilities, never `end-0`/`justify-end`:
 * `start` resolves to the *right* edge in RTL and the *left* edge in LTR,
 * which is exactly the mirrored placement wanted here — right-anchored in
 * Arabic, left-anchored in English (using `end` would flip that backwards).
 * The tooltip always pops *upward* from the button (never downward/sideways
 * into the grid), and anchors to that same `start` edge as the button so it
 * always opens toward the inside of the page — leftward from a
 * right-anchored (RTL) button, rightward from a left-anchored (LTR) one —
 * and can never spill past the viewport edge or cover a campaign card.
 *
 * Expects the caller's already-filtered, already-live-synced active
 * campaigns list (same data the grid below it renders) — never fetches or
 * filters on its own, so it can't drift out of sync with what's on screen.
 */
export default function RandomCaseButton({ campaigns }: { campaigns: Campaign[] }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isRolling, setIsRolling] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const empty = campaigns.length === 0;
  const disabled = empty || isRolling;

  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    if (!isCardOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsCardOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isCardOpen]);

  function handleClick() {
    if (disabled) return;

    const supportsHover = window.matchMedia("(hover: hover)").matches;
    if (!supportsHover && !isCardOpen) {
      // Touch devices have no hover preview — the first tap reveals the
      // tooltip (so it can be read, and dismissed via an outside tap)
      // instead of committing straight to a pick.
      setIsCardOpen(true);
      return;
    }

    const picked = pickRandom(campaigns);
    if (!picked) return;

    // "Use" = the button actually produced a pick (never fired for the
    // touch-device first tap that only reveals the tooltip above). "Selected"
    // additionally names which campaign, for the "most-picked" breakdown —
    // two events instead of one so usage can be counted even if a future
    // change ever lets a pick fail to resolve to a specific campaign.
    track({ type: "random_campaign_use" });
    track({ type: "random_campaign_selected", campaignId: picked.id });

    setIsCardOpen(false);
    setIsRolling(true);
    timeoutRef.current = window.setTimeout(() => {
      router.push(`/cases/active/${picked.slug}`);
    }, ROLL_ANIMATION_MS);
  }

  return (
    <div
      ref={wrapperRef}
      className="group/fab relative mx-auto mt-8 flex w-fit justify-center lg:absolute lg:bottom-0 lg:start-0 lg:mt-0 lg:justify-start"
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={t.randomCase.ariaLabel}
        aria-describedby={empty ? undefined : TOOLTIP_ID}
        aria-expanded={isCardOpen}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${
          empty
            ? "cursor-not-allowed bg-primary-50 text-muted"
            : `bg-accent text-on-accent shadow-[0_8px_20px_-6px_rgba(20,83,45,0.5)] hover:shadow-[0_10px_26px_-6px_rgba(20,83,45,0.6)] ${isRolling ? "cursor-wait" : ""}`
        }`}
      >
        {!empty && (
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 animate-glow-pulse rounded-full bg-accent/50 blur-lg"
          />
        )}
        <DiceIcon className={`h-6 w-6 ${isRolling ? "animate-dice-roll" : ""}`} />
      </button>

      {!empty && (
        <div className="absolute bottom-full left-1/2 z-30 mb-6 -translate-x-1/2 lg:end-auto lg:start-0 lg:left-auto lg:translate-x-0">
          <div
            id={TOOLTIP_ID}
            role="tooltip"
            className={`relative w-60 max-w-[calc(100vw-3rem)] origin-bottom rounded-2xl border border-border/70 bg-background/85 p-4 text-start shadow-[0_16px_32px_-12px_rgba(20,83,45,0.35)] backdrop-blur-md transition-all duration-300 ease-out ${
              isCardOpen
                ? "translate-y-0 scale-100 opacity-100 blur-none"
                : "pointer-events-none translate-y-4 scale-75 opacity-0 blur-[6px]"
            } lg:group-hover/fab:pointer-events-auto lg:group-hover/fab:translate-y-0 lg:group-hover/fab:scale-100 lg:group-hover/fab:opacity-100 lg:group-hover/fab:blur-none lg:group-focus-within/fab:pointer-events-auto lg:group-focus-within/fab:translate-y-0 lg:group-focus-within/fab:scale-100 lg:group-focus-within/fab:opacity-100 lg:group-focus-within/fab:blur-none`}
          >
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border/70 bg-background/85 lg:end-auto lg:start-7 lg:left-auto lg:translate-x-0"
            />
            <p className="text-sm font-bold leading-6 text-foreground">{t.randomCase.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{t.randomCase.description}</p>
          </div>
        </div>
      )}

      {empty && (
        <p className="absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 text-xs font-semibold text-muted lg:end-auto lg:start-0 lg:left-auto lg:translate-x-0">
          {t.cases.emptyActiveTitle}
        </p>
      )}
    </div>
  );
}
