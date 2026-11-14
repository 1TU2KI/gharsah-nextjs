"use client";

import { useEffect, useMemo, useState } from "react";
import GharsahOverlayClient from "@/app/components/overlay/GharsahOverlayClient";
import GeneratedUrlBox from "@/app/components/overlay/GeneratedUrlBox";
import ObsInstructions from "@/app/components/overlay/ObsInstructions";
import OverlayMiniCanvas from "@/app/components/overlay/OverlayMiniCanvas";
import type { GharsahOverlayApiResponse, GharsahOverlayStyle } from "@/app/lib/overlay/gharsah/types";
import type { PickableCampaign } from "@/app/lib/overlay/types";
import { GHARSAH_OVERLAY_DEFAULT_STYLE } from "@/app/lib/overlay/gharsah/defaults";
import { gharsahQrValue, type GharsahQrTarget } from "@/app/lib/overlay/gharsah/qr";

const SMALL_PREVIEW_FILL_RATIO = 0.75;
/** Matches GharsahOverlayCard's own fixed (non-compact) `w-80` — see cardWidthPx()'s equivalent in OverlayPromoSection.tsx; Gharsah Overlay has no compact setting to read, so this is a plain constant instead of a computed value. Only used for the "brand" style's preview reference width. */
const GHARSAH_CARD_WIDTH_PX = 320;
/** Rough visual width of the "logo" style's stacked logo+hostUrl block (112px logo, "gharsah.sa" at text-2xl is narrower) — its own, much smaller preview reference width so "معاينة مصغرة" zooms it to actually fill the frame instead of sitting tiny inside a reference sized for the full brand card. */
const GHARSAH_LOGO_STYLE_WIDTH_PX = 160;

/** The "qr" style's preview reference width, sized by HEIGHT because the frame is 16:9: the panel around the 220px code (padding + destination label) is ≈ 280px tall, × 16/9 ≈ 500, plus a little room — otherwise "معاينة مصغرة" would crop the panel and the code's margin. */
const GHARSAH_QR_STYLE_WIDTH_PX = 540;

const STYLE_OPTIONS: { value: GharsahOverlayStyle; label: string; description: string }[] = [
  { value: "brand", label: "الأوفرلاي الحالي", description: "بطاقة كاملة: الشعار + الجملة التعريفية + رابط الموقع" },
  { value: "logo", label: "شعار غرسة", description: "الشعار فقط مع رابط الموقع gharsah.sa، بلا خلفية أو أي محتوى إضافي" },
  { value: "qr", label: "كيو آر كود", description: "رمز QR واضح قابل للمسح يوجّه المشاهدين مباشرة إلى وجهة تختارها" },
];

const QR_TARGET_OPTIONS: { value: GharsahQrTarget; label: string; description: string }[] = [
  { value: "campaign", label: "حالة محددة", description: "رابط الحالة المختصر في غرسة" },
  { value: "site", label: "موقع غرسة", description: "gharsah.sa" },
  { value: "near", label: "اقتربت...", description: "صفحة الحالات الأقرب للاكتمال" },
];

/**
 * The query param that decides WHICH Gharsah Overlay visual shows — the
 * only configurable dimension left now that Gharsah Overlay has no timing
 * control of its own (see the doc comment on `GharsahOverlayPromoSection`
 * below). Only ever sets `?style=` when it differs from the default, so an
 * existing streamer's already-copied plain `/overlay/gharsah` URL — with or
 * without a now-inert leftover `?interval=` — keeps rendering the same
 * "brand" card it always has.
 */
function buildStyleParams(style: GharsahOverlayStyle, qrTarget: GharsahQrTarget, qrSlug: string | null): URLSearchParams {
  const params = new URLSearchParams();
  if (style !== GHARSAH_OVERLAY_DEFAULT_STYLE) params.set("style", style);
  // "qr" style: its destination (`?qr=`) and, for a campaign, the slug
  // (`?c=`) — the OBS route resolves these to the encoded URL server-side.
  if (style === "qr") {
    params.set("qr", qrTarget);
    if (qrTarget === "campaign" && qrSlug) params.set("c", qrSlug);
  }
  return params;
}

