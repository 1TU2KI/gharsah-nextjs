import Image from "next/image";
import type { OverlayPosition, OverlayTheme } from "@/app/lib/db/settings";
import type { GharsahOverlayStyle } from "@/app/lib/overlay/gharsah/types";

/**
 * The visual for a single Gharsah-brand overlay frame — now two styles
 * sharing one component (branch below), both still going through the exact
 * same `.overlay-card*` entrance/exit animation wrapper and position anchor
 * so timing/motion is identical regardless of which is picked:
 *
 * - "brand" (default, unchanged): the original full card — mirrors
 *   OverlayCard.tsx's shell/sizing/theme classes (w-64/w-80, surface/blur/
 *   shadow per theme). Logo + "غرسة | Gharsah", the existing Gharsah
 *   tagline, and the plain site host (see gharsah/data.ts — never a
 *   protocol, never a path, never a campaign/donation URL). No progress
 *   bar, no percent, no short link — those concepts don't exist on this
 *   card, per the brief: never invent data just to preserve the campaign
 *   layout.
 * - "logo" (new): deliberately NOT a smaller version of the card above —
 *   no surface classes at all (no border/background/shadow/backdrop-blur),
 *   just the bare logo + hostUrl floating directly over the stream, per the
 *   brief's explicit "no card/container/background" requirement. `theme`/
 *   `compact`/`message` are meaningless here (nothing they'd style exists)
 *   so this branch ignores them entirely rather than half-applying them.
 */
export default function GharsahOverlayCard({
  visible,
  hostUrl,
  message,
  style,
  theme,
  compact,
  position,
  transitionDurationMs,
}: {
  visible: boolean;
  /** Plain host only, e.g. "gharsah.sa" or "localhost:3000". */
  hostUrl: string;
  /** The existing Gharsah tagline (see gharsah/data.ts) — read only by the "brand" style. */
  message: string;
  style: GharsahOverlayStyle;
  theme: OverlayTheme;
  compact: boolean;
  position: OverlayPosition;
  transitionDurationMs: number;
}) {
  const fromLeft = position === "top-left" || position === "bottom-left";
  // Shared by both styles — only the animation/position classes, no surface
  // styling here, so "logo" can reuse it without dragging in a card look.
  const animationClass = `overlay-card ${visible ? "overlay-card--visible" : ""} ${fromLeft ? "overlay-card--from-left" : "overlay-card--from-right"}`;

  if (style === "logo") {
    return (
      <div dir="rtl" className={`${animationClass} flex flex-col items-center gap-3 text-center`} style={{ transitionDuration: `${transitionDurationMs}ms` }}>
        {/* Real transparent logo asset (same bare /logo.png Header.tsx/
            AdminSidebar.tsx already use) — deliberately NOT Footer.tsx's
            wrapped version (rounded-full bg-white p-1), which would put a
            white circle behind it, exactly what the brief forbids. Sized
            large enough to read clearly on stream without dominating it. */}
        <Image src="/logo.png" alt="غرسة" width={112} height={112} className="h-28 w-28 object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]" />
        {/* Same plain-text/LTR/centered/never-truncated treatment as the
            brand card's own host-url line below — white + a soft dark
            drop-shadow (not a background) so it stays readable over
            whatever arbitrary video is actually behind it on stream. */}
        <p dir="ltr" className="whitespace-nowrap text-2xl font-semibold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">
          {hostUrl}
        </p>
      </div>
    );
  }

  const surfaceClass =
    theme === "dark"
      ? "border-white/10 bg-black/55 text-white shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
      : "border-black/5 bg-white/88 text-[#0f2415] shadow-[0_8px_28px_rgba(15,36,21,0.18)]";
  const mutedClass = theme === "dark" ? "text-white/60" : "text-[#0f2415]/60";

  return (
    <div
      dir="rtl"
      className={`${animationClass} flex flex-col items-center rounded-2xl border text-center backdrop-blur-md ${surfaceClass} ${
        compact ? "w-64 gap-2 p-3" : "w-80 gap-2.5 p-4"
      }`}
      style={{ transitionDuration: `${transitionDurationMs}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <Image src="/logo.png" alt="" aria-hidden="true" width={24} height={24} className="h-full w-full object-cover" />
        </span>
        <span className="text-sm font-bold leading-none">غرسة | Gharsah</span>
      </div>

      <p className={`text-xs font-medium leading-6 ${mutedClass}`}>{message}</p>

      {/* The main visible URL — the single most important thing this card
          needs to communicate, so it's larger/bolder than the campaign
          card's own short link. Same plain-text (no pill/border), LTR,
          centered, whitespace-nowrap, never-truncated treatment
          OverlayCard.tsx uses for its short link, for the same reason:
          viewers need to actually read and type this. */}
      <p dir="ltr" className={`w-full whitespace-nowrap text-center font-extrabold tracking-wide ${compact ? "text-base" : "text-lg"}`}>
        {hostUrl}
      </p>
    </div>
  );
}
