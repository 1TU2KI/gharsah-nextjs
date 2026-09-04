import type { OverlaySettings, OverlayPosition, OverlayTheme } from "../db/settings";
import { OVERLAY_DEFAULT_MODE, OVERLAY_DEFAULT_INTERVAL_MINUTES } from "./defaults";

const POSITION_VALUES = ["top-right", "top-left", "bottom-right", "bottom-left"] as const satisfies readonly OverlayPosition[];
const THEME_VALUES = ["dark", "light"] as const satisfies readonly OverlayTheme[];
const LANG_VALUES = ["ar", "en"] as const;
const MODE_VALUES = ["near", "selected", "all", "lowest"] as const;

export type OverlayLang = (typeof LANG_VALUES)[number];
/** What campaigns the overlay shows — see resolveCampaigns.ts for what each actually resolves to. `near` is the default (same "اقتربت..." ranking as before this feature existed). */
export type OverlayMode = (typeof MODE_VALUES)[number];

const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 60;
/** Generous but not unbounded — a streamer manually picking campaigns has no real reason to need more than this in one overlay; guards against a pathological query string, never a normal use case. */
const MAX_SELECTED_CAMPAIGNS = 30;

/**
 * Everything OverlayCard/OverlayClient need to actually render one frame —
 * the admin's saved defaults with a streamer's own query-string overrides
 * applied on top. `intervalMinutes` is deliberately NOT part of
 * `OverlaySettings` (the persisted admin-configurable shape in
 * db/settings.ts) — it only ever comes from a per-URL `?interval=` query
 * override (see the public /near page's "إعداد الأوفرلاي" slider) or, when
 * that's absent, Gharsah's own recommended default (see defaults.ts) —
 * never saved anywhere, so it can never change what any OTHER overlay
 * URL/the admin's persisted OverlaySettings does. Effectively never `null`
 * coming out of `resolveOverlayDisplay()` below (the type stays nullable
 * only as a defensive fallback for any other caller that might ever build
 * this shape directly).
 */
export type ResolvedOverlayDisplay = OverlaySettings & {
  lang: OverlayLang;
  intervalMinutes: number | null;
  /** Which campaigns to show — see resolveCampaigns.ts. Defaults to Gharsah's recommended "near" (see defaults.ts) for any URL without `?mode=`. */
  mode: OverlayMode;
  /** Slugs from `?campaigns=a,b,c` — only meaningful when `mode === "selected"`, ignored otherwise. Not yet validated against real campaigns here (that happens in resolveCampaigns.ts, which needs a DB read this pure query-parsing function doesn't do); this is just "what the URL asked for," syntactically well-formed. */
  selectedSlugs: string[];
};

/**
 * Applies a streamer's own `?position=`/`?theme=`/`?interval=`/etc.
 * overrides on top of the admin-configured defaults. Every param is
 * optional; anything missing or not one of the known values falls straight
 * back to a default rather than erroring — "validate query parameters and
 * use safe defaults," never a broken overlay from a mistyped URL. `mode`
 * and `intervalMinutes` specifically fall back to Gharsah's own recommended
 * combination (see defaults.ts) rather than the admin's persisted
 * `OverlaySettings` — this is what makes the bare `/overlay/near` (no query
 * string at all, e.g. pasted straight into an OBS Browser Source) behave
 * exactly like `/overlay/near?mode=near&interval=25`, per priority:
 * 1) a valid query param always wins, 2) otherwise this Gharsah default
 * applies. Shared by both the public overlay page and `/api/overlay/near`
 * so the two can never resolve a given URL differently from each other.
 */
export function resolveOverlayDisplay(searchParams: URLSearchParams, defaults: OverlaySettings): ResolvedOverlayDisplay {
  return {
    ...defaults,
    position: parseEnumParam(searchParams.get("position"), POSITION_VALUES) ?? defaults.position,
    theme: parseEnumParam(searchParams.get("theme"), THEME_VALUES) ?? defaults.theme,
    compact: parseBooleanParam(searchParams.get("compact")) ?? defaults.compact,
    showProgress: parseBooleanParam(searchParams.get("showProgress")) ?? defaults.showProgress,
    showShortLink: parseBooleanParam(searchParams.get("showLink")) ?? defaults.showShortLink,
    lang: parseEnumParam(searchParams.get("lang"), LANG_VALUES) ?? "ar",
    intervalMinutes: parseIntervalMinutesParam(searchParams.get("interval")) ?? OVERLAY_DEFAULT_INTERVAL_MINUTES,
    mode: parseEnumParam(searchParams.get("mode"), MODE_VALUES) ?? OVERLAY_DEFAULT_MODE,
    selectedSlugs: parseSlugsParam(searchParams.get("campaigns")),
  };
}

/**
 * `?campaigns=a,b,c` — a comma-separated list of campaign slugs (the same
 * stable, already-public identifier `/cases/active/<slug>` uses; never the
 * internal DB id, which this project never puts in a URL). Only a syntax
 * check here (safe slug charset, a sane count cap) — whether each slug
 * actually matches a real, public campaign is resolveCampaigns.ts's job,
 * which needs a DB read this function deliberately doesn't do. Malformed
 * entries are dropped silently, never trusted as-is.
 */
function parseSlugsParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-zA-Z0-9-]+$/.test(s))
    .slice(0, MAX_SELECTED_CAMPAIGNS);
}

/**
 * Strict validation, per the brief: below 1, above 60, non-integer,
 * unparsable, or missing all fall back to `null` ("not set" — the normal
 * admin default applies) rather than being clamped to the nearest bound.
 * Never trusts the raw query string. Exported so Gharsah Overlay's own
 * resolver (app/lib/overlay/gharsah/queryParams.ts) reuses this exact same
 * validation for its own `?interval=` — never a second, possibly
 * inconsistent parser for the same 1–60 minute concept.
 */
export function parseIntervalMinutesParam(raw: string | null): number | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  const minutes = Number(raw);
  if (!Number.isInteger(minutes) || minutes < MIN_INTERVAL_MINUTES || minutes > MAX_INTERVAL_MINUTES) return null;
  return minutes;
}

/** Exported for the same reason as parseIntervalMinutesParam above — Gharsah Overlay's own resolver reuses this exact validation for its `?style=` param, never a second enum parser. */
export function parseEnumParam<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  if (!raw) return null;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

function parseBooleanParam(raw: string | null): boolean | null {
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return null;
}
