/**
 * Buckets a raw `document.referrer` (sent by the client, see track.ts) into
 * one of a small, fixed set of source labels — the raw URL itself is never
 * stored, only this label, per the "no unnecessary personal information"
 * requirement (a full referrer URL can leak query strings/search terms).
 */
const HOST_BUCKETS: [pattern: RegExp, label: string][] = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\./, "bing"],
  [/(^|\.)duckduckgo\./, "duckduckgo"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "twitter_x"],
  [/(^|\.)discord(app)?\.com$/, "discord"],
  [/(^|\.)facebook\.com$/, "facebook"],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, "whatsapp"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
  [/(^|\.)telegram\.(org|me)$/, "telegram"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)youtube\.com$/, "youtube"],
];

/** `siteHost` is the current request's own hostname (from the `Host` header — always present, unlike `Origin`) so an internal referrer can be recognized without needing a configured canonical site URL. */
export function bucketReferrer(referrer: string | null | undefined, siteHost?: string | null): string {
  if (!referrer) return "direct";
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return "other";
  }
  const host = url.hostname.replace(/^www\./, "");
  // Same-host "referrer" just means an internal client-side navigation
  // happened to carry document.referrer along — it says nothing about how
  // the visitor actually arrived at the site, so it isn't a real source.
  if (siteHost && host === siteHost.replace(/^www\./, "").replace(/:\d+$/, "")) return "internal";
  for (const [pattern, label] of HOST_BUCKETS) {
    if (pattern.test(host)) return label;
  }
  return "other";
}
