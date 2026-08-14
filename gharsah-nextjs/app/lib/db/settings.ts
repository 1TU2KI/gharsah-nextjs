import { db } from "./client";

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

function getRaw(key: string): string | undefined {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

function setRaw(key: string, value: string): void {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
    key,
    value,
  );
}

export function getPlatforms(): PlatformConfig[] {
  const raw = getRaw("platforms");
  if (!raw) return DEFAULT_PLATFORMS;
  try {
    const parsed = JSON.parse(raw) as PlatformConfig[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PLATFORMS;
  } catch {
    return DEFAULT_PLATFORMS;
  }
}

export function setPlatforms(platforms: PlatformConfig[]): void {
  setRaw("platforms", JSON.stringify(platforms));
}

export function getDevBadgeVisible(): boolean {
  const raw = getRaw("dev_badge_visible");
  return raw === undefined ? true : raw === "1";
}

export function setDevBadgeVisible(visible: boolean): void {
  setRaw("dev_badge_visible", visible ? "1" : "0");
}

/** null/empty = site is operating normally, not in maintenance. */
export function getMaintenanceMessage(): string | null {
  const raw = getRaw("maintenance_message");
  return raw && raw.trim() ? raw : null;
}

export function setMaintenanceMessage(message: string | null): void {
  setRaw("maintenance_message", message ?? "");
}

export function getPublicContactEmail(): string | null {
  const raw = getRaw("public_contact_email");
  return raw && raw.trim() ? raw : null;
}

export function setPublicContactEmail(email: string | null): void {
  setRaw("public_contact_email", email ?? "");
}

export function getDefaultCampaignSort(): "order" | "newest" {
  const raw = getRaw("default_campaign_sort");
  return raw === "newest" ? "newest" : "order";
}

export function setDefaultCampaignSort(sort: "order" | "newest"): void {
  setRaw("default_campaign_sort", sort);
}
