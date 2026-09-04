import type { OverlayMode } from "./queryParams";

/**
 * Gharsah's one recommended/default public overlay configuration — the
 * single source of truth for "what happens when nothing is specified",
 * shared by:
 *  - `resolveOverlayDisplay()` (queryParams.ts), so ANY URL with no
 *    `?mode=`/`?interval=` — including the bare `/overlay/near` pasted
 *    directly into OBS — resolves to exactly this combination, not the old
 *    admin-configured display/rest cycling;
 *  - `OverlayPromoSection.tsx`'s public `/overlay` config page, so its mode
 *    selector and interval slider start already set to this same
 *    combination (with the "موصى به" badge on both) instead of a second,
 *    independently-chosen starting value.
 *
 * Never redefine "near"/25 as a literal in either of those places — import
 * from here so the config page, the real overlay, and the API can never
 * silently disagree about what the default actually is.
 */
export const OVERLAY_DEFAULT_MODE: OverlayMode = "near";
export const OVERLAY_DEFAULT_INTERVAL_MINUTES = 25;
