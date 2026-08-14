import type { ActivityAction } from "@/app/lib/db/activity";

/** Arabic display label for each ActivityAction — shared by the Overview "recent activity" widget and the full Activity Log page. */
export const ACTIVITY_LABEL: Record<ActivityAction, string> = {
  campaign_created: "إنشاء حملة",
  campaign_updated: "تعديل حملة",
  campaign_deleted: "حذف حملة",
  campaign_archived: "أرشفة حملة",
  campaign_restored: "إلغاء أرشفة حملة",
  campaign_status_changed: "تغيير حالة حملة",
  campaign_reordered: "إعادة ترتيب الحملات",
  campaign_duplicated: "تكرار حملة",
  request_status_changed: "تغيير حالة طلب",
  request_note_added: "إضافة ملاحظة على طلب",
  request_archived: "أرشفة/إلغاء أرشفة طلب",
  request_converted: "تحويل طلب إلى حملة",
  message_read_changed: "تغيير حالة قراءة رسالة",
  message_note_added: "إضافة ملاحظة على رسالة",
  message_archived: "أرشفة/إلغاء أرشفة رسالة",
  settings_updated: "تحديث الإعدادات",
  admin_login: "تسجيل دخول",
  admin_logout: "تسجيل خروج",
  admin_password_changed: "تغيير كلمة المرور",
  admin_created: "إنشاء حساب مشرف",
};
