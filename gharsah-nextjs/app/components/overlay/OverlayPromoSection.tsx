"use client";

import { useEffect, useMemo, useState } from "react";
import OverlayClient from "@/app/components/overlay/OverlayClient";
import IntervalSlider from "@/app/components/overlay/IntervalSlider";
import GeneratedUrlBox from "@/app/components/overlay/GeneratedUrlBox";
import ObsInstructions from "@/app/components/overlay/ObsInstructions";
import OverlayMiniCanvas from "@/app/components/overlay/OverlayMiniCanvas";
import type { OverlayApiResponse, PickableCampaign } from "@/app/lib/overlay/types";
import type { OverlayMode } from "@/app/lib/overlay/queryParams";
import { OVERLAY_DEFAULT_INTERVAL_MINUTES } from "@/app/lib/overlay/defaults";

const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 60;

// The compact preview is a deliberate ZOOM into the card, not a shrunk copy
// of the full 1920×1080 canvas — instead of simulating the whole OBS frame
// (where the card is a small corner element), its virtual canvas is sized
// just wide enough that the SAME real card (unmodified — see OverlayCard.tsx
// via OverlayClient below) fills roughly 3/4 of the available width. Derived
// from the card's own actual Tailwind width (`w-64`/`w-80`, see
// OverlayCard.tsx's `compact` branch) divided by the target fill ratio, so
// this stays accurate even if the admin's compact setting changes — never a
// guessed magic number disconnected from the real card size. Height keeps
// the same 16:9 ratio as the real canvas so nothing is stretched/skewed.
const SMALL_PREVIEW_FILL_RATIO = 0.75;

const MODE_OPTIONS: { value: OverlayMode; label: string; description: string }[] = [
  { value: "near", label: "حالات اقتربت", description: "أقرب 3 حالات نشطة للاكتمال تلقائيًا — نفس ترتيب «اقتربت...»" },
  { value: "selected", label: "اختيار حالات محددة", description: "اختر حالة نشطة واحدة أو أكثر يدويًا من القائمة" },
  { value: "all", label: "كل الحالات", description: "كل الحالات النشطة حاليًا، بلا حد أقصى" },
  { value: "lowest", label: "أقل 3 حالات اكتمالاً", description: "أقل 3 حالات نشطة من حيث نسبة الإنجاز" },
];

/** Mirrors OverlayCard.tsx's own `compact ? "w-64" : "w-80"` (Tailwind w-64=256px, w-80=320px) — the real rendered card width, read from the actual settings rather than assumed. */
function cardWidthPx(overlayData: OverlayApiResponse): number {
  return overlayData.settings.compact ? 256 : 320;
}

/**
 * The query params that decide WHAT the overlay shows — mode + selected
 * campaigns — kept deliberately separate from timing (`?interval=`). Shared
 * by both the generated custom URL and the live-preview re-fetch below, so
 * the two can never disagree about what a given mode/selection means.
 */
function buildModeParams(mode: OverlayMode, selectedSlugs: string[]): URLSearchParams {
  const params = new URLSearchParams();
  if (mode !== "near") params.set("mode", mode);
  if (mode === "selected" && selectedSlugs.length > 0) params.set("campaigns", selectedSlugs.join(","));
  return params;
}

/**
 * Public streamer-facing section on the dedicated `/overlay` page — its own
 * route, separate from `/near`'s campaign cards (which link here via a CTA
 * instead of embedding this section directly, so `/near` stays focused on
 * "اقتربت..." and this stays focused on OBS/streamer tooling). Explains and
 * previews the OBS overlay for anyone who wants to support Gharsah on
 * stream. Exposes ONLY public information — no admin-only settings link, no
 * analytics numbers, nothing from the admin dashboard, and nothing here is
 * ever saved to the database: the mode/campaign-selection/interval choices
 * below only ever change the LOCALLY generated custom URL, never the
 * admin-configured default or anyone else's overlay instance.
 *
 * "ماذا تريد أن يعرض الأوفرلاي؟" builds a `?mode=`/`?campaigns=` override
 * (see app/lib/overlay/queryParams.ts + resolveCampaigns.ts) — "near" is the
 * unchanged default ranking, "selected" needs the campaign picker below it,
 * "all"/"lowest" are read straight from the same public campaign source
 * every other public page uses, never a duplicated list.
 *
 * Both previews mount the REAL `OverlayClient` in `previewMode` (a short,
 * fixed, continuous demo cadence — never the real 1–60 minute interval or
 * long rest period) via the shared `OverlayMiniCanvas` helper — never a
 * static mock or a second hand-maintained visual. They DO immediately
 * reflect a mode/selection change (a dedicated fetch effect below re-pulls
 * `/api/overlay/near` the moment mode/selectedSlugs change, and a
 * `previewKey` forces both `OverlayClient` instances to fully remount so
 * the new campaign set applies at once instead of waiting for the normal
 * ~20s poll cycle) — but never the interval slider, since `previewMode`
 * already ignores real timing entirely regardless of what's fetched.
 *
 * No separate "permanent link" section anymore — the page leads straight
 * with "what to show" → "how often" → the one generated custom URL (with
 * its own copy + معاينة buttons right there) → previews → OBS steps.
 * `overlayUrl` (the plain origin+"/overlay/near", still passed in from the
 * server) is now used ONLY as the base the custom URL is built from, never
 * rendered/copied/opened on its own.
 */
