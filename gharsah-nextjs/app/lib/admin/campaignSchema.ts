import { z } from "zod";

/**
 * Shared validation for the campaign create/edit forms — one schema used by
 * both the client form (inline field errors as the admin types) and the
 * server action (the actual authority; the client check is only a UX
 * nicety, never trusted on its own).
 *
 * Arabic-only by design: the admin never enters English here. `title`/
 * `description`/`memorialPrefix` are Arabic source text; their English
 * counterparts (`title_en` etc.) are generated automatically from this via
 * `app/lib/translate.ts` in the server action, never typed by hand — see
 * the actions.ts comment on `buildCampaignInput` for exactly where that
 * happens.
 *
 * `relationAr` ("العنوان الفرعي" in the form UI) was removed from admin
 * management at one point, then reinstated by request — same underlying
 * `relation_ar`/`relation_en` columns as before, editable again and
 * translated like title/description (see the actions.ts comment on
 * `buildCampaignInput`). Publicly it's combined with `@username` and the
 * memorial-prefix phrase into one line (see MemorialLine in
 * CampaignCard.tsx) — this field holds only its own piece of that line,
 * e.g. "عن ولد عم يوسف", never the username or the prefix.
 *
 * `memorialPrefixAr` is a controlled selection in the UI (a `<select>`,
 * not free text — see `MEMORIAL_PREFIX_OPTIONS` in memorialPrefixOptions.ts)
 * but validated loosely here (not a strict zod enum): editing an older
 * campaign whose stored phrase predates the controlled list (e.g.
 * "رحمها الله", used by most of the original seed data) must still be
 * submittable unchanged — CampaignForm.tsx injects that legacy value as an
 * extra option so it stays selected by default rather than silently
 * reverting to "no phrase" and wiping it on save. The `<select>` itself is
 * what actually restricts *new* choices to the controlled list; this only
 * guards against pathological input.
 *
 * `slug` intentionally restricted to what already works as a URL segment
 * under `/cases/active/[slug]` (see the public route) — letters/digits/
 * dashes only, so a bad slug can't produce a broken or confusing URL.
 */
export const campaignFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "الرابط الداخلي مطلوب")
    .max(80)
    .regex(/^[a-zA-Z0-9-]+$/, "يسمح فقط بحروف إنجليزية وأرقام وشرطات (-)"),
  platform: z.string().trim().min(1, "اختر منصة التبرع"),
  url: z
    .string()
    .trim()
    .min(1, "رابط الحملة الرسمي مطلوب")
    .url("أدخل رابطًا صحيحًا (يبدأ بـ https://)")
    .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
      message: "الرابط يجب أن يبدأ بـ http:// أو https://",
    }),
  username: z.string().trim().max(80).optional().or(z.literal("")),
  memorialPrefixAr: z.string().trim().max(80).optional().or(z.literal("")),
  relationAr: z.string().trim().max(200).optional().or(z.literal("")),
  titleAr: z.string().trim().min(1, "العنوان مطلوب").max(300),
  /** Set by CampaignForm.tsx (hidden input) whenever it populates titleAr — 'fetched' after a successful official-title fetch, 'manual' after the admin types/edits the field directly. Purely informational (see the column comment in client.ts); mirrors descriptionSource below. */
  titleSource: z.enum(["fetched", "manual"]).optional(),
  descriptionAr: z.string().trim().max(2000).optional().or(z.literal("")),
  /** Set by CampaignForm.tsx (hidden input) whenever it populates descriptionAr — 'fetched' after a successful official-description fetch, 'manual' after the admin types/edits the textarea directly. Purely informational (see the column comment in client.ts); never required, since it's meaningless when descriptionAr is empty. */
  descriptionSource: z.enum(["fetched", "manual"]).optional(),
  status: z.enum(["active", "completed"]),
  percent: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(100)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
});

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export type CampaignFormFieldErrors = Partial<Record<keyof CampaignFormValues, string>>;

export type CampaignFormState = {
  fieldErrors: CampaignFormFieldErrors;
  formError: string | null;
};

export const emptyCampaignFormState: CampaignFormState = { fieldErrors: {}, formError: null };
