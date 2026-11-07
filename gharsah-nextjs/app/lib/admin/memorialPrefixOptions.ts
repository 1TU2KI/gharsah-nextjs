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
 *
 * All three phrases use the direct form (رحمه/رحمها/رحمهم الله), never the
 * "ي"-prefixed one (يرحمه الله …) two of them used to carry — the direct
 * wording is the requested phrasing and matches the seed data, which was
 * already written that way. This is the ONLY place the choices are spelled,
 * so changing them here changes the admin `<select>`, its live preview and
 * the English resolution together; existing campaigns still holding an old
 * "ي"-prefixed value are untouched by it (CampaignForm.tsx keeps any stored
 * value that isn't in this list selectable as a legacy option, and
 * MEMORIAL_PREFIX_EN below still translates them) and need the separate,
 * explicitly-approved data correction to move over.
 */
export const MEMORIAL_PREFIX_OPTIONS = [
  { value: "", label: "بدون صيغة ترحم" },
  { value: "رحمهم الله", label: "رحمهم الله" },
  { value: "رحمها الله", label: "رحمها الله" },
  { value: "رحمه الله", label: "رحمه الله" },
] as const;

/**
 * Fixed English translation for each controlled phrase — resolved directly
 * here, NOT sent through the AI translator (app/lib/translate.ts). With
 * only three possible non-empty values, a static lookup is strictly more
 * reliable than an API call: instant, free, and can't come back wrong.
 *
 * The two "ي"-prefixed keys at the bottom are deliberately kept even though
 * they're no longer offered as choices above: campaigns created while they
 * were still options still hold them, and dropping them would make those
 * rows fall through to `resolveMemorialPrefixEn`'s "keep whatever English it
 * already had" branch — correct today, but silently reliant on a stored
 * value instead of resolving properly. They translate identically to their
 * direct counterparts, so no English text changes either way.
 */
export const MEMORIAL_PREFIX_EN: Record<string, string> = {
  "رحمهم الله": "may God have mercy on them",
  "رحمها الله": "may God have mercy on her",
  "رحمه الله": "may God have mercy on him",
  "يرحمهم الله": "may God have mercy on them",
  "يرحمها الله": "may God have mercy on her",
  "يرحمه الله": "may God have mercy on him",
};
