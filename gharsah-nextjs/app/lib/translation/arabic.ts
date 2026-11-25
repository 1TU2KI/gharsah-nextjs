/**
 * Pure text helpers shared by the translator, the admin and the public
 * fallbacks. No server-only imports — safe anywhere.
 */

/** Any Arabic-script letter (incl. presentation forms). */
export const ARABIC_LETTERS = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/u;

const DIACRITICS = /[ً-ٰٟۖ-ۭ]/g;
const INVISIBLE = /[​-‏؜⁦-⁩﻿]/g;

/** Light cleanup that keeps the text readable (used before machine translation). */
export function cleanArabic(text: string): string {
  return text.normalize("NFKC").replace(INVISIBLE, "").replace(DIACRITICS, "").replace(/ـ/g, "").replace(/\s+/g, " ").trim();
}

/** Spelling-insensitive form used for matching and change detection: ة/ه, ى/ي and the alef forms are unified. */
export function normalizeArabic(text: string): string {
  return cleanArabic(text).replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
}

/** A URL or bare web address (e.g. "https://ehsan.sa/campaign/…", "ehsan.sa/…"). */
export function looksLikeUrl(text: string): boolean {
  const value = text.trim();
  return /^(https?:\/\/|www\.)\S+$/i.test(value) || /^[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i.test(value);
}

/** Usable as English on the public site: non-empty, no Arabic letters, not a URL. */
export function isValidEnglish(text: string | null | undefined): text is string {
  return Boolean(text && text.trim() && !ARABIC_LETTERS.test(text) && !looksLikeUrl(text));
}

/** Short stable fingerprint of the normalized Arabic (cyrb53) — detects "the Arabic changed". */
export function sourceHash(arabic: string): string {
  const str = normalizeArabic(arabic);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

/** Neutral English title used when no valid English exists yet — never Arabic. */
export function fallbackEnglishTitle(titleAr: string): string {
  return /^صدقه\s+جاريه/.test(normalizeArabic(titleAr)) ? "Ongoing Charity" : "Charity Campaign";
}
