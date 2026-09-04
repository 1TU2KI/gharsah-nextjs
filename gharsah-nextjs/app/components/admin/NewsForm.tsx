"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyNewsFormState, type NewsFormState } from "@/app/lib/admin/newsSchema";
import { MANUAL_NEWS_TYPE_OPTIONS } from "@/app/lib/news/presentation";
import type { ManualNewsType } from "@/app/lib/db/newsRepo";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted focus:border-primary-light focus:ring-4 focus:ring-primary-light/15 [&.error]:border-red-400";
const labelClass = "text-xs font-semibold text-foreground";
const errorClass = "mt-1 text-xs font-medium text-red-600";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className={errorClass}>{message}</p>;
}

export type NewsFormValues = {
  type: ManualNewsType;
  titleAr: string;
  bodyAr: string;
  customUrl: string;
  published: boolean;
};

/**
 * Create/edit form for the 4 manual news types (urgent/maintenance/
 * dev_update/general) — automatic campaign_added/campaign_completed rows
 * are never created or edited here (see NewsTable.tsx, which only links
 * here for `source === "manual"` rows). Same useActionState/controlled-
 * values shape as CampaignForm.tsx, minus that form's live campaign-card
 * preview (there's no equivalent single "official" visual to preview here
 * — NewsItemCard already renders live on the public feed once published).
 */
export default function NewsForm({
  mode,
  action,
  initialValues,
}: {
  mode: "create" | "edit";
  action: (prevState: NewsFormState, formData: FormData) => Promise<NewsFormState>;
  initialValues: NewsFormValues;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, emptyNewsFormState);
  const [values, setValues] = useState<NewsFormValues>(initialValues);

  function set<K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {state.formError && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{state.formError}</p>}

      <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
        <h2 className="text-sm font-bold text-foreground">نوع التحديث</h2>
        <div className="mt-4">
          <select
            name="type"
            value={values.type}
            onChange={(e) => set("type", e.target.value as ManualNewsType)}
            className={fieldClass}
          >
            {MANUAL_NEWS_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
        <h2 className="text-sm font-bold text-foreground">المحتوى</h2>
        <p className="mt-1 text-xs text-muted">يُعرض هذا المحتوى كما هو تمامًا للزوار، بدون أي ترجمة أو تعديل تلقائي.</p>

        <div className="mt-4">
          <label className={labelClass} htmlFor="titleAr">
            العنوان — اختياري
          </label>
          <input
            id="titleAr"
            name="titleAr"
            value={values.titleAr}
            onChange={(e) => set("titleAr", e.target.value)}
            placeholder="اتركه فارغًا لاستخدام عنوان النوع الافتراضي (مثال: «عاجل»)"
            className={`${fieldClass} ${errors.titleAr ? "error" : ""}`}
          />
          <FieldError message={errors.titleAr} />
        </div>

        <div className="mt-4">
          <label className={labelClass} htmlFor="bodyAr">
            نص التحديث
          </label>
          <textarea
            id="bodyAr"
            name="bodyAr"
            rows={6}
            value={values.bodyAr}
            onChange={(e) => set("bodyAr", e.target.value)}
            className={`${fieldClass} resize-none ${errors.bodyAr ? "error" : ""}`}
          />
          <FieldError message={errors.bodyAr} />
        </div>

        <div className="mt-4">
          <label className={labelClass} htmlFor="customUrl">
            رابط إضافي — اختياري
          </label>
          <input
            id="customUrl"
            name="customUrl"
            dir="ltr"
            value={values.customUrl}
            onChange={(e) => set("customUrl", e.target.value)}
            placeholder="https://"
            className={`${fieldClass} ${errors.customUrl ? "error" : ""}`}
          />
          <FieldError message={errors.customUrl} />
        </div>
      </section>

      <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
        <label className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            name="published"
            checked={values.published}
            onChange={(e) => set("published", e.target.checked)}
            className="h-4 w-4 rounded border-border"
            style={{ accentColor: "var(--primary)" }}
          />
          نشر التحديث فورًا (يمكن تغييره لاحقًا)
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-sm transition-all hover:bg-accent-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "جارٍ الحفظ..." : mode === "create" ? "نشر التحديث" : "حفظ التغييرات"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-primary-100"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
