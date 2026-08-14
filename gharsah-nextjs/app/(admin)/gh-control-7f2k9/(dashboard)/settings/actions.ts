"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/app/lib/auth/guard";
import { logActivity } from "@/app/lib/db/activity";
import {
  setPlatforms,
  setDevBadgeVisible,
  setMaintenanceMessage,
  setPublicContactEmail,
  setDefaultCampaignSort,
  type PlatformConfig,
} from "@/app/lib/db/settings";
import { findAdminById, verifyAdminCredentials, updateAdminPassword, createAdmin, findAdminByUsername } from "@/app/lib/db/admins";
import { revalidatePublicCampaignPages } from "@/app/lib/admin/revalidate";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

const platformSchema = z.object({
  value: z.string().trim().min(1),
  labelAr: z.string().trim().min(1),
  labelEn: z.string().trim().min(1),
  homepageUrl: z.string().trim().url(),
  logo: z.string().trim().nullable(),
});

export type SettingsFormState = { message: string | null; error: string | null };

function refreshSettings() {
  revalidatePath(`${ADMIN_BASE_PATH}/settings`);
  revalidatePublicCampaignPages();
}

export async function updatePlatformsAction(platforms: PlatformConfig[]): Promise<{ error: string | null }> {
  const session = await requireAdminSession();

  const parsed = z.array(platformSchema).min(1, "يجب أن تبقى منصة واحدة على الأقل").safeParse(platforms);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  setPlatforms(parsed.data);
  logActivity({ action: "settings_updated", targetType: "settings", targetLabel: "platforms", adminUsername: session.username });
  refreshSettings();
  return { error: null };
}

export async function updateSiteSettingsAction(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const session = await requireAdminSession();

  setDevBadgeVisible(formData.get("devBadgeVisible") === "on");
  setMaintenanceMessage(String(formData.get("maintenanceMessage") ?? "").trim() || null);

  const contactEmailRaw = String(formData.get("contactEmail") ?? "").trim();
  if (contactEmailRaw && !z.string().email().safeParse(contactEmailRaw).success) {
    return { message: null, error: "بريد إلكتروني غير صحيح" };
  }
  setPublicContactEmail(contactEmailRaw || null);
  setDefaultCampaignSort(formData.get("defaultCampaignSort") === "newest" ? "newest" : "order");

  logActivity({ action: "settings_updated", targetType: "settings", targetLabel: "general", adminUsername: session.username });
  refreshSettings();
  return { message: "تم حفظ الإعدادات", error: null };
}

export async function changeOwnPasswordAction(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const session = await requireAdminSession();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    return { message: null, error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" };
  }
  if (newPassword !== confirmPassword) {
    return { message: null, error: "كلمتا المرور غير متطابقتين" };
  }

  const admin = findAdminById(session.sub);
  if (!admin || !verifyAdminCredentials(admin.username, currentPassword)) {
    return { message: null, error: "كلمة المرور الحالية غير صحيحة" };
  }

  updateAdminPassword(admin.id, newPassword);
  logActivity({
    action: "admin_password_changed",
    targetType: "admin",
    targetId: admin.id,
    targetLabel: admin.username,
    adminUsername: session.username,
  });
  return { message: "تم تغيير كلمة المرور بنجاح", error: null };
}

export async function createAdminAccountAction(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const session = await requireAdminSession();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) {
    return { message: null, error: "اسم المستخدم يجب أن يكون بين 3 و40 حرفًا إنجليزيًا/رقمًا" };
  }
  if (password.length < 8) {
    return { message: null, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" };
  }
  if (findAdminByUsername(username)) {
    return { message: null, error: "اسم المستخدم مستخدم بالفعل" };
  }

  const admin = createAdmin(username, password);
  logActivity({
    action: "admin_created",
    targetType: "admin",
    targetId: admin.id,
    targetLabel: admin.username,
    adminUsername: session.username,
  });
  refreshSettings();
  return { message: `تم إنشاء الحساب "${username}"`, error: null };
}
