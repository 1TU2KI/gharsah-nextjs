import { resolveGharsahOverlayDisplay } from "./queryParams";
import type { GharsahOverlayApiResponse } from "./types";

/**
 * Same words as the homepage hero's two-line title (see translations.ts
 * `hero.titleLine1`/`titleLine2`: "صَدَقَةٌ تُهْدَى... وَأَجْرٌ" +
 * "لَا يَنقَطِعُ") — real, already-published Gharsah messaging, not new
 * copy — just without that heading's decorative kashida (ـ) stretching,
 * which only makes sense at hero scale, not inside a compact 320px overlay
 * card. Never sourced from the news/updates feed (explicitly out of scope
 * for this overlay type, per the brief) and never a database read — this
 * message is static brand copy, not dynamic content.
 */
const GHARSAH_TAGLINE = "صَدَقَةٌ تُهْدَى... وَأَجْرٌ لَا يَنقَطِعُ";

/**
 * Mirrors buildOverlayResponse()'s exact shape/signature (searchParams +
 * origin in, one response out) — used by both `/overlay/gharsah`'s first
 * server-rendered frame and `/api/overlay/gharsah`'s every poll, one
 * implementation, never duplicated. Unlike the campaign overlay, there's no
 * DB read at all: nothing here is dynamic campaign data, so there's nothing
 * to look up. `hostUrl` is the plain site host only (e.g. "gharsah.sa" in
 * production, "localhost:3000" in dev) — derived from the request's own
 * origin as usual, never a hardcoded domain — deliberately never a path or
 * protocol, since the Gharsah Overlay card must show the ROOT site address,
 * never `/c/...`, a campaign URL, or a donation URL.
 */
export async function buildGharsahOverlayResponse(searchParams: URLSearchParams, origin: string): Promise<GharsahOverlayApiResponse> {
  const settings = resolveGharsahOverlayDisplay(searchParams);
  return {
    settings,
    hostUrl: new URL(origin).host,
    message: GHARSAH_TAGLINE,
  };
}
