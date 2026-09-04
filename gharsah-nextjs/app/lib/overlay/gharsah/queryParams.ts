import { parseIntervalMinutesParam, parseEnumParam } from "../queryParams";
import type { ResolvedGharsahOverlayDisplay, GharsahOverlayStyle } from "./types";
import {
  GHARSAH_OVERLAY_DEFAULT_INTERVAL_MINUTES,
  GHARSAH_OVERLAY_DISPLAY_DURATION_MS,
  GHARSAH_OVERLAY_TRANSITION_DURATION_MS,
  GHARSAH_OVERLAY_THEME,
  GHARSAH_OVERLAY_POSITION,
  GHARSAH_OVERLAY_COMPACT,
  GHARSAH_OVERLAY_DEFAULT_STYLE,
} from "./defaults";

const STYLE_VALUES = ["brand", "logo"] as const satisfies readonly GharsahOverlayStyle[];

/**
 * Gharsah Overlay's configurable dimensions are timing and, now, style —
 * timing reuses the EXACT SAME `?interval=` validation
 * (`parseIntervalMinutesParam`, exported from the Campaign Overlay resolver
 * in ../queryParams.ts) so both overlay types agree on what a valid interval
 * looks like, never a second parser; style reuses that same file's
 * `parseEnumParam` the same way. Everything else (theme/position/compact/
 * display+transition duration) is a fixed constant from defaults.ts, not
 * query-overridable — there's no UI exposing them and none was requested, so
 * this keeps Gharsah Overlay's actual configurable surface honest and small.
 */
export function resolveGharsahOverlayDisplay(searchParams: URLSearchParams): ResolvedGharsahOverlayDisplay {
  return {
    intervalMinutes: parseIntervalMinutesParam(searchParams.get("interval")) ?? GHARSAH_OVERLAY_DEFAULT_INTERVAL_MINUTES,
    displayDurationMs: GHARSAH_OVERLAY_DISPLAY_DURATION_MS,
    transitionDurationMs: GHARSAH_OVERLAY_TRANSITION_DURATION_MS,
    theme: GHARSAH_OVERLAY_THEME,
    compact: GHARSAH_OVERLAY_COMPACT,
    position: GHARSAH_OVERLAY_POSITION,
    style: parseEnumParam(searchParams.get("style"), STYLE_VALUES) ?? GHARSAH_OVERLAY_DEFAULT_STYLE,
  };
}
