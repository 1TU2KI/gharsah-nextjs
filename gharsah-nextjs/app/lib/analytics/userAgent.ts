/**
 * Deliberately tiny, regex-based `User-Agent` sniffing — NOT a fingerprinting
 * library. Only ever produces three coarse, non-identifying labels (device
 * category / browser / OS) that get stored on an analytics event; the raw
 * `User-Agent` string itself is never persisted. "Good enough for product
 * decisions" (per the brief), not device/browser detection accuracy for its
 * own sake — order of the checks matters (more specific engines first) since
 * many UAs contain multiple overlapping tokens (e.g. Edge's UA also contains
 * "Chrome").
 */
export type DeviceCategory = "mobile" | "tablet" | "desktop";

export function parseUserAgent(ua: string): { deviceCategory: DeviceCategory; browser: string; os: string } {
  return {
    deviceCategory: detectDevice(ua),
    browser: detectBrowser(ua),
    os: detectOs(ua),
  };
}

function detectDevice(ua: string): DeviceCategory {
  if (/iPad|Android(?!.*Mobile)|Tablet|Silk/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/CriOS/.test(ua)) return "Chrome"; // Chrome on iOS
  if (/FxiOS/.test(ua)) return "Firefox"; // Firefox on iOS
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "Safari";
  return "أخرى";
}

function detectOs(ua: string): string {
  if (/Windows/.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "أخرى";
}

/**
 * Defense-in-depth against the minority of bots that DO execute JavaScript
 * (headless crawlers, some search-engine rendering passes) — most simple
 * bots are already excluded for free, since tracking only fires from
 * client-side JS a non-rendering crawler never runs in the first place.
 */
export function isLikelyBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|headless|curl|wget|python-requests|scrapy|facebookexternalhit|preview/i.test(ua);
}