/**
 * Public "أوفرلاي غرسة" config section — the Gharsah-branding counterpart
 * to OverlayPromoSection.tsx, reusing every genuinely shared piece
 * (generated-URL box, preview canvas, OBS instructions). Now has its own
 * short "اختر نوع أوفرلاي غرسة" step (2 options, not Campaign Overlay's 4 —
 * see STYLE_OPTIONS) picking WHICH Gharsah visual shows: "brand" (the
 * original full card) or "logo" (the new minimal logo+hostUrl-only variant,
 * see GharsahOverlayCard.tsx). See gharsah/data.ts for exactly where
 * `hostUrl`/`message` come from (no DB read, no invented copy, no
 * connection to the news/updates feed — explicitly out of scope here) —
 * unaffected by which style is picked, same underlying data either way.
 *
 * No timing control here anymore (no "إعداد الأوفرلاي" / interval slider):
 * Gharsah Overlay used to blink on a cycle (show → hide → wait the
 * configured interval → reappear), and that interval was what a streamer's
 * `?interval=` picked. The overlay is now continuously visible instead
 * (see GharsahOverlayClient.tsx) — there is no more appearance-to-
 * appearance gap for an interval to pace, so the control that configured
 * it was removed along with it rather than left showing with no effect.
 * `style` is the only thing left to pick.
 */
