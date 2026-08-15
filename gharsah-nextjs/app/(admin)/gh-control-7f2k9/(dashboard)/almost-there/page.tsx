import type { Metadata } from "next";
import Link from "next/link";
import { getAlmostThereCampaigns } from "@/app/lib/almostThere";
import { shortLinkStats } from "@/app/lib/db/analyticsRepo";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

export const metadata: Metadata = { title: "اقتربت... | لوحة تحكم غرسة" };

/** Wider than the homepage's own top-3 — lets the admin see who's next in line, not just who's currently picked. */
const ADMIN_ALMOST_THERE_LIMIT = 10;

/**
 * Read-only view of the same ranking the homepage's اقتربت... section
 * computes (see almostThere.ts) — the admin can inspect it, but there is
 * deliberately no manual override here, per the brief ("ranking must remain
 * automatic"). Short-link funnel numbers come from shortLinkStats(), real
 * tracked events only — never presented as confirmed donations.
 */
export default async function AlmostTherePage() {
  const campaigns = await getAlmostThereCampaigns(ADMIN_ALMOST_THERE_LIMIT);
  const stats = await shortLinkStats();
  const statsById = new Map(stats.map((s) => [s.campaignId, s]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">اقتربت...</h1>
        <p className="mt-1 text-sm text-muted">
          الترتيب تلقائي بالكامل حسب نسبة الإنجاز الحالية للحملات النشطة — أول 3 حملات هنا هي المعروضة فعليًا في قسم
          «اقتربت...» بالموقع العام.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-start text-sm">
            <thead>
              <tr className="border-b border-primary-100 bg-wash/70 text-xs font-semibold text-muted">
                <th className="px-3 py-3 text-start">#</th>
                <th className="px-3 py-3 text-start">الحملة</th>
                <th className="px-3 py-3 text-start">النسبة الحالية</th>
                <th className="px-3 py-3 text-start">المتبقي</th>
                <th className="px-3 py-3 text-start">الرابط المختصر</th>
                <th className="px-3 py-3 text-start" title="عدد مرات فتح الرابط المختصر gharsah.sa/c/...">
                  فتحات الرابط
                </th>
                <th className="px-3 py-3 text-start" title="ضغطات زر التبرع بعد وصول موثّق عبر الرابط المختصر — ضغطات نحو المنصة الرسمية، وليست تبرعات مؤكدة">
                  ضغطات تبرع (عبر الرابط)
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted">
                    لا توجد حملات نشطة تحمل نسبة إنجاز معروفة حاليًا
                  </td>
                </tr>
              )}
              {campaigns.map((campaign, index) => {
                const s = statsById.get(campaign.id);
                const percent = campaign.percent ?? 0;
                const isHomepagePick = index < 3;
                return (
                  <tr
                    key={campaign.id}
                    className={`border-b border-wash last:border-0 hover:bg-wash/60 ${isHomepagePick ? "bg-primary-50/40" : ""}`}
                  >
                    <td className="px-3 py-3 text-xs font-bold text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        {index + 1}
                        {isHomepagePick && (
                          <span className="rounded-full bg-primary-dark px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                            الموقع
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="max-w-[16rem] px-3 py-3">
                      <Link
                        href={`${ADMIN_BASE_PATH}/campaigns/${campaign.id}`}
                        className="block truncate font-semibold text-foreground hover:text-primary-dark"
                      >
                        {campaign.title.ar}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-primary-dark">{percent}%</td>
                    <td className="px-3 py-3 text-xs text-muted">{Math.max(0, 100 - percent)}%</td>
                    <td dir="ltr" className="px-3 py-3 text-xs text-muted">
                      {campaign.shortCode ? `c/${campaign.shortCode}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">{s?.opens ?? 0}</td>
                    <td className="px-3 py-3 text-xs text-muted">{s?.attributedDonationClicks ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        أرقام الضغطات تعكس التوجّه نحو المنصة الرسمية، وليست تأكيدًا لتبرعات فعلية.
      </p>
    </div>
  );
}
