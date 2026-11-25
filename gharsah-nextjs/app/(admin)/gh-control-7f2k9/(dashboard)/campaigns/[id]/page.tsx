import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCampaignRowById } from "@/app/lib/db/campaignsRepo";
import { getPlatforms } from "@/app/lib/db/settings";
import { campaignEngagement } from "@/app/lib/db/analyticsRepo";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import CampaignForm, { type CampaignFormValues, type CampaignTranslationInfo } from "@/app/components/admin/CampaignForm";
import CampaignEditToolbar from "@/app/components/admin/CampaignEditToolbar";
import ShortLinkPanel from "@/app/components/admin/ShortLinkPanel";
import { updateCampaignAction } from "../actions";
import { campaignFieldStatuses, campaignTranslationError } from "@/app/lib/translation/campaignTranslation";
import { isLiveReplaceable, isSettled, parseManual, parseMeta, TRANSLATED_FIELDS, type TranslatedField } from "@/app/lib/translation/meta";
import { isValidEnglish, normalizeArabic } from "@/app/lib/translation/arabic";
import { getTranslationEngineHealth } from "@/app/lib/translate";
import { getLiveCampaignTexts } from "@/app/lib/campaignLiveSync";
import { cacheKey, getCachedTranslations } from "@/app/lib/db/translationCache";
import { knownDescriptionEnglish } from "@/app/lib/translation/knownTexts";
import Link from "next/link";

export const metadata: Metadata = { title: "تعديل حملة | لوحة تحكم غرسة" };

export default async function EditCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const campaign = await getCampaignRowById(id);
  if (!campaign) notFound();

  const platforms = await getPlatforms();
  const boundAction = updateCampaignAction.bind(null, id);

  const initialValues: CampaignFormValues = {
    slug: campaign.slug,
    platform: campaign.platform,
    url: campaign.url,
    username: campaign.username ?? "",
    memorialPrefixAr: campaign.memorial_prefix_ar ?? "",
    relationAr: campaign.relation_ar ?? "",
    titleAr: campaign.title_ar,
    titleSource: campaign.title_source ?? "",
    descriptionAr: campaign.description_ar ?? "",
    descriptionSource: campaign.description_source ?? "",
    status: campaign.status === "completed" ? "completed" : "active",
    percent: campaign.percent !== null ? String(campaign.percent) : "",
  };

  const engagementRows = await campaignEngagement();
  const engagement = engagementRows.find((c) => c.campaignId === id);

  // Statuses are derived from the provenance metadata + current text, never
  // from the stored translation_status flag alone (older rows can carry a
  // stale "ok" or an outdated error message).
  const statuses = campaignFieldStatuses(campaign);
  const meta = parseMeta(campaign.translation_meta);
  const [engine, live] = await Promise.all([getTranslationEngineHealth(), getLiveCampaignTexts(campaign.platform, campaign.url)]);
  // Only fields whose English live sync may replace (see isLiveReplaceable) —
  // hand-typed/reviewed/hand-authored English is shown as-is regardless.
  const manualSet = parseManual(campaign.translation_manual);
  const liveDiffers = {
    title:
      Boolean(live?.title && normalizeArabic(live.title) !== normalizeArabic(campaign.title_ar)) &&
      isLiveReplaceable(campaign.title_en, manualSet.has("title"), meta.title),
    description:
      Boolean(live?.description && normalizeArabic(live.description) !== normalizeArabic(campaign.description_ar ?? "")) &&
      isLiveReplaceable(campaign.description_en, manualSet.has("description"), meta.description),
  };
  const liveCache = await getCachedTranslations([
    ...(liveDiffers.title && live?.title ? [cacheKey("title", live.title)] : []),
    ...(liveDiffers.description && live?.description ? [cacheKey("description", live.description)] : []),
  ]);
  const liveState = (field: "title" | "description"): CampaignTranslationInfo["live"][typeof field] => {
    const text = live?.[field];
    if (!liveDiffers[field] || !text) return null;
    const known = field === "description" ? knownDescriptionEnglish(text) : null;
    return { arabic: text, english: known ?? liveCache.get(cacheKey(field, text))?.english ?? null };
  };
  const field = (key: TranslatedField, english: string) => ({
    status: statuses[key],
    english: isValidEnglish(english) ? english : "",
    error: statuses[key] === "failed" || statuses[key] === "pending" ? (meta[key]?.pending?.error ?? null) : null,
  });

  const translation: CampaignTranslationInfo = {
    // Only valid English pre-fills the editable inputs — older rows may still
    // hold Arabic in *_en columns, which must never be resubmitted as English.
    titleEn: isValidEnglish(campaign.title_en) ? campaign.title_en : "",
    relationEn: isValidEnglish(campaign.relation_en) ? campaign.relation_en : "",
    descriptionEn: isValidEnglish(campaign.description_en) ? campaign.description_en : "",
    memorialPrefixEn: campaign.memorial_prefix_en ?? "",
    status: TRANSLATED_FIELDS.every((f) => isSettled(statuses[f])) ? "ok" : "error",
    error: campaignTranslationError(campaign),
    manualFields: (campaign.translation_manual ?? "").split(",").filter(Boolean),
    fields: {
      title: field("title", campaign.title_en),
      relation: field("relation", campaign.relation_en),
      description: field("description", campaign.description_en),
    },
    engine,
    live: { title: liveState("title"), description: liveState("description") },
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">تعديل الحملة</h1>
          <p dir="ltr" className="mt-1 text-xs text-muted">
            /cases/active/{campaign.slug}
          </p>
          {created && (
            <p className="mt-2 inline-block rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-dark">
              تم إنشاء الحملة بنجاح ✓
            </p>
          )}
          {campaign.archived_at && (
            <p className="mt-2 inline-block rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              هذه الحملة مؤرشفة ولا تظهر في الموقع العام
            </p>
          )}
        </div>
        <CampaignEditToolbar campaignId={id} slug={campaign.slug} archived={Boolean(campaign.archived_at)} />
      </div>

      <ShortLinkPanel campaignId={id} initialCode={campaign.short_code} />

      {engagement && (
        <div className="mb-6 rounded-2xl border border-border bg-wash/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-foreground">إحصائيات التفاعل (بيانات حقيقية من الموقع العام)</p>
            <Link href={`${ADMIN_BASE_PATH}/statistics`} className="text-[11px] font-semibold text-primary hover:underline">
              التفاصيل الكاملة ←
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div>
              <p className="text-lg font-extrabold text-foreground">{engagement.views}</p>
              <p className="text-[11px] text-muted">مشاهدات الحالة</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground">{engagement.cardClicks}</p>
              <p className="text-[11px] text-muted">فتح من البطاقة</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-primary">{engagement.donationClicks}</p>
              <p className="text-[11px] text-muted">ضغطات التبرع</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground">{engagement.linkCopies}</p>
              <p className="text-[11px] text-muted">نسخ الرابط</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground">{Math.round(engagement.ctr * 100)}%</p>
              <p className="text-[11px] text-muted">CTR</p>
            </div>
          </div>
        </div>
      )}

      <CampaignForm
        mode="edit"
        campaignId={id}
        action={boundAction}
        initialValues={initialValues}
        platforms={platforms}
        translation={translation}
      />
    </div>
  );
}
