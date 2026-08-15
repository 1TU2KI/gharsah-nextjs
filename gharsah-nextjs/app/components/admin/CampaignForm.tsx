"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emptyCampaignFormState, type CampaignFormState } from "@/app/lib/admin/campaignSchema";
import { MEMORIAL_PREFIX_OPTIONS, MEMORIAL_PREFIX_EN } from "@/app/lib/admin/memorialPrefixOptions";
import type { PlatformConfig } from "@/app/lib/db/settings";
import type { Campaign } from "@/app/lib/campaigns";
import { LanguageProvider } from "@/app/lib/i18n/LanguageProvider";
import CampaignCard from "@/app/components/home/CampaignCard";
import { retryCampaignTranslationAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/campaigns/actions";
import { fetchOfficialCampaignContentAction } from "@/app/lib/admin/fetchOfficialCampaignContent";

export type CampaignFormValues = {
  slug: string;
  platform: string;
  url: string;
  username: string;
  memorialPrefixAr: string;
  /** "العنوان الفرعي" — combined publicly with @username and صيغة الترحم into one line (see MemorialLine in CampaignCard.tsx). Holds only its own piece of that line, e.g. "عن ولد عم يوسف". */
  relationAr: string;
  titleAr: string;
  /** How titleAr got its current value — see the column comment on `title_source` in db/client.ts. `""` means neither has happened yet (brand-new blank form). */
  titleSource: "fetched" | "manual" | "";
  descriptionAr: string;
  /** How descriptionAr got its current value — see the column comment on `description_source` in db/client.ts. `""` means neither has happened yet (brand-new blank form). */
  descriptionSource: "fetched" | "manual" | "";
  status: "active" | "completed";
  percent: string;
};

function isEhsanUrl(url: string): boolean {
  try {
    return new URL(url).hostname.replace(/^www\./, "").includes("ehsan.sa");
  } catch {
    return false;
  }
}

/** The current AI-generated English text — read-only in this form, shown so the admin can see what's published without needing to (or being able to) edit it directly. `undefined` in create mode, where nothing has been translated yet. */
export type CampaignTranslationInfo = {
  titleEn: string;
  relationEn: string;
  descriptionEn: string;
  memorialPrefixEn: string;
  status: "ok" | "error";
  error: string | null;
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted focus:border-primary-light focus:ring-4 focus:ring-primary-light/15 [&.error]:border-red-400";
const labelClass = "text-xs font-semibold text-foreground";
const errorClass = "mt-1 text-xs font-medium text-red-600";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className={errorClass}>{message}</p>;
}

export default function CampaignForm({
  mode,
  campaignId,
  action,
  initialValues,
  platforms,
  sourceRequestId,
  translation,
}: {
  mode: "create" | "edit";
  /** Only present in edit mode — needed to call the retry-translation action. */
  campaignId?: string;
  action: (prevState: CampaignFormState, formData: FormData) => Promise<CampaignFormState>;
  initialValues: CampaignFormValues;
  platforms: PlatformConfig[];
  sourceRequestId?: string;
  translation?: CampaignTranslationInfo;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, emptyCampaignFormState);
  const [values, setValues] = useState<CampaignFormValues>(initialValues);
  const [showPreview, setShowPreview] = useState(true);
  const [retrying, startRetry] = useTransition();

  // Separate transitions/errors per field (not one shared pair) so fetching
  // one doesn't show a "جارٍ الجلب..." spinner on the other field's button,
  // and a failure on one never overwrites the other's error message. Plain
  // booleans (not `useTransition`'s pending flag) for the "in flight" state
  // specifically because the auto-fetch effect below needs to mark BOTH
  // fields as fetching from ONE shared network call, which doesn't fit
  // `startTransition`'s one-callback-one-pending-flag shape.
  const [titleFetching, setTitleFetching] = useState(false);
  const [titleFetchError, setTitleFetchError] = useState<string | null>(null);
  const [descriptionFetching, setDescriptionFetching] = useState(false);
  const [descriptionFetchError, setDescriptionFetchError] = useState<string | null>(null);
  // Set only when a fresh fetch would overwrite an existing, non-empty
  // value — holds the fetched text until the admin explicitly chooses to
  // replace or discard it, per "do NOT silently overwrite".
  const [pendingFetchedTitle, setPendingFetchedTitle] = useState<string | null>(null);
  const [pendingFetchedDescription, setPendingFetchedDescription] = useState<string | null>(null);

  // The controlled list only has four values — if this campaign's stored
  // phrase predates it (e.g. "رحمها الله", used by most of the original
  // seed data) and doesn't match any of them, it has to appear as an extra
  // selectable option so it stays selected by default. Otherwise the
  // <select> would silently fall back to its first option ("بدون صيغة
  // ترحم") and save that over the real value the moment the admin saves
  // any other change — exactly the "don't break existing campaigns" case
  // this form has to avoid.
  const legacyMemorialPrefix =
    initialValues.memorialPrefixAr && !MEMORIAL_PREFIX_OPTIONS.some((opt) => opt.value === initialValues.memorialPrefixAr)
      ? initialValues.memorialPrefixAr
      : null;

  function set<K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleRetryTranslation() {
    if (!campaignId) return;
    startRetry(async () => {
      // No separate error state here on purpose: retryCampaignTranslationAction
      // persists whatever it computed (success or failure) to the same
      // translation_status/translation_error columns the `translation` prop
      // already reads, so router.refresh() alone brings this panel's
      // existing status badge + error text up to date. Tracking the result
      // in its own state too would just render the identical message twice.
      await retryCampaignTranslationAction(campaignId);
      router.refresh();
    });
  }

  /** Manual "fetch now" button for the title. Never overwrites existing text silently — if the field already holds a title, the fetched text is held in `pendingFetchedTitle` for the admin to explicitly replace or discard. */
  async function handleFetchTitle() {
    if (!values.url.trim()) {
      setTitleFetchError("أدخل رابط الحملة الرسمي أولًا.");
      return;
    }
    setTitleFetchError(null);
    setTitleFetching(true);
    try {
      const result = await fetchOfficialCampaignContentAction(values.url);
      if (!result.ok) {
        setTitleFetchError(result.message);
        return;
      }
      if (!result.title) {
        setTitleFetchError("لم يتم العثور على عنوان رسمي في صفحة الحملة.");
        return;
      }
      if (values.titleAr.trim()) {
        setPendingFetchedTitle(result.title);
      } else {
        set("titleAr", result.title);
        set("titleSource", "fetched");
      }
    } finally {
      setTitleFetching(false);
    }
  }

  /** Manual "fetch now" button for the description — see handleFetchTitle above; identical shape, separate field. */
  async function handleFetchDescription() {
    if (!values.url.trim()) {
      setDescriptionFetchError("أدخل رابط الحملة الرسمي أولًا.");
      return;
    }
    setDescriptionFetchError(null);
    setDescriptionFetching(true);
    try {
      const result = await fetchOfficialCampaignContentAction(values.url);
      if (!result.ok) {
        setDescriptionFetchError(result.message);
        return;
      }
      if (!result.description) {
        setDescriptionFetchError("لم يتم العثور على وصف رسمي في صفحة الحملة.");
        return;
      }
      if (values.descriptionAr.trim()) {
        setPendingFetchedDescription(result.description);
      } else {
        set("descriptionAr", result.description);
        set("descriptionSource", "fetched");
      }
    } finally {
      setDescriptionFetching(false);
    }
  }

  function applyFetchedTitle() {
    if (!pendingFetchedTitle) return;
    set("titleAr", pendingFetchedTitle);
    set("titleSource", "fetched");
    setPendingFetchedTitle(null);
  }

  function applyFetchedDescription() {
    if (!pendingFetchedDescription) return;
    set("descriptionAr", pendingFetchedDescription);
    set("descriptionSource", "fetched");
    setPendingFetchedDescription(null);
  }

  // Auto-fetch, create mode only: as soon as the admin has entered an Ehsan
  // URL, try once to pre-fill whichever of title/description are still
  // blank — one shared fetch of the campaign page for both fields (see
  // fetchOfficialCampaignContent.ts), never re-fetched a second time just
  // because the other field also needed it. Still fully editable afterward,
  // never blocks saving if it fails. Never runs in edit mode (an existing
  // campaign's title/description are never silently replaced) and never
  // re-attempts for a URL it already tried.
  const autoFetchAttempted = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "create") return;
    if (!values.url.trim()) return;
    if (values.titleAr.trim() && values.descriptionAr.trim()) return;
    if (autoFetchAttempted.current === values.url) return;
    if (!isEhsanUrl(values.url)) return;

    autoFetchAttempted.current = values.url;
    const timer = setTimeout(() => {
      const wantsTitle = !values.titleAr.trim();
      const wantsDescription = !values.descriptionAr.trim();
      if (wantsTitle) setTitleFetching(true);
      if (wantsDescription) setDescriptionFetching(true);

      fetchOfficialCampaignContentAction(values.url)
        .then((result) => {
          if (!result.ok) {
            // Surfaced as a quiet, non-fatal note next to whichever
            // field(s) were still empty — the admin can still type either
            // manually.
            if (result.reason !== "unsupported-platform") {
              if (wantsTitle) setTitleFetchError(result.message);
              if (wantsDescription) setDescriptionFetchError(result.message);
            }
            return;
          }
          if (wantsTitle && result.title) {
            set("titleAr", result.title);
            set("titleSource", "fetched");
            setTitleFetchError(null);
          }
          if (wantsDescription && result.description) {
            set("descriptionAr", result.description);
            set("descriptionSource", "fetched");
            setDescriptionFetchError(null);
          }
        })
        .finally(() => {
          if (wantsTitle) setTitleFetching(false);
          if (wantsDescription) setDescriptionFetching(false);
        });
      // Debounced so it doesn't fire on every keystroke while the URL is
      // still being typed/pasted.
    }, 700);
    return () => clearTimeout(timer);
    // `set`/`values.titleAr`/`values.descriptionAr` intentionally excluded:
    // this should only re-evaluate when the URL itself settles, checked
    // against whatever the two fields held at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.url, mode]);

  const previewCampaign: Campaign = useMemo(() => {
    // The preview builds a Campaign-shaped object client-side (never through
    // the DB-backed rowToCampaign mapper), so platform display fields are
    // resolved here from the `platforms` prop the server already passed in
    // — never from a DB call, which would pull node:sqlite into the bundle.
    // Arabic-only, matching this form's own input language — the read-only
    // English translation is shown separately below (see the sidebar panel).
    const platformConfig = platforms.find((p) => p.value === values.platform);
    const memorialPrefixEn = values.memorialPrefixAr ? MEMORIAL_PREFIX_EN[values.memorialPrefixAr] ?? values.memorialPrefixAr : "";

    return {
      // Only ever used by CampaignCard's click handler to tag an analytics
      // event — this live preview card is unclickable (pointer-events-none
      // on its wrapper below), so "preview" here can never actually reach
      // the analytics table as a fake campaign id.
      id: campaignId ?? "preview",
      slug: values.slug || "preview",
      order: 0,
      url: values.url || "https://example.com",
      platform: values.platform,
      memorialPrefix: values.memorialPrefixAr.trim() ? { ar: values.memorialPrefixAr, en: memorialPrefixEn } : undefined,
      username: values.username.trim() || undefined,
      relation: { ar: values.relationAr.trim() || "—", en: values.relationAr.trim() || "—" },
      title: { ar: values.titleAr || "عنوان الحملة", en: values.titleAr || "Campaign title" },
      status: values.status,
      description: { ar: values.descriptionAr || undefined, en: values.descriptionAr || "" },
      percent: values.percent ? Number(values.percent) : undefined,
      platformLabel: platformConfig ? { ar: platformConfig.labelAr, en: platformConfig.labelEn } : { ar: values.platform, en: values.platform },
      platformLogo: platformConfig?.logo ?? null,
      platformHomepageUrl: platformConfig?.homepageUrl ?? "#",
      // The preview card never renders a short-link affordance, so this is
      // never read — null keeps it honest rather than inventing one.
      shortCode: null,
    };
  }, [values, platforms, campaignId]);

  const errors = state.fieldErrors;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form action={formAction} className="space-y-6">
        {sourceRequestId && <input type="hidden" name="sourceRequestId" value={sourceRequestId} />}

        {state.formError && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{state.formError}</p>
        )}

        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">عنوان الحملة الرسمي</h2>
          <p className="mt-1 text-xs text-muted">
            عنوان الحملة كما ورد في منصة التبرع نفسها — وليس اسم المستخدم أو صلة القرابة أو عبارة الترحّم.
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <label className={labelClass} htmlFor="titleAr">
                العنوان الرسمي
              </label>
              <button
                type="button"
                onClick={handleFetchTitle}
                disabled={titleFetching || !values.url.trim()}
                className="shrink-0 rounded-lg border border-primary-light/50 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {titleFetching ? "جارٍ الجلب..." : "جلب العنوان الرسمي تلقائيًا"}
              </button>
            </div>
            <input
              id="titleAr"
              name="titleAr"
              value={values.titleAr}
              onChange={(e) => {
                set("titleAr", e.target.value);
                set("titleSource", "manual");
              }}
              className={`${fieldClass} ${errors.titleAr ? "error" : ""}`}
            />
            <input type="hidden" name="titleSource" value={values.titleSource} />
            <FieldError message={errors.titleAr} />

            {titleFetchError && <p className="mt-1.5 text-xs text-red-600">{titleFetchError}</p>}

            {pendingFetchedTitle && (
              <div className="mt-2 rounded-lg border border-primary-light/40 bg-primary-50 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  الحقل يحتوي عنوانًا حاليًا — تم جلب عنوان رسمي جديد من صفحة الحملة:
                </p>
                <p className="mt-1.5 text-muted">{pendingFetchedTitle}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={applyFetchedTitle}
                    className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-on-accent"
                  >
                    استبدال بالنص الجديد
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingFetchedTitle(null)}
                    className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground"
                  >
                    تجاهل
                  </button>
                </div>
              </div>
            )}

            {!pendingFetchedTitle && values.titleAr.trim() && !errors.titleAr && (
              <p className="mt-1.5 text-[11px] font-medium text-muted">
                {values.titleSource === "fetched" ? "تم الجلب تلقائيًا" : "أُدخل يدويًا"}
              </p>
            )}
          </div>
        </section>

        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">الأساسيات</h2>
          <p className="mt-1 text-xs text-muted">أدخل المحتوى بالعربية فقط — تُنشأ النسخة الإنجليزية تلقائيًا عند الحفظ.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="relationAr">
                العنوان الفرعي
              </label>
              <input
                id="relationAr"
                name="relationAr"
                value={values.relationAr}
                onChange={(e) => set("relationAr", e.target.value)}
                placeholder="مثال: عن ولد عم يوسف"
                className={`${fieldClass} ${errors.relationAr ? "error" : ""}`}
              />
              <FieldError message={errors.relationAr} />
            </div>

            <div>
              <label className={labelClass} htmlFor="memorialPrefixAr">
                صيغة الترحّم
              </label>
              <select
                id="memorialPrefixAr"
                name="memorialPrefixAr"
                value={values.memorialPrefixAr}
                onChange={(e) => set("memorialPrefixAr", e.target.value)}
                className={fieldClass}
              >
                {legacyMemorialPrefix && <option value={legacyMemorialPrefix}>{legacyMemorialPrefix} (القيمة الحالية)</option>}
                {MEMORIAL_PREFIX_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="username">
                اسم المستخدم/المعرّف
              </label>
              <input
                id="username"
                name="username"
                dir="ltr"
                placeholder="username"
                value={values.username}
                onChange={(e) => set("username", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="slug">
                الرابط الداخلي (slug)
              </label>
              <input
                id="slug"
                name="slug"
                dir="ltr"
                value={values.slug}
                onChange={(e) => set("slug", e.target.value)}
                className={`${fieldClass} ${errors.slug ? "error" : ""}`}
              />
              <p className="mt-1 text-[11px] text-muted" dir="ltr">
                /cases/active/{values.slug || "..."}
              </p>
              <FieldError message={errors.slug} />
            </div>
          </div>

          {/* Live preview of exactly how these three fields combine into the
              one public memorial line (see MemorialLine in CampaignCard.tsx)
              — kept right here, next to the fields that build it, in
              addition to the full card preview in the sidebar. */}
          <div className="mt-4 rounded-xl bg-wash/70 px-4 py-3">
            <p className="text-[11px] font-semibold text-muted">معاينة السطر الفرعي كما يظهر للزوار</p>
            <p className="mt-1 text-sm font-medium text-foreground" dir="rtl">
              {values.relationAr.trim() || values.username.trim() || values.memorialPrefixAr.trim() ? (
                <>
                  {values.relationAr.trim()}
                  {values.username.trim() && (
                    <>
                      {" "}
                      <bdi dir="ltr">@{values.username.trim()}</bdi>
                    </>
                  )}
                  {values.memorialPrefixAr.trim() && ` ${values.memorialPrefixAr.trim()}`}
                </>
              ) : (
                <span className="text-muted">—</span>
              )}
            </p>
          </div>
        </section>

        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">وصف الحملة الرسمي</h2>
          <p className="mt-1 text-xs text-muted">
            وصف الحملة كما ورد في منصة التبرع نفسها — وليس صلة القرابة أو أي عبارة تذكارية.
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <label className={labelClass} htmlFor="descriptionAr">
                الوصف الرسمي — اختياري
              </label>
              <button
                type="button"
                onClick={handleFetchDescription}
                disabled={descriptionFetching || !values.url.trim()}
                className="shrink-0 rounded-lg border border-primary-light/50 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {descriptionFetching ? "جارٍ الجلب..." : "جلب الوصف الرسمي تلقائيًا"}
              </button>
            </div>
            <textarea
              id="descriptionAr"
              name="descriptionAr"
              rows={4}
              value={values.descriptionAr}
              onChange={(e) => {
                set("descriptionAr", e.target.value);
                set("descriptionSource", "manual");
              }}
              className={`${fieldClass} resize-none`}
            />
            <input type="hidden" name="descriptionSource" value={values.descriptionSource} />

            {descriptionFetchError && <p className="mt-1.5 text-xs text-red-600">{descriptionFetchError}</p>}

            {pendingFetchedDescription && (
              <div className="mt-2 rounded-lg border border-primary-light/40 bg-primary-50 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  الحقل يحتوي وصفًا حاليًا — تم جلب وصف رسمي جديد من صفحة الحملة:
                </p>
                <p className="mt-1.5 max-h-28 overflow-y-auto whitespace-pre-wrap text-muted">{pendingFetchedDescription}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={applyFetchedDescription}
                    className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-on-accent"
                  >
                    استبدال بالنص الجديد
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingFetchedDescription(null)}
                    className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground"
                  >
                    تجاهل
                  </button>
                </div>
              </div>
            )}

            {!pendingFetchedDescription && values.descriptionAr.trim() && (
              <p className="mt-1.5 text-[11px] font-medium text-muted">
                {values.descriptionSource === "fetched" ? "تم الجلب تلقائيًا" : "أُدخل يدويًا"}
              </p>
            )}

            <p className="mt-1 text-[11px] text-muted">
              لحملات منصة إحسان، يُعرض للزوار وصف مباشر يتحدّث تلقائيًا كل ساعة من صفحة الحملة إن توفر — هذا الحقل
              يُستخدم عند تعذّر ذلك التحديث المباشر، ولمنصات التبرع الأخرى التي لا تدعم الجلب التلقائي بعد.
            </p>
          </div>
        </section>

        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">المنصة والرابط الرسمي</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="platform">
                منصة التبرع
              </label>
              <select
                id="platform"
                name="platform"
                value={values.platform}
                onChange={(e) => set("platform", e.target.value)}
                className={fieldClass}
              >
                {platforms.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.labelAr}
                  </option>
                ))}
              </select>
              <FieldError message={errors.platform} />
            </div>
            <div>
              <label className={labelClass} htmlFor="url">
                رابط الحملة الرسمي
              </label>
              <input
                id="url"
                name="url"
                dir="ltr"
                placeholder="https://ehsan.sa/campaign/XXXXXXXXXX"
                value={values.url}
                onChange={(e) => set("url", e.target.value)}
                className={`${fieldClass} ${errors.url ? "error" : ""}`}
              />
              <FieldError message={errors.url} />
              {values.url && !errors.url && (
                <a
                  href={values.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="mt-1 block truncate text-[11px] font-medium text-primary hover:underline"
                >
                  فتح للتحقق ↗ {values.url}
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">الحالة والتقدّم</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="status">
                حالة الحملة
              </label>
              <select
                id="status"
                name="status"
                value={values.status}
                onChange={(e) => set("status", e.target.value as "active" | "completed")}
                className={fieldClass}
              >
                <option value="active">نشطة</option>
                <option value="completed">مكتملة</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="percent">
                نسبة الإنجاز % — اختياري
              </label>
              <input
                id="percent"
                name="percent"
                type="number"
                min={0}
                max={100}
                dir="ltr"
                value={values.percent}
                onChange={(e) => set("percent", e.target.value)}
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-muted">
                لحملات منصة إحسان، تُستبدل هذه القيمة تلقائيًا كل ساعة بالنسبة الفعلية من صفحة الحملة.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-sm transition-all hover:bg-accent-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "جارٍ الحفظ والترجمة..." : mode === "create" ? "إنشاء الحملة" : "حفظ التغييرات"}
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

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-border bg-wash p-4">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-bold text-foreground"
          >
            معاينة كما تظهر للزوار (عربي)
            <span className="text-muted">{showPreview ? "إخفاء" : "إظهار"}</span>
          </button>

          {showPreview && (
            <div className="pointer-events-none mt-4">
              <LanguageProvider>
                <CampaignCard campaign={previewCampaign} />
              </LanguageProvider>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground">الترجمة الإنجليزية (تلقائية)</h3>
            {translation?.status === "error" && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">تعذرت الترجمة — حاول مجددًا</span>
            )}
            {translation?.status === "ok" && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary">الترجمة جاهزة</span>
            )}
          </div>

          {!translation && <p className="mt-2 text-xs text-muted">ستُنشأ الترجمة تلقائيًا بعد إنشاء الحملة.</p>}

          {translation && (
            <div dir="ltr" className="mt-3 space-y-2 text-start text-xs text-foreground">
              <p className="font-semibold text-foreground">{translation.titleEn || "—"}</p>
              {translation.relationEn && <p>{translation.relationEn}</p>}
              {translation.memorialPrefixEn && <p className="italic text-muted">{translation.memorialPrefixEn}</p>}
              {translation.descriptionEn && <p className="leading-6 text-muted">{translation.descriptionEn}</p>}
            </div>
          )}

          {translation?.status === "error" && (
            <p className="mt-3 text-xs text-red-600">{translation.error}</p>
          )}

          {campaignId && (
            <button
              type="button"
              onClick={handleRetryTranslation}
              disabled={retrying}
              className="mt-3 w-full rounded-lg border border-border py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-wash disabled:opacity-50"
            >
              {retrying ? "جارٍ إعادة الترجمة..." : "إعادة إنشاء الترجمة"}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
