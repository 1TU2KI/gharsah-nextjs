/**
 * The controlled vocabulary for the "صيغة الترحّم" field — a `<select>` in
 * the admin form, not free text (see campaignSchema.ts's doc comment for
 * why validation stays loose server-side despite that). Shared between
 * CampaignForm.tsx (renders the options + live preview) and the campaigns
 * server action (resolves the English translation) so there's exactly one
 * place these four choices and their English forms are defined.
 *
 * Empty string is the real stored value for "no phrase at all" — never the
 * literal Arabic label "بدون صيغة ترحم" — matching how `memorialPrefixAr`
 * already worked before this became a select (empty/absent means "omit the
 * whole phrase," see rowToCampaign/CampaignCard's `memorialPrefix &&` guard).
 */
export const MEMORIAL_PREFIX_OPTIONS = [
  { value: "", label: "بدون صيغة ترحم" },
  { value: "يرحمهم الله", label: "يرحمهم الله" },
  { value: "يرحمها الله", label: "يرحمها الله" },
  { value: "رحمه الله", label: "رحمه الله" },
] as const;

/**
 * Fixed English translation for each controlled phrase — resolved directly
 * here, NOT sent through the AI translator (app/lib/translate.ts). With
 * only three possible non-empty values, a static lookup is strictly more
 * reliable than an API call: instant, free, and can't come back wrong.
 */
export const MEMORIAL_PREFIX_EN: Record<string, string> = {
  "يرحمهم الله": "may God have mercy on them",
  "يرحمها الله": "may God have mercy on her",
  "رحمه الله": "may God have mercy on him",
};
