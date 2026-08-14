"use server";

import { requireAdminSession } from "../auth/guard";
import { extractMetaContent } from "../ehsanParse";

/**
 * On-demand admin action: "fetch the official title/description now,"
 * triggered from the campaign form (either field's own button, or once
 * automatically on create — see CampaignForm.tsx). Deliberately separate
 * from campaignLiveSync.ts's hourly-revalidated PUBLIC overlay:
 *
 * - Always a fresh fetch (`cache: "no-store"`) — an admin who explicitly
 *   asks for the current title/description wants it now, not a possibly
 *   hour-old cached copy.
 * - Only ever touches the admin's own draft form state; never writes to
 *   the database itself (the campaign save action does that, once the
 *   admin has reviewed/edited the result and clicked Save).
 *
 * One fetch of the campaign page serves BOTH fields — title (`og:title`)
 * and description (`og:description`) live in the same response, so there's
 * no reason for the two admin-facing buttons to each cost their own round
 * trip when both are used together (e.g. the auto-fetch-on-create effect).
 * Either field is allowed to come back `null` on its own (present in the
 * page but the other tag missing) without failing the whole fetch — only a
 * request-level failure (network, non-2xx, wrong domain, neither tag found
 * at all) is a hard failure.
 *
 * Only Ehsan is supported today (the only platform with a verified,
 * reliable extraction anchor — see CLAUDE.md's investigation notes on
 * Dawa Al-Qasba returning almost nothing usable). Structured so adding a
 * second platform later is a matter of another `if (hostname...)` branch,
 * not a rewrite — callers already treat "unsupported platform" as a normal,
 * non-fatal outcome with manual entry as the fallback, exactly as a new
 * platform without an extractor yet would need too.
 */
export type FetchOfficialContentResult =
  | { ok: true; title: string | null; description: string | null }
  | { ok: false; reason: "unsupported-platform" | "fetch-failed" | "not-found" | "invalid-url"; message: string };

export async function fetchOfficialCampaignContentAction(url: string): Promise<FetchOfficialContentResult> {
  await requireAdminSession();

  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "invalid-url", message: "أدخل رابط الحملة الرسمي أولًا (رابط غير صالح)." };
  }

  const hostname = parsed.hostname.replace(/^www\./, "");
  if (!hostname.includes("ehsan.sa")) {
    return {
      ok: false,
      reason: "unsupported-platform",
      message: "الجلب التلقائي متاح حاليًا لمنصة إحسان فقط — أدخل البيانات الرسمية يدويًا لهذه المنصة.",
    };
  }

  try {
    const response = await fetch(trimmed, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GharsahAdminFetch/1.0)" },
    });

    if (!response.ok) {
      return { ok: false, reason: "fetch-failed", message: `تعذّر الوصول إلى صفحة الحملة على إحسان (${response.status}).` };
    }

    // The fetched page must actually still be on Ehsan's own domain — a
    // redirect off-domain would mean this isn't really the campaign page
    // anymore, so its content shouldn't be trusted as "official" for the
    // URL the admin supplied.
    const finalHost = new URL(response.url).hostname.replace(/^www\./, "");
    if (!finalHost.includes("ehsan.sa")) {
      return { ok: false, reason: "fetch-failed", message: "أعاد الرابط التوجيه إلى نطاق مختلف — تعذّر التحقق من صفحة الحملة." };
    }

    const html = await response.text();
    const title = extractMetaContent(html, "og:title");
    const description = extractMetaContent(html, "og:description");
    if (!title && !description) {
      return { ok: false, reason: "not-found", message: "لم يتم العثور على عنوان أو وصف رسمي في صفحة الحملة على إحسان." };
    }

    return { ok: true, title, description };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: "fetch-failed", message: `تعذّر الاتصال بمنصة إحسان: ${message}` };
  }
}
