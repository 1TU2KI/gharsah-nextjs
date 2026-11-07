"use server";

import { createCampaignRequest } from "@/app/lib/db/requests";
import { createContactMessage } from "@/app/lib/db/messages";
import { campaignRequestSchema, contactMessageSchema, type SubmitState } from "./schema";
import { trackEvent } from "@/app/lib/analytics/trackAction";

/**
 * The two public forms in ContactForms.tsx used to just call
 * `e.preventDefault()` and show a static "this is still being set up"
 * notice — see CLAUDE.md's own note on that. These actions are what makes
 * them real: every submission lands in the database and shows up in the
 * admin Requests/Messages inbox. Deliberately does NOT touch the activity
 * log — that's reserved for admin decisions on a submission (accepted/
 * rejected/etc.), not the public act of submitting one.
 */
/**
 * Local testing only: with GHARSAH_FORMS_DRY_RUN=1 in .env.local (never in
 * production — NODE_ENV guard), submissions are fully validated and get the
 * normal success response, but nothing is written to the database or the
 * analytics events. Lets the confirmation screens be tested with mock data.
 */
const isDryRun = () => process.env.NODE_ENV !== "production" && process.env.GHARSAH_FORMS_DRY_RUN === "1";

function formValues(formData: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

/**
 * The form's explicit «هل الحالة عن متوفى؟» choice (`memorial`: "" | "male" |
 * "female") decides the condolence line — never guessed from free text. It
 * travels with the submission and comes back in the success state, so the
 * form's post-action reset can't lose it. No separate DB column: the matching
 * memorial phrase (the admin's own vocabulary, memorialPrefixOptions.ts) is
 * appended to the stored relationship text so the admin inbox shows it too.
 */
const MEMORIAL_PHRASE = { male: "رحمه الله", female: "رحمها الله" } as const;

export async function submitCampaignRequestAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const values = formValues(formData, ["name", "username", "relationshipType", "memorial", "campaignUrl", "email", "notes"]);
  const parsed = campaignRequestSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: (parsed.error.issues[0]?.message ?? "تحقق من الحقول المدخلة.") + (isDryRun() ? " [dry-run]" : ""), values };
  }

  const memorial = parsed.data.memorial || null;
  const success: SubmitState = {
    status: "success",
    message: null,
    preview: parsed.data.notes || null,
    condolence: memorial,
  };
  if (isDryRun()) return success;

  await createCampaignRequest({
    name: parsed.data.name,
    username: parsed.data.username,
    relationshipType: memorial
      ? `${parsed.data.relationshipType} — ${MEMORIAL_PHRASE[memorial]}`
      : parsed.data.relationshipType,
    campaignUrl: parsed.data.campaignUrl,
    email: parsed.data.email || null,
    notes: parsed.data.notes || null,
  });

  // The submitted fields themselves already live in the requests table
  // (visible to the admin there) — this event only records that a
  // submission happened, for the time-series/conversion analytics, never a
  // second copy of the form contents.
  await trackEvent({ type: "campaign_request_submit", route: "/contact" });

  return success;
}

export async function submitContactMessageAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const values = formValues(formData, ["name", "email", "message"]);
  const parsed = contactMessageSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: (parsed.error.issues[0]?.message ?? "تحقق من الحقول المدخلة.") + (isDryRun() ? " [dry-run]" : ""), values };
  }

  const success: SubmitState = { status: "success", message: null, preview: parsed.data.message };
  if (isDryRun()) return success;

  await createContactMessage({
    name: parsed.data.name,
    email: parsed.data.email || null,
    message: parsed.data.message,
  });

  await trackEvent({ type: "contact_submit", route: "/contact" });

  return success;
}