export default function OverlayPromoSection({
  overlayUrl,
  overlayData,
  pickableCampaigns,
}: {
  /** Base URL (current origin + "/overlay/near") the generated custom URL is built from — never shown or opened directly anymore. */
  overlayUrl: string;
  overlayData: OverlayApiResponse;
  pickableCampaigns: PickableCampaign[];
}) {
  // Both starting values come straight from `overlayData.settings` — the
  // SAME resolveOverlayDisplay() output the real overlay itself resolves to
  // for a URL with no query string (see overlay/defaults.ts), never a
  // second independently-chosen starting point. Since the server fetched
  // this with an empty query string (see app/(site)/overlay/page.tsx), it
  // already IS Gharsah's recommended combination: mode="near",
  // intervalMinutes=25 — so the page opens already showing the recommended
  // setup selected, with its "موصى به" badges on, and the config page can
  // never silently drift out of sync with what `/overlay/near` actually
  // defaults to.
  const [mode, setMode] = useState<OverlayMode>(overlayData.settings.mode);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [campaignSearch, setCampaignSearch] = useState("");

  // Moving the slider never writes this back anywhere; it only ever changes
  // the locally-generated custom URL below. Clamped defensively into the
  // 1–60 range even though `overlayData.settings.intervalMinutes` is always
  // already valid coming from the resolver.
  const [intervalMinutes, setIntervalMinutes] = useState(() =>
    Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, overlayData.settings.intervalMinutes ?? OVERLAY_DEFAULT_INTERVAL_MINUTES)),
  );
  const modeParams = useMemo(() => buildModeParams(mode, selectedSlugs), [mode, selectedSlugs]);
  const previewQueryString = useMemo(() => {
    const qs = modeParams.toString();
    return qs ? `?${qs}` : "";
  }, [modeParams]);

  const customOverlayUrl = useMemo(() => {
    const params = new URLSearchParams(modeParams);
    params.set("interval", String(intervalMinutes));
    return `${overlayUrl}?${params.toString()}`;
  }, [overlayUrl, modeParams, intervalMinutes]);

  // Live preview data — re-fetched the moment mode/selection changes (never
  // on an interval change, which previewMode already ignores for timing
  // regardless of what's fetched) so both previews reflect a new mode right
  // away instead of waiting on OverlayClient's own ~20s poll. Falls back to
  // the server-rendered default (mode=near) data before the first fetch
  // resolves or if one ever fails — never a blank preview.
  const [previewData, setPreviewData] = useState<OverlayApiResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function fetchPreview() {
      try {
        const res = await fetch(`/api/overlay/near${previewQueryString}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as OverlayApiResponse;
        if (!cancelled) setPreviewData(data);
      } catch {
        // Keep whatever preview data is already showing; the server-rendered default is always the floor.
      }
    }
    fetchPreview();
    return () => {
      cancelled = true;
    };
  }, [previewQueryString]);

  const effectivePreviewData = previewData ?? overlayData;
  // Forces both preview OverlayClient instances to fully remount (fresh
  // cycle from index 0) whenever the campaign SET changes — OverlayClient's
  // own cycle effect deliberately runs only once per mount (see its doc
  // comment), so a prop change alone wouldn't apply without this.
  const previewKey = `${mode}:${selectedSlugs.join(",")}`;

  function toggleSelectedSlug(slug: string) {
    setSelectedSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  const filteredPickableCampaigns = useMemo(() => {
    const query = campaignSearch.trim();
    if (!query) return pickableCampaigns;
    return pickableCampaigns.filter((c) => c.title.includes(query) || c.subtitle.includes(query));
  }, [pickableCampaigns, campaignSearch]);

  return (
    <div className="mt-16 rounded-2xl border border-primary/20 bg-background/95 p-6 shadow-[0_4px_10px_rgba(20,83,45,0.10),0_32px_64px_-20px_rgba(20,83,45,0.30)] backdrop-blur-sm sm:p-8">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">للبث المباشر</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          يمكنك إضافة هذا الرابط في OBS كمصدر Browser لعرض حالات اقتربت من الاكتمال تلقائيًا أثناء البث.
        </p>
      </div>

      {/* ماذا تريد أن يعرض الأوفرلاي؟ — decides WHAT shows, before anything
          about WHEN/how it's timed or copied. Purely local state; nothing
          here is ever saved to the database. */}
      <div className="mt-6 rounded-xl border border-primary/15 bg-wash/40 p-4 sm:p-5">
        <p className="text-sm font-bold text-foreground">ماذا تريد أن يعرض الأوفرلاي؟</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {MODE_OPTIONS.map((option) => {
            // "near" is Gharsah's featured/recommended overlay mode (see
            // .overlay-mode-featured--selected in globals.css) — a
            // noticeably stronger highlight than a normal selected card,
            // never applied to the other 3 options. The "موصى به" badge
            // stays visible (very subtle) even while a different mode is
            // selected; only the full glow is selection-gated.
            const isFeatured = option.value === "near";
            const isSelected = mode === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? isFeatured
                      ? "overlay-mode-featured--selected"
                      : "border-primary/50 bg-primary-50/60"
                    : "border-primary/15 hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="overlay-mode"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => setMode(option.value)}
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ accentColor: "var(--primary)" }}
                />
                <span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                    {isFeatured && (
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isSelected ? "overlay-mode-featured-badge--selected" : "overlay-mode-featured-badge"
                        }`}
                      >
                        موصى به
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        {mode === "selected" && (
          <div className="mt-4 rounded-xl border border-primary/15 bg-background/60 p-3">
            <input
              type="text"
              value={campaignSearch}
              onChange={(e) => setCampaignSearch(e.target.value)}
              placeholder="ابحث عن حالة بالاسم..."
              className="w-full rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-light/15"
            />
            <div className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
              {filteredPickableCampaigns.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">لا توجد نتائج مطابقة</p>
              ) : (
                filteredPickableCampaigns.map((c) => (
                  <label key={c.slug} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-primary-50/60">
                    <input
                      type="checkbox"
                      checked={selectedSlugs.includes(c.slug)}
                      onChange={() => toggleSelectedSlug(c.slug)}
                      className="h-4 w-4 shrink-0 rounded border-primary-200"
                      style={{ accentColor: "var(--primary)" }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{c.title}</span>
                      <span className="block truncate text-xs text-muted">{c.subtitle}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {selectedSlugs.length > 0 ? `تم اختيار ${selectedSlugs.length} ${selectedSlugs.length === 1 ? "حالة" : "حالات"}` : "لم يتم اختيار أي حالة بعد — سيُستخدم «حالات اقتربت» تلقائيًا حتى تختار"}
            </p>
          </div>
        )}
      </div>

      {/* إعداد الأوفرلاي: a per-streamer timing override, generated into its
          own custom URL alongside the mode chosen above — never saved
          anywhere, never affects the default overlay URL above or the
          admin-configured timing for anyone else. */}
      <div className="mt-6 rounded-xl border border-primary/15 bg-wash/40 p-4 sm:p-5">
        <p className="text-sm font-bold text-foreground">إعداد الأوفرلاي</p>
        <p className="mt-1 text-xs text-muted">اختر الوقت بين ظهور كل حالة والتي تليها في الأوفرلاي، ثم انسخ رابطك المخصص بهذا الإعداد.</p>

        <div className="mt-4">
          <IntervalSlider value={intervalMinutes} onChange={setIntervalMinutes} label="الوقت بين كل حالة وحالة" defaultValue={OVERLAY_DEFAULT_INTERVAL_MINUTES} />
        </div>

        <div className="mt-4">
          <GeneratedUrlBox url={customOverlayUrl} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="mx-auto w-full max-w-sm sm:mx-0">
          <OverlayMiniCanvas
            label="معاينة مصغرة"
            hint="تكبير حقيقي على البطاقة نفسها — نفس البيانات والتصميم بالضبط"
            canvasWidth={cardWidthPx(effectivePreviewData) / SMALL_PREVIEW_FILL_RATIO}
            center
            renderOverlay={(center) => <OverlayClient key={previewKey} initialData={effectivePreviewData} previewMode center={center} />}
          />
        </div>
        <OverlayMiniCanvas
          label="معاينة كبيرة"
          hint="نفس مكوّن الأوفرلاي الحقيقي، بحجم أكبر لفحص النص والتباعد والشفافية بدقة"
          renderOverlay={(center) => <OverlayClient key={previewKey} initialData={effectivePreviewData} previewMode center={center} />}
        />
      </div>

      <ObsInstructions />
    </div>
  );
}
