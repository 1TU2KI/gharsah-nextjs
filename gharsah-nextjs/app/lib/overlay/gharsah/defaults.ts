import type { OverlayPosition, OverlayTheme } from "@/app/lib/db/settings";
import type { GharsahOverlayStyle } from "./types";

/**
 * Gharsah Overlay's fixed defaults — deliberately its OWN module, never the
 * campaign overlay's admin-configurable `OverlaySettings` row (see
 * db/settings.ts). That independence is a hard requirement: if Gharsah
 * Overlay read the same admin row, an admin editing Campaign Overlay's
 * theme/position in the dashboard would silently change Gharsah Overlay's
 * defaults too. There is no admin UI for these (query-param-only, per the
 * approved plan) — `intervalMinutes` is the only one a streamer can ever
 * override via `?interval=`; the rest are fixed constants.
 */
export const GHARSAH_OVERLAY_DEFAULT_INTERVAL_MINUTES = 25;
/** Matches DEFAULT_OVERLAY_SETTINGS's own displayDurationMs/transitionDurationMs in db/settings.ts — same pacing feel, independently defined. */
export const GHARSAH_OVERLAY_DISPLAY_DURATION_MS = 8000;
export const GHARSAH_OVERLAY_TRANSITION_DURATION_MS = 500;
export const GHARSAH_OVERLAY_THEME: OverlayTheme = "dark";
export const GHARSAH_OVERLAY_POSITION: OverlayPosition = "top-right";
export const GHARSAH_OVERLAY_COMPACT = false;
/** "brand" (today's full card) stays the default — an existing copied URL with no `?style=` must keep behaving exactly as it always has. "logo" is opt-in only. */
export const GHARSAH_OVERLAY_DEFAULT_STYLE: GharsahOverlayStyle = "brand";
