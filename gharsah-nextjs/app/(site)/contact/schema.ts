import { z } from "zod";

/** Matches the exact fields already collected by the two forms in ContactForms.tsx — see the `name` attributes on each input. Field labels/placeholders stay in translations.ts; this only validates what's submitted. */
export const campaignRequestSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(200),
  username: z.string().trim().min(1, "اسم المستخدم مطلوب").max(120),
  relationshipType: z.string().trim().min(1, "الصلة مطلوبة").max(200),
  /** Explicit choice: is the request on behalf of a deceased man/woman? Drives the condolence line. */
  memorial: z.enum(["", "male", "female"]).optional(),
  campaignUrl: z.string().trim().min(1, "رابط الحملة مطلوب").url("أدخل رابطًا صحيحًا"),
  email: z.string().trim().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(200),
  email: z.string().trim().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  message: z.string().trim().min(1, "الرسالة مطلوبة").max(4000),
});

export type SubmitState = {
  status: "idle" | "success" | "error";
  message: string | null;
  /** Error only: what the visitor typed, restored into the fields (React resets the form after every action). */
  values?: Record<string, string>;
  /** Success only: the submitted message/notes for the read-only preview (never contact details). Lives only in this page's memory. */
  preview?: string | null;
  /** Success only (campaign requests): condolence wording when the visitor explicitly wrote that the campaign is for a deceased person. */
  condolence?: "male" | "female" | null;
};

export const idleSubmitState: SubmitState = { status: "idle", message: null };
