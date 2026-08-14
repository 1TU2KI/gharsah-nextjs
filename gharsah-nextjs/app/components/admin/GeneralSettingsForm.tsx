"use client";

import { useActionState } from "react";
import { updateSiteSettingsAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/settings/actions";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-light/15";

export default function GeneralSettingsForm({
  devBadgeVisible,
  maintenanceMessage,
  contactEmail,
  defaultCampaignSort,
}: {
  devBadgeVisible: boolean;
  maintenanceMessage: string | null;
  contactEmail: string | null;
  defaultCampaignSort: "order" | "newest";
}) {
  const [state, formAction, pending] = useActionState(updateSiteSettingsAction, { message: null, error: null });

  return (
    <form action={formAction} className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
      <h2 className="text-sm font-bold text-foreground">إعدادات عامة</h2>

      <div className="mt-4 space-y-4">
        <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <input type="checkbox" name="devBadgeVisible" defaultChecked={devBadgeVisible} className="h-4 w-4 rounded border-primary-200" />
          إظهار شارة «قيد التطوير» في رأس الموقع العام
        </label>

        <div>
          <label className="text-xs font-semibold text-foreground" htmlFor="maintenanceMessage">
            رسالة صيانة (اختياري — اتركه فارغًا إذا كان الموقع يعمل بشكل طبيعي)
          </label>
          <textarea
            id="maintenanceMessage"
            name="maintenanceMessage"
            rows={2}
            defaultValue={maintenanceMessage ?? ""}
            placeholder="مثال: الموقع قيد الصيانة حاليًا، نعتذر عن الإزعاج."
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground" htmlFor="contactEmail">
            بريد التواصل العام
          </label>
          <input id="contactEmail" name="contactEmail" dir="ltr" defaultValue={contactEmail ?? ""} placeholder="contact@example.com" className={fieldClass} />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground" htmlFor="defaultCampaignSort">
            الترتيب الافتراضي لعرض الحملات
          </label>
          <select id="defaultCampaignSort" name="defaultCampaignSort" defaultValue={defaultCampaignSort} className={fieldClass}>
            <option value="order">الترتيب اليدوي</option>
            <option value="newest">الأحدث أولًا</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-50"
        >
          حفظ الإعدادات
        </button>
        {state.message && <span className="text-xs font-medium text-primary">{state.message}</span>}
        {state.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
