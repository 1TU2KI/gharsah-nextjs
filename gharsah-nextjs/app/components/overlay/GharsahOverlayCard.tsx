import Image from "next/image";
import { create } from "qrcode";
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
/**
 * "qr" style: a scannable QR — Inked Willow modules on a solid pale ivory
 * square that includes the standard 4-module quiet zone (the margin scanners
 * need), inside a rounded green glass panel with a short destination label
 * (globals.css `.obs-qr-panel`; its reflection never reaches the code). Same `qrcode` encoder (error correction M) as the campaign story image
 * (CampaignStoryShare.tsx). SVG + crispEdges so OBS scales it without blur.
 */
const QR_QUIET_ZONE = 4;

/** Short label under the code naming where it leads (derived from the encoded URL, see gharsah/qr.ts). */
function qrLabel(value: string): string {
  const path = new URL(value).pathname;
  if (path === "/near") return "صفحة اقتربت";
  if (path === "/") return "زيارة غرسة";
  return "عرض الحالة";
}
const QR_SIZE_PX = 220;

function GharsahQrCode({ value }: { value: string }) {
  const { modules } = create(value, { errorCorrectionLevel: "M" });
  const n = modules.size + QR_QUIET_ZONE * 2;
  let path = "";
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) path += `M${col + QR_QUIET_ZONE} ${row + QR_QUIET_ZONE}h1v1h-1z`;
    }
  }
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={QR_SIZE_PX}
      height={QR_SIZE_PX}
      shapeRendering="crispEdges"
      className="obs-qr-code"
      role="img"
      aria-label={value}
      data-qr-value={value}
    >
      {/* Solid pale ivory incl. the quiet zone; Inked Willow modules. */}
      <rect width={n} height={n} fill="#fffdf2" />
      <path d={path} fill="#173e36" />
    </svg>
  );
}

export default function GharsahOverlayCard({
  visible,
  hostUrl,
  message,
  style,
  theme,
  compact,
  position,
  transitionDurationMs,
  qrValue = null,
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
  /** "qr" style only: the URL to encode (gharsah/qr.ts). */
  qrValue?: string | null;
}) {
  const fromLeft = position === "top-left" || position === "bottom-left";
  // Shared by both styles — only the animation/position classes, no surface
  // styling here, so "logo" can reuse it without dragging in a card look.
  const animationClass = `overlay-card ${visible ? "overlay-card--visible" : ""} ${fromLeft ? "overlay-card--from-left" : "overlay-card--from-right"}`;

  if (style === "qr") {
    // Nothing valid to point to (e.g. the chosen campaign is no longer
    // public): show nothing rather than a code to the wrong place.
    if (!qrValue) return null;
    return (
      <div className={animationClass} style={{ transitionDuration: `${transitionDurationMs}ms` }}>
        <div dir="rtl" className="obs-qr-panel flex flex-col items-center gap-2.5 p-3.5 pb-3">
          <GharsahQrCode value={qrValue} />
          <p className="obs-qr-label text-lg font-bold leading-none">{qrLabel(qrValue)}</p>
        </div>
      </div>
    );
  }

  if (style === "logo") {
    return (
      <div dir="rtl" className={`${animationClass} flex flex-col items-center gap-3 text-center`} style={{ transitionDuration: `${transitionDurationMs}ms` }}>
        {/* Real transparent logo asset (same bare /logo.png Header.tsx/
            AdminSidebar.tsx already use) — deliberately NOT Footer.tsx's
            wrapped version (rounded-full bg-white p-1), which would put a
            white circle behind it, exactly what the brief forbids. Sized
            large enough to read clearly on stream without dominating it. */}
        <Image src="/logo.png" alt="غرسة" width={112} height={112} className="obs-logo-mark h-28 w-28 object-contain" />
        {/* Same plain-text/LTR/centered/never-truncated treatment as the
            brand card's own host-url line below — white + a soft dark
            drop-shadow (not a background) so it stays readable over
            whatever arbitrary video is actually behind it on stream. */}
        <p dir="ltr" className="obs-logo-host whitespace-nowrap text-2xl font-semibold">
          {hostUrl}
        </p>
      </div>
    );
  }

  // Same theme-independent green palette as OverlayCard (globals.css `.obs-card*`).
  const surfaceClass = theme === "dark" ? "obs-card obs-card--dark" : "obs-card obs-card--light";
  const mutedClass = "obs-muted";

  return (
    <div
      dir="rtl"
      className={`${animationClass} flex flex-col items-center rounded-2xl text-center backdrop-blur-md ${surfaceClass} ${
        compact ? "w-64 gap-2 p-3" : "w-80 gap-2.5 p-4"
      }`}
      style={{ transitionDuration: `${transitionDurationMs}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className="obs-logo-badge flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
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
