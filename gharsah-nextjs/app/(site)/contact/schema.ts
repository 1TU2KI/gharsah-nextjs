import { z } from "zod";

/** Matches the exact fields already collected by the two forms in ContactForms.tsx — see the `name` attributes on each input. Field labels/placeholders stay in translations.ts; this only validates what's submitted. */
export const campaignRequestSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(200),
  username: z.string().trim().min(1, "اسم المستخدم مطلوب").max(120),
  relationshipType: z.string().trim().min(1, "الصلة مطلوبة").max(200),
  campaignUrl: z.string().trim().min(1, "رابط الحملة مطلوب").url("أدخل رابطًا صحيحًا"),
  email: z.string().trim().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(200),
  email: z.string().trim().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  message: z.string().trim().min(1, "الرسالة مطلوبة").max(4000),
});

export type SubmitState = { status: "idle" | "success" | "error"; message: string | null };

export const idleSubmitState: SubmitState = { status: "idle", message: null };
