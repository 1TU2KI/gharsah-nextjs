"use client";

import { useState, useTransition } from "react";
import type { PlatformConfig } from "@/app/lib/db/settings";
import { updatePlatformsAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/settings/actions";

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/15";

export default function PlatformsSettings({ initialPlatforms }: { initialPlatforms: PlatformConfig[] }) {
  const [platforms, setPlatforms] = useState(initialPlatforms);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(index: number, patch: Partial<PlatformConfig>) {
    setPlatforms((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPlatform() {
    setPlatforms((prev) => [...prev, { value: "", labelAr: "", labelEn: "", homepageUrl: "https://", logo: null }]);
  }

  function removePlatform(index: number) {
    setPlatforms((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updatePlatformsAction(platforms);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">منصات التبرع المدعومة</h2>
          <p className="mt-1 text-xs text-muted">تُستخدم هذه القائمة في نموذج إضافة/تعديل الحملة وفي شارة المنصة على الموقع العام.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {platforms.map((p, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-primary-100 bg-wash/60 p-3 sm:grid-cols-5">
            <div>
              <label className="text-[10px] font-semibold text-muted">المعرّف (يطابق حقل platform)</label>
              <input value={p.value} onChange={(e) => update(i, { value: e.target.value })} dir="ltr" className={fieldClass} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted">الاسم (عربي)</label>
              <input value={p.labelAr} onChange={(e) => update(i, { labelAr: e.target.value })} className={fieldClass} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted">الاسم (إنجليزي)</label>
              <input value={p.labelEn} onChange={(e) => update(i, { labelEn: e.target.value })} dir="ltr" className={fieldClass} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted">رابط الصفحة الرئيسية</label>
              <input value={p.homepageUrl} onChange={(e) => update(i, { homepageUrl: e.target.value })} dir="ltr" className={fieldClass} />
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-muted">شعار (اختياري)</label>
                <input
                  value={p.logo ?? ""}
                  onChange={(e) => update(i, { logo: e.target.value || null })}
                  dir="ltr"
                  placeholder="/platforms/x.svg"
                  className={fieldClass}
                />
              </div>
              <button
                type="button"
                onClick={() => removePlatform(i)}
                className="shrink-0 rounded-lg border border-red-200 px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={addPlatform} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-wash">
          + إضافة منصة
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-50"
        >
          حفظ المنصات
        </button>
        {saved && <span className="text-xs font-medium text-primary">تم الحفظ ✓</span>}
        {error && <span className="text-xs font-medium text-red-600">{error}</span>}
      </div>
    </section>
  );
}
