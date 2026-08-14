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
