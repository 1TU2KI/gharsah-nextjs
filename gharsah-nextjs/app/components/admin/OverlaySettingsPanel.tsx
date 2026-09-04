"use client";

import { useState, useTransition } from "react";
import { updateOverlaySettingsAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/overlay/actions";
import type { OverlaySettings } from "@/app/lib/db/settings";
import OverlayCard from "@/app/components/overlay/OverlayCard";
import type { OverlayCampaign } from "@/app/lib/overlay/types";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-light/15";
const checkboxRowClass = "flex items-center gap-2.5 text-sm font-medium text-foreground";
const checkboxClass = "h-4 w-4 rounded border-primary-200";

const PREVIEW_POSITION_CLASS: Record<OverlaySettings["position"], string> = {
  "top-right": "top-10 right-10",
  "top-left": "top-10 left-10",
  "bottom-right": "bottom-10 right-10",
  "bottom-left": "bottom-10 left-10",
};

/**
 * One client component owning ONE piece of state (`settings`) that drives
 * three things at once: the settings form, the live 16:9 preview (via the
 * SAME OverlayCard the real overlay renders — never a look-alike), and the
 * generated example OBS URLs — so the "URL builder" isn't a separate
 * implementation, it's just this same state read back out as a query
 * string. Saving calls updateOverlaySettingsAction with the current state
 * directly (not FormData — the panel already needs full JS state for the
 * live preview, so parsing a submitted form would just be a redundant
 * second read of the same data).
 */
export default function OverlaySettingsPanel({
  initialSettings,
  previewCampaign,
  origin,
}: {
  initialSettings: OverlaySettings;
  /** The current #1 "اقتربت..." campaign (or null) — a real snapshot for the live preview only, never edited here. */
  previewCampaign: OverlayCampaign | null;
  /** Absolute origin (e.g. https://gharsah.sa or http://localhost:3000) for building copyable OBS URLs. */
  origin: string;
}) {
  const [settings, setSettings] = useState<OverlaySettings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ message: string | null; error: string | null }>({ message: null, error: null });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function update<K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const res = await updateOverlaySettingsAction(settings);
      setResult(res);
    });
  }

  const baseUrl = `${origin}/overlay/near`;

  function buildUrl(overrides: Record<string, string>): string {
    const qs = new URLSearchParams(overrides).toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      // Clipboard denied/unavailable — no confirmation shown; the link is still visible to copy by hand.
    }
  }

  const builderUrl = buildUrl({
    position: settings.position,
    theme: settings.theme,
    compact: String(settings.compact),
    showProgress: String(settings.showProgress),
    showLink: String(settings.showShortLink),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <div className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">إعدادات الأوفرلاي</h2>
          <p className="mt-1 text-xs text-muted">
            هذه الإعدادات تنطبق فورًا على أي رابط OBS مفتوح يستخدم الرابط الأساسي دون معاملات مخصصة — لا حاجة لاستبدال الرابط في OBS.
          </p>

          <div className="mt-4 space-y-4">
            <label className={checkboxRowClass}>
              <input type="checkbox" checked={settings.enabled} onChange={(e) => update("enabled", e.target.checked)} className={checkboxClass} />
              تفعيل الأوفرلاي
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="overlay-count">
                  عدد الحملات المعروضة
                </label>
                <input
                  id="overlay-count"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.campaignCount}
                  onChange={(e) => update("campaignCount", clampInt(e.target.value, 1, 10))}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="overlay-display">
                  مدة عرض كل حملة (ثانية)
                </label>
                <input
                  id="overlay-display"
                  type="number"
                  min={2}
                  max={60}
                  value={settings.displayDurationMs / 1000}
                  onChange={(e) => update("displayDurationMs", clampInt(e.target.value, 2, 60) * 1000)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="overlay-transition">
                  مدة الانتقال (ملي ثانية)
                </label>
                <input
                  id="overlay-transition"
                  type="number"
                  min={100}
                  max={3000}
                  step={50}
                  value={settings.transitionDurationMs}
                  onChange={(e) => update("transitionDurationMs", clampInt(e.target.value, 100, 3000))}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="overlay-rest">
                  الاختفاء بين الدورات (ثانية)
                </label>
                <input
                  id="overlay-rest"
                  type="number"
                  min={0}
                  max={300}
                  value={settings.restDurationMs / 1000}
                  onChange={(e) => update("restDurationMs", clampInt(e.target.value, 0, 300) * 1000)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="overlay-position">
                  الموضع الافتراضي
                </label>
                <select
                  id="overlay-position"
                  value={settings.position}
                  onChange={(e) => update("position", e.target.value as OverlaySettings["position"])}
                  className={fieldClass}
                >
                  <option value="top-right">أعلى اليمين</option>
                  <option value="top-left">أعلى اليسار</option>
                  <option value="bottom-right">أسفل اليمين</option>
                  <option value="bottom-left">أسفل اليسار</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="overlay-theme">
                  المظهر الافتراضي
                </label>
                <select
                  id="overlay-theme"
                  value={settings.theme}
                  onChange={(e) => update("theme", e.target.value as OverlaySettings["theme"])}
                  className={fieldClass}
                >
                  <option value="dark">داكن</option>
                  <option value="light">فاتح</option>
                </select>
              </div>
            </div>

            <label className={checkboxRowClass}>
              <input type="checkbox" checked={settings.compact} onChange={(e) => update("compact", e.target.checked)} className={checkboxClass} />
              الحجم المضغوط (Compact)
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className={checkboxRowClass}>
                <input type="checkbox" checked={settings.showProgress} onChange={(e) => update("showProgress", e.target.checked)} className={checkboxClass} />
                إظهار نسبة الإنجاز
              </label>
              <label className={checkboxRowClass}>
                <input type="checkbox" checked={settings.showRemaining} onChange={(e) => update("showRemaining", e.target.checked)} className={checkboxClass} />
                إظهار النسبة المتبقية
              </label>
              <label className={checkboxRowClass}>
                <input type="checkbox" checked={settings.showShortLink} onChange={(e) => update("showShortLink", e.target.checked)} className={checkboxClass} />
                إظهار الرابط المختصر
              </label>
              <label className={checkboxRowClass}>
                <input type="checkbox" checked={settings.showLogo} onChange={(e) => update("showLogo", e.target.checked)} className={checkboxClass} />
                إظهار شعار غرسة
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground" htmlFor="overlay-title">
                عنوان مخصص (اختياري — الافتراضي «اقتربت...»)
              </label>
              <input
                id="overlay-title"
                value={settings.titleText}
                onChange={(e) => update("titleText", e.target.value)}
                placeholder="اقتربت..."
                className={fieldClass}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-50"
            >
              {isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </button>
            {result.message && <span className="text-xs font-medium text-primary">{result.message}</span>}
            {result.error && <span className="text-xs font-medium text-red-600">{result.error}</span>}
          </div>
        </div>

        <div className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">رابط OBS Browser Source</h2>
          <p className="mt-1 text-xs text-muted">Sources ← Browser ← URL — الرابط الدائم يعكس أي تغيير في الإعدادات أعلاه تلقائيًا دون الحاجة لاستبداله في OBS.</p>

          <UrlRow label="الرابط الدائم (يتبع إعدادات الأدمن المحفوظة)" url={baseUrl} copiedKey={copiedKey} rowKey="base" onCopy={copy} />
          <UrlRow label="مطابق للإعدادات المعروضة أعلاه الآن (منشئ الرابط)" url={builderUrl} copiedKey={copiedKey} rowKey="builder" onCopy={copy} />
          <UrlRow label="مثال: أعلى اليسار" url={buildUrl({ position: "top-left" })} copiedKey={copiedKey} rowKey="topleft" onCopy={copy} />
          <UrlRow label="مثال: الحجم المضغوط" url={buildUrl({ compact: "true" })} copiedKey={copiedKey} rowKey="compact" onCopy={copy} />

          <div className="mt-4 rounded-xl border border-primary/20 bg-primary-50/50 p-3 text-xs text-foreground/80">
            <p className="font-semibold text-primary-dark">إعدادات OBS الموصى بها</p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5">
              <li>العرض × الارتفاع: 1920 × 1080 (نفس مقاس الكانفاس)</li>
              <li>الخلفية شفافة تلقائيًا — لا حاجة لأي إعداد CSS إضافي في OBS</li>
              <li>لا داعي لتفعيل «Refresh browser when scene becomes active» — الأوفرلاي يحدّث بياناته بنفسه كل 20 ثانية تقريبًا</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="card-elevated rounded-2xl border border-border bg-background/90 p-4 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">معاينة مباشرة</h2>
          <p className="mt-1 text-xs text-muted">محاكاة كانفاس 1920×1080 — نفس مكوّن الأوفرلاي الحقيقي بالضبط، ولوحة الشطرنج تمثّل الشفافية.</p>

          <div className="overlay-preview-canvas relative mt-3 w-full overflow-hidden rounded-xl">
            <div className="absolute inset-0 origin-top-left" style={{ transform: "scale(0.25)", width: "1920px", height: "1080px" }}>
              <div className={`absolute flex ${PREVIEW_POSITION_CLASS[settings.position]}`}>
                <OverlayCard
                  campaign={previewCampaign}
                  visible
                  showProgress={settings.showProgress}
                  showRemaining={settings.showRemaining}
                  showShortLink={settings.showShortLink}
                  showLogo={settings.showLogo}
                  theme={settings.theme}
                  compact={settings.compact}
                  titleText={settings.titleText}
                  position={settings.position}
                  transitionDurationMs={0}
                  lang="ar"
                />
              </div>
            </div>
          </div>

          {!previewCampaign && (
            <p className="mt-2 text-[11px] text-muted">لا توجد حملة نشطة قريبة من الاكتمال حاليًا — المعاينة تعرض حالة الاحتياط.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function clampInt(raw: string, min: number, max: number): number {
  const n = Math.round(Number(raw));
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function UrlRow({
  label,
  url,
  copiedKey,
  rowKey,
  onCopy,
}: {
  label: string;
  url: string;
  copiedKey: string | null;
  rowKey: string;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code dir="ltr" className="flex-1 truncate rounded-lg border border-border bg-wash/60 px-2.5 py-1.5 text-[11px] text-foreground/80">
          {url}
        </code>
        <button
          type="button"
          onClick={() => onCopy(url, rowKey)}
          className="shrink-0 rounded-full border border-primary/30 bg-primary-50/70 px-3 py-1.5 text-[11px] font-semibold text-primary-dark hover:border-primary/60 hover:bg-primary-100"
        >
          {copiedKey === rowKey ? "تم النسخ" : "نسخ رابط الأوفرلاي"}
        </button>
      </div>
    </div>
  );
}
