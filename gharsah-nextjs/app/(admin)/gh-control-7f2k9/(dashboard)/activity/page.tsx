import type { Metadata } from "next";
import { listActivity } from "@/app/lib/db/activity";
import { ACTIVITY_LABEL } from "@/app/components/admin/activityLabels";

export const metadata: Metadata = { title: "سجل النشاط | لوحة تحكم غرسة" };

const TARGET_TYPE_LABEL: Record<string, string> = {
  campaign: "حملة",
  request: "طلب",
  message: "رسالة",
  admin: "مشرف",
  settings: "إعدادات",
};

export default function ActivityLogPage() {
  const entries = listActivity(300);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">سجل النشاط</h1>
        <p className="mt-1 text-sm text-muted">آخر {entries.length} إجراء إداري</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {entries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">لا يوجد نشاط بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead>
                <tr className="border-b border-primary-100 bg-wash/70 text-xs font-semibold text-muted">
                  <th className="px-4 py-3 text-start">الإجراء</th>
                  <th className="px-4 py-3 text-start">العنصر</th>
                  <th className="px-4 py-3 text-start">المشرف</th>
                  <th className="px-4 py-3 text-start">التاريخ والوقت</th>
                  <th className="px-4 py-3 text-start">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-wash last:border-0 hover:bg-wash/60">
                    <td className="px-4 py-3 font-medium text-foreground">{ACTIVITY_LABEL[entry.action] ?? entry.action}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {TARGET_TYPE_LABEL[entry.target_type] ?? entry.target_type}
                      {entry.target_label ? ` — ${entry.target_label}` : ""}
                    </td>
                    <td dir="ltr" className="px-4 py-3 text-start text-xs text-muted">
                      {entry.admin_username}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{new Date(entry.created_at).toLocaleString("ar-SA")}</td>
                    <td className="px-4 py-3 text-xs text-muted">{entry.details ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
