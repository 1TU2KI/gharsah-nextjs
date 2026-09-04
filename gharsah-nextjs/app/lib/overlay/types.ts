import type { ResolvedOverlayDisplay } from "./queryParams";

/**
 * One campaign as the overlay actually needs it — already resolved to
 * plain display strings (a single locale, a real absolute short URL) so
 * neither OverlayCard nor OverlayClient need to know anything about
 * `Campaign`'s full shape, `LocalizedText`, or how short links are built.
 */
export type OverlayCampaign = {
  id: string;
  title: string;
  /** Relation/memorial line, already resolved to one plain string (e.g. "عن فلان رحمه الله") — empty string if the campaign has none. */
  subtitle: string;
  percent: number;
  remaining: number;
  /** Absolute, e.g. "gharsah.sa/c/A7K2" — never a long internal URL. */
  shortUrl: string;
  platformLabel: string;
};

export type OverlayApiResponse = {
  campaigns: OverlayCampaign[];
  settings: ResolvedOverlayDisplay;
};

/**
 * One entry in the public "اختيار حالات محددة" campaign picker on
 * `/overlay` — just enough to search/identify a campaign (slug is the
 * stable public identifier used in `?campaigns=`, never the internal id).
 */
export type PickableCampaign = {
  slug: string;
  title: string;
  subtitle: string;
};
