import Image from "next/image";
import type { OverlayPosition, OverlayTheme } from "@/app/lib/db/settings";
import type { OverlayCampaign } from "@/app/lib/overlay/types";
import type { OverlayLang } from "@/app/lib/overlay/queryParams";

/**
 * The dedication/mention line (campaign.subtitle) is now the card's ONLY
 * primary text — the campaign title is gone entirely, and this line must
 * NEVER truncate (no ellipsis, no clipping — a real name/@handle cut off
 * mid-word is worse than a taller card). Since there's no title above it
 * anymore to absorb length, a genuinely long subtitle needs a smaller font
 * to keep the card from ballooning — this is a plain character-count
 * heuristic (not a real text-measurement), deliberately conservative so it
 * only steps down for names that would otherwise wrap awkwardly. Wrapping
 * itself (not truncation) is what actually guarantees full readability;
 * this just keeps the wrapped result looking reasonably compact.
 */
function subtitleSizeClass(length: number, compact: boolean): string {
  if (length > 60) return "text-[11px]";
  if (length > 40) return "text-xs";
  if (compact) return "text-sm";
  return "text-base";
}

/**
 * Splits the subtitle into plain text + its `@mention` token (if any), so
 * only the mention renders in Gharsah green — the rest of the sentence
 * stays the card's normal (white/dark) text color. The mention is always
 * `@` immediately followed by non-whitespace characters (see buildSubtitle
 * in app/lib/overlay/data.ts, untouched — this is a purely presentational
 * split of the same string, never a data/API change), so this never alters
 * the username itself, just how it's colored. Wrapped in `<bdi dir="ltr">`
 * — the exact same bidi-isolation pattern MemorialLine (CampaignCard.tsx)
 * already uses for a Latin-script username sitting inside an RTL Arabic
 * sentence — so it renders correctly regardless of surrounding direction,
 * same font size/weight as the rest of the line (color is the only change).
 */
function renderSubtitle(subtitle: string): React.ReactNode {
  return subtitle.split(/(@\S+)/).map((part, i) =>
    part.startsWith("@") ? (
      <bdi key={i} dir="ltr" className="text-primary-light">
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

/**
 * The ONE visual for a single overlay frame — shared by the real OBS
 * overlay (OverlayClient, on stream) and the admin's live settings preview
 * (OverlaySettingsPanel), so a streamer previewing in Admin sees exactly
 * what actually airs, never a second hand-maintained look-alike.
 *
 * `campaign: null` (no qualifying campaigns, or the admin preview before
 * any data has loaded) renders NO invented placeholder text — just
 * whatever's already independently on: the branding row if `showLogo` is
 * on, otherwise nothing. Never "undefined", "0%"/"NaN%", a raw loading/error
 * state, or a made-up slogan, per the resilience brief.
 *
 * Purely presentational: every timing/cycling decision (which campaign,
 * when to swap, entry/exit) lives in the caller (OverlayClient or the
 * preview panel) — this component only ever renders "this frame, at this
 * opacity/transform," driven by the `visible` prop.
 */
export default function OverlayCard({
  campaign,
  visible,
  showProgress,
  showRemaining,
  showShortLink,
  showLogo,
  theme,
  compact,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- accepted for prop-type compatibility with existing callers, deliberately not rendered (see the doc comment on this prop below).
  titleText,
  position,
  transitionDurationMs,
  lang,
}: {
  campaign: OverlayCampaign | null;
  visible: boolean;
  showProgress: boolean;
  showRemaining: boolean;
  showShortLink: boolean;
  showLogo: boolean;
  theme: OverlayTheme;
  compact: boolean;
  /** No longer rendered — the card no longer shows a heading/title line above the dedication line (see the "Expected layout" this component now matches). Kept in the prop type only so existing callers (OverlayClient, OverlaySettingsPanel) don't need to change what they pass. */
  titleText: string;
  position: OverlayPosition;
  transitionDurationMs: number;
  lang: OverlayLang;
}) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const fromLeft = position === "top-left" || position === "bottom-left";

  const surfaceClass =
    theme === "dark"
      ? "border-white/10 bg-black/55 text-white shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
      : "border-black/5 bg-white/88 text-[#0f2415] shadow-[0_8px_28px_rgba(15,36,21,0.18)]";
  const mutedClass = theme === "dark" ? "text-white/60" : "text-[#0f2415]/60";
  const trackClass = theme === "dark" ? "bg-white/12" : "bg-black/8";

  return (
    <div
      dir={dir}
      className={`overlay-card ${visible ? "overlay-card--visible" : ""} ${fromLeft ? "overlay-card--from-left" : "overlay-card--from-right"} flex flex-col rounded-2xl border backdrop-blur-md ${surfaceClass} ${
        compact ? "w-64 gap-2 p-3" : "w-80 gap-2.5 p-4"
      }`}
      style={{ transitionDuration: `${transitionDurationMs}ms` }}
    >
      {showLogo && (
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
            <Image src="/logo.png" alt="" aria-hidden="true" width={20} height={20} className="h-full w-full object-cover" />
          </span>
          <span className={`text-[11px] font-bold leading-none ${mutedClass}`}>غرسة | Gharsah</span>
        </div>
      )}

      {campaign && (
        <>
          {/* The dedication/mention line is now the card's only primary
              text — no campaign title above it. Deliberately no
              line-clamp/truncate/nowrap anywhere here: the full name and
              @handle must always be fully visible, wrapping to a second
              line rather than ever being cut off. subtitleSizeClass steps
              the font down for longer text so the card stays reasonably
              compact; it never hides or clips content. */}
          {campaign.subtitle && (
            <p className={`font-bold leading-tight ${subtitleSizeClass(campaign.subtitle.length, compact)}`}>{renderSubtitle(campaign.subtitle)}</p>
          )}

          {showProgress && (
            <div>
              <div className={`h-1.5 w-full overflow-hidden rounded-full ${trackClass}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-l from-primary to-primary-light"
                  style={{ width: `${Math.min(100, Math.max(0, campaign.percent))}%` }}
                />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-sm font-extrabold text-primary-light">{campaign.percent}%</span>
                {showRemaining && <span className={`text-[10px] font-semibold ${mutedClass}`}>{lang === "ar" ? `تبقّى ${campaign.remaining}%` : `${campaign.remaining}% left`}</span>}
              </div>
            </div>
          )}

          {/* The short link — always the same absolute host+code built in
              app/lib/overlay/data.ts from the real request origin, never a
              hardcoded domain, so this already reads gharsah.sa/c/... in
              production automatically. Plain centered text, not a pill/chip
              (deliberately no border/background/rounded-full anymore — it
              should look like normal overlay text, not a selected/input-like
              element), inheriting the card's own primary text color for
              contrast rather than the muted tone everything else uses, since
              viewers need to actually read and type this. `whitespace-nowrap`
              + no truncation classes anywhere: it must always render as the
              complete URL on one line, never clipped/ellipsized. */}
          {showShortLink && (
            <p dir="ltr" className={`mt-1 w-full whitespace-nowrap text-center font-semibold tracking-wide ${compact ? "text-xs" : "text-sm"}`}>
              {campaign.shortUrl}
            </p>
          )}
        </>
      )}
    </div>
  );
}
