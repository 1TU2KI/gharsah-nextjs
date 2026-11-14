"use server";

import { getActiveCampaignsLive } from "@/app/lib/campaignLiveSync";
import {
  CUSTOM_NEAR_PROTOTYPE,
  createPage,
  customNearInputSchema,
  getPageByEditToken,
  updatePageByEditToken,
  type CustomNearPage,
} from "@/app/lib/customNear/store";

/**
 * «اصنع صفحتك» server actions (local prototype — see customNear/store.ts).
 * Every write is validated HERE, never trusted from the form: title and
 * description limits, 1–3 distinct campaigns, and every campaign must be
 * one of the CURRENT public active campaigns. Edit tokens arrive only as an
 * argument (the client reads them from the URL fragment), are never logged
 * or tracked, and are never returned by anything except `create`.
 */
export type CustomNearResult =
  | { status: "success"; viewId: string; editToken?: string }
  | { status: "error"; message: string };

async function validate(raw: unknown): Promise<{ ok: true; data: ReturnType<typeof customNearInputSchema.parse> } | { ok: false; message: string }> {
  const parsed = customNearInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "تحقق من البيانات المدخلة." };
  const publicSlugs = new Set((await getActiveCampaignsLive()).map((c) => c.slug));
  if (!parsed.data.campaignSlugs.every((s) => publicSlugs.has(s))) {
    return { ok: false, message: "إحدى الحالات المختارة لم تعد متاحة للعرض. حدّث الصفحة واختر من الحالات الحالية." };
  }
  return { ok: true, data: parsed.data };
}

const DISABLED: CustomNearResult = { status: "error", message: "هذه الميزة غير متاحة حاليًا." };

export async function createCustomNearPage(raw: unknown): Promise<CustomNearResult> {
  if (!CUSTOM_NEAR_PROTOTYPE) return DISABLED;
  const v = await validate(raw);
  if (!v.ok) return { status: "error", message: v.message };
  const { page, editToken } = createPage(v.data);
  return { status: "success", viewId: page.id, editToken };
}

export async function loadCustomNearPageForEdit(token: unknown): Promise<CustomNearPage | null> {
  if (!CUSTOM_NEAR_PROTOTYPE || typeof token !== "string") return null;
  return getPageByEditToken(token);
}

export async function updateCustomNearPage(token: unknown, raw: unknown): Promise<CustomNearResult> {
  if (!CUSTOM_NEAR_PROTOTYPE) return DISABLED;
  if (typeof token !== "string" || !getPageByEditToken(token)) {
    return { status: "error", message: "رابط التعديل غير صالح." };
  }
  const v = await validate(raw);
  if (!v.ok) return { status: "error", message: v.message };
  const page = updatePageByEditToken(token, v.data);
  return page ? { status: "success", viewId: page.id } : { status: "error", message: "رابط التعديل غير صالح." };
}
