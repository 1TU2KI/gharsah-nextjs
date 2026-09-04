import { get, run } from "./client";

export type PlatformConfig = {
  /** Matches the raw Arabic value stored on each campaign's `platform` field — the join key, not a display label. */
  value: string;
  labelAr: string;
  labelEn: string;
  homepageUrl: string;
  /** Path under /public, or null to fall back to the generic external-link icon. */
  logo: string | null;
};

const DEFAULT_PLATFORMS: PlatformConfig[] = [
  {
    value: "منصة إحسان",
    labelAr: "منصة إحسان",
    labelEn: "Ehsan Platform",
    homepageUrl: "https://ehsan.sa",
    logo: "/platforms/ehsan.svg",
  },
  {
    value: "دعوة القصبة",
    labelAr: "دعوة القصبة",
    labelEn: "Dawa Al-Qasba Platform",
    homepageUrl: "https://dawa-alqasba.sa",
    logo: "/platforms/dawa-alqasba.png",
  },
];

async function getRaw(key: string): Promise<string | undefined> {
  const row = await get<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value;
}

async function setRaw(key: string, value: string): Promise<void> {
  await run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [
    key,
    value,
  ]);
}

export async function getPlatforms(): Promise<PlatformConfig[]> {
  const raw = await getRaw("platforms");
  if (!raw) return DEFAULT_PLATFORMS;
  try {
    const parsed = JSON.parse(raw) as PlatformConfig[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PLATFORMS;
  } catch {
    return DEFAULT_PLATFORMS;
  }
}

export async function setPlatforms(platforms: PlatformConfig[]): Promise<void> {
  await setRaw("platforms", JSON.stringify(platforms));
}

export async function getDevBadgeVisible(): Promise<boolean> {
  const raw = await getRaw("dev_badge_visible");
  return raw === undefined ? true : raw === "1";
}

export async function setDevBadgeVisible(visible: boolean): Promise<void> {
  await setRaw("dev_badge_visible", visible ? "1" : "0");
}

/** null/empty = site is operating normally, not in maintenance. */
export async function getMaintenanceMessage(): Promise<string | null> {
  const raw = await getRaw("maintenance_message");
  return raw && raw.trim() ? raw : null;
}

export async function setMaintenanceMessage(message: string | null): Promise<void> {
  await setRaw("maintenance_message", message ?? "");
}

export async function getPublicContactEmail(): Promise<string | null> {
  const raw = await getRaw("public_contact_email");
  return raw && raw.trim() ? raw : null;
}

export async function setPublicContactEmail(email: string | null): Promise<void> {
  await setRaw("public_contact_email", email ?? "");
}

export async function getDefaultCampaignSort(): Promise<"order" | "newest"> {
  const raw = await getRaw("default_campaign_sort");
  return raw === "newest" ? "newest" : "order";
}

export async function setDefaultCampaignSort(sort: "order" | "newest"): Promise<void> {
  await setRaw("default_campaign_sort", sort);
}

export type OverlayPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";
export type OverlayTheme = "dark" | "light";

/**
 * Configuration for the OBS Browser Source overlay (`/overlay/near`, see
 * app/api/overlay/near/route.ts and app/overlay/near/page.tsx). One JSON
 * blob under a single `settings` key — same generic key/value table every
 * other setting in this file already uses, no schema migration needed.
 * These are DEFAULTS only: a streamer's own query-string overrides
 * (`?position=...`, `?theme=...`, etc. — see app/lib/overlay/queryParams.ts)
 * win over whatever's configured here for that specific Browser Source URL,
 * but the base permanent URL (no query string) always reflects whatever is
 * saved here — so changing a setting here updates every OBS instance still
 * pointed at the plain `/overlay/near` URL, without the streamer ever
 * needing to replace it.
 */
export type OverlaySettings = {
  enabled: boolean;
  /** How many near-completion campaigns feed the cycle — same ranking as the homepage, just a wider/narrower slice (see getAlmostThereCampaigns). */
  campaignCount: number;
  displayDurationMs: number;
  transitionDurationMs: number;
  /** How long the overlay hides itself between full cycles. */
  restDurationMs: number;
  showProgress: boolean;
  showRemaining: boolean;
  showShortLink: boolean;
  showLogo: boolean;
  position: OverlayPosition;
  theme: OverlayTheme;
  compact: boolean;
  /** Overrides the "اقتربت..." heading shown above the campaign title, if ever needed — empty means use the default. */
  titleText: string;
};

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  enabled: true,
  campaignCount: 3,
  displayDurationMs: 8000,
  transitionDurationMs: 500,
  restDurationMs: 45000,
  showProgress: true,
  showRemaining: true,
  showShortLink: true,
  showLogo: true,
  position: "top-right",
  theme: "dark",
  compact: false,
  titleText: "",
};

export async function getOverlaySettings(): Promise<OverlaySettings> {
  const raw = await getRaw("overlay_settings");
  if (!raw) return DEFAULT_OVERLAY_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<OverlaySettings>;
    // Merge over the defaults rather than trusting the stored blob whole —
    // safe if a future field is added to OverlaySettings after some settings
    // were already saved (old rows simply fall back to that field's default).
    return { ...DEFAULT_OVERLAY_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_OVERLAY_SETTINGS;
  }
}

export async function setOverlaySettings(settings: OverlaySettings): Promise<void> {
  await setRaw("overlay_settings", JSON.stringify(settings));
}