export default function GharsahOverlayPromoSection({
  overlayUrl,
  overlayData,
  pickableCampaigns,
}: {
  /** Base URL (current origin + "/overlay/gharsah") the generated custom URL is built from. */
  overlayUrl: string;
  overlayData: GharsahOverlayApiResponse;
  /** Current public active campaigns (same list as Campaign Overlay's picker) for the QR "حالة محددة" choice. */
  pickableCampaigns: PickableCampaign[];
}) {
  const [style, setStyle] = useState<GharsahOverlayStyle>(overlayData.settings.style);
  const [qrTarget, setQrTarget] = useState<GharsahQrTarget>(overlayData.settings.qrTarget);
  const [qrSlug, setQrSlug] = useState<string | null>(pickableCampaigns[0]?.slug ?? null);

  const qrCampaign = useMemo(() => pickableCampaigns.find((c) => c.slug === qrSlug) ?? null, [pickableCampaigns, qrSlug]);
  // Same helper the OBS route uses (gharsah/qr.ts), so the preview always
  // encodes exactly what the copied URL will.
  const qrValue = useMemo(
    () => (style === "qr" ? gharsahQrValue(qrTarget, qrCampaign) : null),
    [style, qrTarget, qrCampaign],
  );

  const styleParams = useMemo(() => buildStyleParams(style, qrTarget, qrSlug), [style, qrTarget, qrSlug]);
  const customOverlayUrl = useMemo(() => {
    const qs = styleParams.toString();
    return qs ? `${overlayUrl}?${qs}` : overlayUrl;
  }, [overlayUrl, styleParams]);
  // Explicit `queryString` for the two preview instances below — the real
  // `/overlay/gharsah` route can safely let GharsahOverlayClient default to
  // `window.location.search` because that IS the actual generated URL's
  // query string there; a preview embedded in THIS page can't rely on that
  // (`/overlay`'s own address bar never carries `?style=`), so its internal
  // ~20s poll must be told explicitly or it would silently poll the
  // style-less default and eventually revert the preview back to "brand".
  const previewQueryString = useMemo(() => {
    const qs = styleParams.toString();
    return qs ? `?${qs}` : "";
  }, [styleParams]);

  // Live preview data — fetched ONCE on mount only (style-independent: see
  // gharsah/data.ts, hostUrl/message never depend on it), same
  // "server-rendered default is always the floor" fallback as before.
  const [rawPreviewData, setRawPreviewData] = useState<GharsahOverlayApiResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function fetchPreview() {
      try {
        const res = await fetch(`/api/overlay/gharsah`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as GharsahOverlayApiResponse;
        if (!cancelled) setRawPreviewData(data);
      } catch {
        // Keep whatever preview data is already showing; the server-rendered default is always the floor.
      }
    }
    fetchPreview();
    return () => {
      cancelled = true;
    };
  }, []);

  // `style` is applied as a pure LOCAL override on top of the fetched data
  // for the INITIAL render of a (re)mounted preview, rather than waiting on
  // a fresh `?style=...` fetch to resolve first — a remount (see
  // `previewKey` below) would otherwise briefly show whatever style
  // happened to be fetched last instead of the one just selected. Safe to
  // do locally because nothing else in the response depends on `style` at
  // all (see gharsah/data.ts). Ongoing correctness after that first render
  // comes from `previewQueryString` above, passed as `queryString` to both
  // preview instances so their own ~20s poll stays consistent with this
  // override instead of eventually overwriting it back to "brand".
  const effectivePreviewData = useMemo<GharsahOverlayApiResponse>(() => {
    const base = rawPreviewData ?? overlayData;
    return {
      ...base,
      settings: { ...base.settings, style, qrTarget, qrCampaignSlug: qrTarget === "campaign" ? qrSlug : null },
      qrValue,
    };
  }, [rawPreviewData, overlayData, style, qrTarget, qrSlug, qrValue]);
  // Forces both preview GharsahOverlayClient instances to fully remount when
  // style changes — `displayed` there is seeded from `initialData` via
  // `useState` exactly once per mount, so a bare prop change alone wouldn't
  // apply the new style until its next ~20s poll resolves; remounting
  // applies `effectivePreviewData`'s local override instantly instead. Same
  // technique as OverlayPromoSection's own `previewKey`.
  const previewKey = `${style}|${qrValue ?? ""}`;
  const previewReferenceWidthPx =
    style === "logo" ? GHARSAH_LOGO_STYLE_WIDTH_PX : style === "qr" ? GHARSAH_QR_STYLE_WIDTH_PX : GHARSAH_CARD_WIDTH_PX;

  return (
    <div className="glass-surface glass-clear relative mt-16 rounded-2xl border border-primary/20 bg-background/95 p-6 shadow-[0_4px_10px_rgba(20,83,45,0.10),0_32px_64px_-20px_rgba(20,83,45,0.30)] backdrop-blur-sm sm:p-8">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">أوفرلاي غرسة</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          أضف هذا الرابط في OBS كمصدر Browser للتعريف بموقع غرسة الرسمي تلقائيًا أثناء بثك.
        </p>
      </div>

      {/* اختر نوع أوفرلاي غرسة — decides WHICH visual shows, before
          anything about WHEN it's timed or copied. Purely local state,
          same as Campaign Overlay's own mode picker; nothing here is ever
          saved to the database. */}
      <div className="mt-6 rounded-xl border border-primary/15 bg-wash/40 p-4 sm:p-5">
        <p className="text-sm font-bold text-foreground">اختر نوع أوفرلاي غرسة</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {STYLE_OPTIONS.map((option) => {
            const isSelected = style === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
                  isSelected ? "border-primary/50 bg-primary-50/60" : "border-primary/15 hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="gharsah-overlay-style"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => setStyle(option.value)}
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ accentColor: "var(--primary)" }}
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                  <span className="block text-xs text-muted">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* "كيو آر كود" only: where the QR points. Every change updates the
          preview and the generated OBS URL below immediately. */}
      {style === "qr" && (
        <div className="mt-6 rounded-xl border border-primary/15 bg-wash/40 p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">وجهة الكيو آر كود</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {QR_TARGET_OPTIONS.map((option) => {
              const isSelected = qrTarget === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
                    isSelected ? "border-primary/50 bg-primary-50/60" : "border-primary/15 hover:border-primary/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="gharsah-overlay-qr-target"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setQrTarget(option.value)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                    <span className="block text-xs text-muted" dir={option.value === "site" ? "ltr" : undefined}>
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {qrTarget === "campaign" && (
            <div className="mt-4">
              <label htmlFor="gharsah-qr-campaign" className="text-xs font-semibold text-foreground">
                اختر الحالة
              </label>
              {pickableCampaigns.length > 0 ? (
                <select
                  id="gharsah-qr-campaign"
                  value={qrSlug ?? ""}
                  onChange={(e) => setQrSlug(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                >
                  {pickableCampaigns.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1.5 text-xs text-muted">لا توجد حالات نشطة متاحة حاليًا.</p>
              )}
            </div>
          )}

          {/* اقتربت... — the main /near page, or (later) a custom Almost
              There page. Custom pages are still a local prototype with no
              public viewing links, so that choice stays unavailable until
              they're live; private edit links never go into a QR. */}
          {qrTarget === "near" && (
            <div className="mt-4 space-y-2">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-primary/50 bg-primary-50/60 p-3">
                <input type="radio" name="gharsah-overlay-qr-near" checked readOnly className="h-4 w-4 shrink-0" style={{ accentColor: "var(--primary)" }} />
                <span className="text-sm font-semibold text-foreground">صفحة اقتربت... الرئيسية</span>
              </label>
              <label aria-disabled="true" className="flex cursor-not-allowed items-start gap-2.5 rounded-xl border border-primary/15 p-3 opacity-60">
                <input type="radio" name="gharsah-overlay-qr-near" disabled className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="block text-sm font-semibold text-foreground">صفحة اقتربت مخصصة</span>
                  <span className="block text-xs text-muted">غير متاحة حاليًا — ستتوفر عند تفعيل روابط المشاهدة العامة للصفحات المخصصة.</span>
                </span>
              </label>
            </div>
          )}

          {qrValue && (
            <p className="mt-4 text-xs text-muted">
              يفتح الرمز:{" "}
              <span dir="ltr" className="font-semibold text-foreground">
                {qrValue}
              </span>
            </p>
          )}
        </div>
      )}

      {/* الرابط المخصص — no timing to configure anymore (the overlay is
          continuously visible, see GharsahOverlayClient.tsx), so this is
          just the style picked above, already baked into one ready URL. */}
      <div className="mt-6 rounded-xl border border-primary/15 bg-wash/40 p-4 sm:p-5">
        <p className="text-sm font-bold text-foreground">رابطك</p>
        <p className="mt-1 text-xs text-muted">انسخ رابطك بهذا الإعداد وأضفه في OBS.</p>

        <div className="mt-4">
          <GeneratedUrlBox url={customOverlayUrl} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="mx-auto w-full max-w-sm sm:mx-0">
          <OverlayMiniCanvas
            label="معاينة مصغرة"
            hint="تكبير حقيقي على البطاقة نفسها — نفس البيانات والتصميم بالضبط"
            canvasWidth={previewReferenceWidthPx / SMALL_PREVIEW_FILL_RATIO}
            center
            renderOverlay={(center) => <GharsahOverlayClient key={previewKey} initialData={effectivePreviewData} queryString={previewQueryString} center={center} />}
          />
        </div>
        <OverlayMiniCanvas
          label="معاينة كبيرة"
          hint="نفس مكوّن الأوفرلاي الحقيقي، بحجم أكبر لفحص النص والتباعد والشفافية بدقة"
          renderOverlay={(center) => <GharsahOverlayClient key={previewKey} initialData={effectivePreviewData} queryString={previewQueryString} center={center} />}
        />
      </div>

      <ObsInstructions />
    </div>
  );
}
