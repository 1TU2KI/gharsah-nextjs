/**
 * Shared, pure HTML-parsing helpers for reading data out of an Ehsan
 * campaign page — no fetching, no caching, no admin/auth concerns, just
 * string parsing. Used by two independent callers with different needs:
 *
 * - `campaignLiveSync.ts` — the public site's hourly-revalidated live
 *   overlay (title/description/percent/status), unchanged by this file's
 *   existence; it used to define these two functions locally.
 * - `app/lib/admin/fetchOfficialCampaignContent.ts` — the admin dashboard's
 *   on-demand "fetch the official title/description now" action.
 *
 * Extracted here specifically so neither has to duplicate the extraction
 * regexes/entity-decoding.
 */

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function extractMetaContent(html: string, property: string): string | null {
  const tag = html.match(new RegExp(`<meta[^>]*property="${property}"[^>]*>`, "i"))?.[0];
  if (!tag) return null;
  const content = tag.match(/content="([^"]*)"/i)?.[1];
  return content ? decodeHtmlEntities(content) : null;
}
