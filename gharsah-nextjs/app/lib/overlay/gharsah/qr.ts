/**
 * Gharsah Overlay "كيو آر كود" (QR Code) style — the ONE place a QR's
 * destination is decided, shared by the OBS output (server, data.ts) and
 * the /overlay page's live preview (client), so the two can never disagree.
 *
 * Always the live public domain, never the request's own origin: a QR shown
 * on stream is scanned by viewers' phones, so a `localhost` (or preview
 * deployment) address would be useless to them.
 */
export const GHARSAH_PUBLIC_ORIGIN = "https://gharsah.sa";

/** "campaign" = one public campaign, "site" = the homepage, "near" = the main اقتربت... page. */
export type GharsahQrTarget = "campaign" | "site" | "near";

export const GHARSAH_QR_TARGETS = ["campaign", "site", "near"] as const satisfies readonly GharsahQrTarget[];

/** Campaign slugs are lowercase/digits/hyphens; anything else in `?c=` is ignored. */
export const GHARSAH_QR_SLUG_PATTERN = /^[a-z0-9-]{1,120}$/i;

/**
 * The exact text encoded in the QR. A campaign uses its short Gharsah link
 * (`/c/<code>`, which redirects to the campaign page) and falls back to the
 * public campaign page itself when it has no short code. `null` when a
 * campaign target has no (or no longer public) campaign — the overlay then
 * shows nothing rather than a code to the wrong place.
 */
export function gharsahQrValue(
  target: GharsahQrTarget,
  campaign?: { slug: string; shortCode?: string | null } | null,
): string | null {
  if (target === "site") return `${GHARSAH_PUBLIC_ORIGIN}/`;
  if (target === "near") return `${GHARSAH_PUBLIC_ORIGIN}/near`;
  if (!campaign) return null;
  return campaign.shortCode
    ? `${GHARSAH_PUBLIC_ORIGIN}/c/${encodeURIComponent(campaign.shortCode)}`
    : `${GHARSAH_PUBLIC_ORIGIN}/cases/active/${encodeURIComponent(campaign.slug)}`;
}
