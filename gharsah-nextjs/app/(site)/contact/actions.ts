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
export async function submitCampaignRequestAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const parsed = campaignRequestSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    relationshipType: formData.get("relationshipType"),
    campaignUrl: formData.get("campaignUrl"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "تحقق من الحقول المدخلة." };
  }

  createCampaignRequest({
    name: parsed.data.name,
    username: parsed.data.username,
    relationshipType: parsed.data.relationshipType,
    campaignUrl: parsed.data.campaignUrl,
    email: parsed.data.email || null,
    notes: parsed.data.notes || null,
  });

  // The submitted fields themselves already live in the requests table
  // (visible to the admin there) — this event only records that a
  // submission happened, for the time-series/conversion analytics, never a
  // second copy of the form contents.
  await trackEvent({ type: "campaign_request_submit", route: "/contact" });

  return { status: "success", message: null };
}

export async function submitContactMessageAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const parsed = contactMessageSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "تحقق من الحقول المدخلة." };
  }

  createContactMessage({
    name: parsed.data.name,
    email: parsed.data.email || null,
    message: parsed.data.message,
  });

  await trackEvent({ type: "contact_submit", route: "/contact" });

  return { status: "success", message: null };
}
