"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Campaign } from "../../lib/campaigns";
import { pickRandom } from "../../lib/random";
import { RandomPickIcon } from "../home/icons";
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
 * Positioning: a plain flow item, placed by the caller's own toolbar row
 * (see ActiveCasesPageClient.tsx) alongside the sort dropdown — centered on
 * its own line below `sm`, sharing the row from `sm` up. The tooltip always
 * pops *upward* from the button (never downward/sideways into the grid),
 * and — from `lg` up, once there's room to tell "toward the inside of the
 * page" apart from "centered" — anchors to the button's own inline-start
 * edge (the *right* edge in RTL, the *left* edge in LTR) so it opens toward
 * the page's content and can never spill past the viewport edge.
 *
 * Expects the caller's already-filtered, already-live-synced active
 * campaigns list (same data the grid below it renders) — never fetches or
 * filters on its own, so it can't drift out of sync with what's on screen.
 *
 * `variant`: "fab" (default) is the original icon-only circle used on
 * /cases/active. "compact" is a labeled pill (icon + the full "دع غرسة
 * تختار لك عشوائياً" text, e.g. on /near, next to "نسخ رابط اقتربت").
 * "header" is a smaller icon-only circle (h-10, matching the Header's own
 * globe/theme/menu controls) for the shared site Header, where its
 * `aria-label` doubles as the full "دع غرسة تختار لك عشوائياً" phrase
 * since there's no room for visible label text there. These are ONLY
 * different `<button>` skins; every behavior below (click handling, the
 * touch-device double-tap-reveals-tooltip flow, the roll animation, the
 * icon's hover-rotate, the post-pick navigation) is the exact same code
 * path for all three, never forked or duplicated. The one other thing
 * "header" changes is the tooltip's pop direction (down instead of up) —
 * see `popDown` below — since the Header sits at the very top of the
 * viewport, an upward-popping tooltip would render off-screen there.
 */
export default function RandomCaseButton({
  campaigns,
  variant = "fab",
}: {
  campaigns: Campaign[];
  variant?: "fab" | "compact" | "header";
}) {
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

  const popDown = variant === "header";

  return (
    <div ref={wrapperRef} className="group/fab relative flex w-fit shrink-0 justify-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={variant === "header" ? t.randomCase.compactLabel : t.randomCase.ariaLabel}
        aria-describedby={empty ? undefined : TOOLTIP_ID}
        aria-expanded={isCardOpen}
        className={
          variant === "compact"
            ? `random-pick-btn relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                empty
                  ? "cursor-not-allowed bg-primary-50 text-muted"
                  : `bg-accent text-on-accent shadow-[0_8px_20px_-8px_rgba(20,83,45,0.45)] hover:bg-accent-strong hover:shadow-[0_10px_24px_-8px_rgba(20,83,45,0.55)] ${isRolling ? "cursor-wait" : ""}`
              }`
            : variant === "header"
              ? `random-pick-btn relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${
                  empty
                    ? "cursor-not-allowed bg-primary-50 text-muted"
                    : `bg-accent text-on-accent shadow-[0_6px_16px_-6px_rgba(20,83,45,0.45)] hover:bg-accent-strong hover:shadow-[0_8px_20px_-6px_rgba(20,83,45,0.55)] ${isRolling ? "cursor-wait" : ""}`
                }`
              : `random-pick-btn relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${
                  empty
                    ? "cursor-not-allowed bg-primary-50 text-muted"
                    : `bg-accent text-on-accent shadow-[0_8px_20px_-6px_rgba(20,83,45,0.5)] hover:shadow-[0_10px_26px_-6px_rgba(20,83,45,0.6)] ${isRolling ? "cursor-wait" : ""}`
                }`
        }
      >
        {!empty && (
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 animate-glow-pulse rounded-full bg-accent/50 blur-lg"
          />
        )}
        {/* The background/border/shadow/glow above all live on the
            `<button>` itself and stay completely static — only this icon
            rotates on hover (see `.random-pick-btn:hover .random-pick-icon`
            in globals.css), same rule/class for every variant. Rotating the
            button (or anything carrying its directional box-shadow)
            previously spun the shadow around with it, reading as a smeared
            artifact — the fix is to never put `transform` on anything but
            the icon itself. */}
        <RandomPickIcon
          className={`random-pick-icon shrink-0 ${variant === "fab" ? "h-6 w-6" : variant === "compact" ? "h-5 w-5" : "h-4 w-4"} ${isRolling ? "animate-dice-roll" : ""}`}
        />
        {variant === "compact" && <span>{t.randomCase.compactLabel}</span>}
      </button>

      {!empty && (
        <div
          className={`absolute left-1/2 z-30 -translate-x-1/2 lg:end-auto lg:left-auto lg:translate-x-0 ${
            popDown ? "top-full mt-3 lg:start-0" : "bottom-full mb-6 lg:start-0"
          }`}
        >
          <div
            id={TOOLTIP_ID}
            role="tooltip"
            className={`relative w-60 max-w-[calc(100vw-3rem)] rounded-2xl border border-border/70 bg-background/85 p-4 text-start shadow-[0_16px_32px_-12px_rgba(20,83,45,0.35)] backdrop-blur-md transition-all duration-300 ease-out ${
              popDown ? "origin-top" : "origin-bottom"
            } ${
              isCardOpen
                ? "translate-y-0 scale-100 opacity-100 blur-none"
                : `pointer-events-none scale-75 opacity-0 blur-[6px] ${popDown ? "-translate-y-4" : "translate-y-4"}`
            } lg:group-hover/fab:pointer-events-auto lg:group-hover/fab:translate-y-0 lg:group-hover/fab:scale-100 lg:group-hover/fab:opacity-100 lg:group-hover/fab:blur-none lg:group-focus-within/fab:pointer-events-auto lg:group-focus-within/fab:translate-y-0 lg:group-focus-within/fab:scale-100 lg:group-focus-within/fab:opacity-100 lg:group-focus-within/fab:blur-none`}
          >
            {/* Arrow, pointing back at the button: sits at the tooltip's
                bottom edge (showing its bottom-right border) when the
                tooltip pops upward, or at its top edge (showing its
                top-left border instead) when it pops downward. */}
            <span
              aria-hidden="true"
              className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-border/70 bg-background/85 lg:end-auto lg:start-7 lg:left-auto lg:translate-x-0 ${
                popDown ? "-top-1.5 border-t border-l" : "-bottom-1.5 border-b border-r"
              }`}
            />
            <p className="text-sm font-bold leading-6 text-foreground">{t.randomCase.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{t.randomCase.description}</p>
          </div>
        </div>
      )}

      {empty && (
        <p
          className={`absolute left-1/2 w-max -translate-x-1/2 text-xs font-semibold text-muted lg:end-auto lg:left-auto lg:translate-x-0 ${
            popDown ? "top-full mt-3 lg:start-0" : "bottom-full mb-3 lg:start-0"
          }`}
        >
          {t.cases.emptyActiveTitle}
        </p>
      )}
    </div>
  );
}
