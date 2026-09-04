/**
 * Central date/time formatting helper — the one place a `Date` gets turned
 * into a display string anywhere in the app (public site + admin). Every
 * ad-hoc `toLocaleString("ar-SA")` / `toLocaleDateString("ar-SA")` /
 * `new Intl.DateTimeFormat("ar-SA")` call that used to be scattered across
 * the codebase defaulted to ICU's Arabic-Indic numbering system (٠١٢٣...)
 * for the plain "ar-SA" locale — every one of those call sites now goes
 * through this file instead. `AR_LATIN` appends the `-u-nu-latn` Unicode
 * locale extension, which keeps Arabic month/weekday names and RTL-correct
 * formatting but forces Western digits (0-9), per the site-wide "no
 * Arabic-Indic digits, anywhere" requirement. Never format a date with a
 * raw "ar-SA"/"ar" locale string anywhere else in the app — always go
 * through the helpers below.
 */
export const AR_LATIN = "ar-SA-u-nu-latn";
const EN = "en-US";

/** The admin area is Arabic-only (no locale switch there). Mirrors
 * `Date.prototype.toLocaleDateString` exactly (date only, no time) — use
 * this everywhere a call site used to be `toLocaleDateString("ar-SA")`. */
export function formatAdminDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleDateString(AR_LATIN, options);
}

/** Mirrors `Date.prototype.toLocaleString` exactly (date + time) — use this
 * everywhere a call site used to be `toLocaleString("ar-SA")`. */
export function formatAdminDateTime(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleString(AR_LATIN, options);
}

/** Public-site helper for anywhere a date is formatted in whichever locale
 * the visitor is currently browsing in (e.g. NewsItemCard). */
export function formatLocaleDate(value: string | number | Date, locale: "ar" | "en", options: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleString(locale === "ar" ? AR_LATIN : EN, options);
}
