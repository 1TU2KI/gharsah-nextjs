import type { OverlayPosition, OverlayTheme } from "@/app/lib/db/settings";

/**
 * Which Gharsah Overlay visual to render — "brand" is the original full
 * card (logo + "غرسة | Gharsah" + tagline + site host, see
 * GharsahOverlayCard.tsx), "logo" is the new minimal variant (logo + site
 * host only, no card/background/border at all — see the brief). Query-param
 * selectable via `?style=`, same pattern as Campaign Overlay's `?mode=`.
 */
export type GharsahOverlayStyle = "brand" | "logo";

export type ResolvedGharsahOverlayDisplay = {
  intervalMinutes: number;
  displayDurationMs: number;
  transitionDurationMs: number;
  theme: OverlayTheme;
  compact: boolean;
  position: OverlayPosition;
  style: GharsahOverlayStyle;
};

export type GharsahOverlayApiResponse = {
  settings: ResolvedGharsahOverlayDisplay;
  /** Plain host only — e.g. "gharsah.sa" in production, "localhost:3000" in dev. Never a protocol, never a path (never `/c/...`, never a campaign/donation URL). See data.ts. */
  hostUrl: string;
  /** The existing Gharsah tagline (see data.ts) — real copy already used elsewhere on the site, never invented here. */
  message: string;
};
