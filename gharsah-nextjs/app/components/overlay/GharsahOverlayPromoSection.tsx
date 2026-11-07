"use client";

import { useEffect, useMemo, useState } from "react";
import { Alexandria } from "next/font/google";
import GharsahOverlayClient from "@/app/components/overlay/GharsahOverlayClient";
import GeneratedUrlBox from "@/app/components/overlay/GeneratedUrlBox";
import ObsInstructions from "@/app/components/overlay/ObsInstructions";
import OverlayMiniCanvas from "@/app/components/overlay/OverlayMiniCanvas";
import type { GharsahOverlayApiResponse, GharsahOverlayStyle } from "@/app/lib/overlay/gharsah/types";
import { GHARSAH_OVERLAY_DEFAULT_STYLE, GHARSAH_OVERLAY_PUBLIC_ENABLED } from "@/app/lib/overlay/gharsah/defaults";

const SMALL_PREVIEW_FILL_RATIO = 0.75;
/** Matches GharsahOverlayCard's own fixed (non-compact) `w-80` — see cardWidthPx()'s equivalent in OverlayPromoSection.tsx; Gharsah Overlay has no compact setting to read, so this is a plain constant instead of a computed value. Only used for the "brand" style's preview reference width. */
const GHARSAH_CARD_WIDTH_PX = 320;
/** Rough visual width of the "logo" style's stacked logo+hostUrl block (112px logo, "gharsah.sa" at text-2xl is narrower) — its own, much smaller preview reference width so "معاينة مصغرة" zooms it to actually fill the frame instead of sitting tiny inside a reference sized for the full brand card. */
const GHARSAH_LOGO_STYLE_WIDTH_PX = 160;

/** Scoped to the temporary "Coming Soon" gate below ONLY — never applied to the real Gharsah Overlay UI, which keeps the site's normal Cairo typography. */
const alexandria = Alexandria({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"] });

const STYLE_OPTIONS: { value: GharsahOverlayStyle; label: string; description: string }[] = [
  { value: "brand", label: "الأوفرلاي الحالي", description: "بطاقة كاملة: الشعار + الجملة التعريفية + رابط الموقع" },
  { value: "logo", label: "شعار غرسة", description: "الشعار فقط مع رابط الموقع gharsah.sa، بلا خلفية أو أي محتوى إضافي" },
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
function buildStyleParams(style: GharsahOverlayStyle): URLSearchParams {
  const params = new URLSearchParams();
  if (style !== GHARSAH_OVERLAY_DEFAULT_STYLE) params.set("style", style);
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
}: {
  /** Base URL (current origin + "/overlay/gharsah") the generated custom URL is built from. */
  overlayUrl: string;
  overlayData: GharsahOverlayApiResponse;
}) {
  const [style, setStyle] = useState<GharsahOverlayStyle>(overlayData.settings.style);

  const styleParams = useMemo(() => buildStyleParams(style), [style]);
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
    return { ...base, settings: { ...base.settings, style } };
  }, [rawPreviewData, overlayData, style]);
  // Forces both preview GharsahOverlayClient instances to fully remount when
  // style changes — `displayed` there is seeded from `initialData` via
  // `useState` exactly once per mount, so a bare prop change alone wouldn't
  // apply the new style until its next ~20s poll resolves; remounting
  // applies `effectivePreviewData`'s local override instantly instead. Same
  // technique as OverlayPromoSection's own `previewKey`.
  const previewKey = style;
  const previewReferenceWidthPx = style === "logo" ? GHARSAH_LOGO_STYLE_WIDTH_PX : GHARSAH_CARD_WIDTH_PX;

  // Temporary PUBLIC visibility gate — see the flag's doc comment in
  // gharsah/defaults.ts. Everything below (state, style logic,
  // preview data fetching, the full config UI) stays fully intact and
  // untouched; this only swaps what gets rendered on this page. The real
  // `/overlay/gharsah` OBS route, its API, and all Gharsah Overlay code are
  // unaffected — flipping the flag back to `true` restores this section
  // exactly as it is today, with no reconstruction needed.
  if (!GHARSAH_OVERLAY_PUBLIC_ENABLED) {
    return (
      <div className="glass-surface glass-clear relative mt-16 rounded-2xl border border-primary/20 bg-background/95 p-8 shadow-[0_4px_10px_rgba(20,83,45,0.10),0_32px_64px_-20px_rgba(20,83,45,0.30)] backdrop-blur-sm sm:p-12">
        <div className={`flex min-h-[240px] flex-col items-center justify-center gap-4 text-center sm:min-h-[280px] ${alexandria.className}`}>
          <h2 className="text-sm font-semibold tracking-[0.2em] text-muted sm:text-base">أوفرلاي غرسة</h2>
          <p className="text-4xl font-extrabold leading-tight text-primary-dark sm:text-5xl">قريبًا...</p>
          <p className="max-w-sm text-sm leading-relaxed text-muted sm:text-base">
            نعمل على تجهيز أوفرلاي غرسة ليكون متاحًا لكم قريبًا.
          </p>
        </div>
      </div>
    );
  }

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

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
