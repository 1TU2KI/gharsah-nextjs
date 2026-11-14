import type { OverlayPosition, OverlayTheme } from "@/app/lib/db/settings";
import type { GharsahQrTarget } from "./qr";

/**
 * Which Gharsah Overlay visual to render — "brand" is the original full
 * card (logo + "غرسة | Gharsah" + tagline + site host, see
 * GharsahOverlayCard.tsx), "logo" is the new minimal variant (logo + site
 * host only, no card/background/border at all — see the brief). Query-param
 * selectable via `?style=`, same pattern as Campaign Overlay's `?mode=`.
 */
export type GharsahOverlayStyle = "brand" | "logo" | "qr";

export type ResolvedGharsahOverlayDisplay = {
  intervalMinutes: number;
  displayDurationMs: number;
  transitionDurationMs: number;
  theme: OverlayTheme;
  compact: boolean;
  position: OverlayPosition;
  style: GharsahOverlayStyle;
  /** "qr" style only (`?qr=`): what the QR points to — see qr.ts. */
  qrTarget: GharsahQrTarget;
  /** "qr" style + `qrTarget: "campaign"` only (`?c=`): the chosen campaign's slug. */
  qrCampaignSlug: string | null;
};

export type GharsahOverlayApiResponse = {
  settings: ResolvedGharsahOverlayDisplay;
  /** Plain host only — e.g. "gharsah.sa" in production, "localhost:3000" in dev. Never a protocol, never a path (never `/c/...`, never a campaign/donation URL). See data.ts. */
  hostUrl: string;
  /** The existing Gharsah tagline (see data.ts) — real copy already used elsewhere on the site, never invented here. */
  message: string;
  /** "qr" style only: the exact URL encoded in the QR (qr.ts), or null when there's nothing valid to point to. */
  qrValue: string | null;
};
