import { z } from "zod";
import type { ManualNewsType } from "@/app/lib/db/newsRepo";

/**
 * Shared validation for the manual news create/edit form — same "one schema
 * for both the client form and the server action, the server action is the
 * real authority" convention as campaignSchema.ts. Only the 4 manual types
 * are selectable here; automatic campaign_added/campaign_completed rows are
 * never created or edited through this form (see newsRepo.ts). The literal
 * tuple below is checked against `ManualNewsType` via `satisfies` so it
 * can't silently drift out of sync with newsRepo.ts's own list.
 */
const MANUAL_NEWS_TYPE_TUPLE = ["urgent", "maintenance", "dev_update", "general"] as const satisfies readonly ManualNewsType[];

export const newsFormSchema = z.object({
  type: z.enum(MANUAL_NEWS_TYPE_TUPLE),
  titleAr: z.string().trim().max(200).optional().or(z.literal("")),
  bodyAr: z.string().trim().min(1, "نص التحديث مطلوب").max(4000),
  customUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\//.test(v), { message: "الرابط يجب أن يبدأ بـ http:// أو https://" }),
  published: z.boolean(),
});

export type NewsFormValues = z.infer<typeof newsFormSchema>;
export type NewsFormFieldErrors = Partial<Record<keyof NewsFormValues, string>>;
export type NewsFormState = { fieldErrors: NewsFormFieldErrors; formError: string | null };
export const emptyNewsFormState: NewsFormState = { fieldErrors: {}, formError: null };
