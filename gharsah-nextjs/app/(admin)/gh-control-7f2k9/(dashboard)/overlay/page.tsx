import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { getOverlaySettings } from "@/app/lib/db/settings";
import { buildOverlayResponse } from "@/app/lib/overlay/data";
import { getAlmostThereCampaigns } from "@/app/lib/almostThere";
import { shortLinkStats } from "@/app/lib/db/analyticsRepo";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import OverlaySettingsPanel from "@/app/components/admin/OverlaySettingsPanel";

export const metadata: Metadata = { title: "أوفرلاي البث | لوحة تحكم غرسة" };

/**
 * Admin home for the OBS overlay system. Reads the SAME `getOverlaySettings`
 * the public API reads (so "what's saved" and "what OBS sees" can never
 * drift) and builds the live preview via the SAME `buildOverlayResponse`
 * the overlay page/API use — the preview campaign is a real current
 * "اقتربت..." pick, not a mock. Analytics below deliberately reuses
 * `shortLinkStats()` (same numbers as the `/almost-there` admin page)
 * rather than inventing an "overlay views" metric that isn't technically
 * obtainable — see the note in the section itself.
 */
export default async function OverlayAdminPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const settings = await getOverlaySettings();
  const preview = await buildOverlayResponse(new URLSearchParams(), origin);
  const nearCampaigns = await getAlmostThereCampaigns(10);
  const stats = await shortLinkStats();
  const statsById = new Map(stats.map((s) => [s.campaignId, s]));

  const totalOpens = nearCampaigns.reduce((sum, c) => sum + (statsById.get(c.id)?.opens ?? 0), 0);
  const totalDonationClicks = nearCampaigns.reduce((sum, c) => sum + (statsById.get(c.id)?.attributedDonationClicks ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">أوفرلاي البث (OBS)</h1>
        <p className="mt-1 text-sm text-muted">
          أضف رابط الأوفرلاي داخل OBS كمصدر Browser ليعرض تلقائيًا أقرب الحملات لاكتمال «اقتربت...» — نفس ترتيب القسم في الموقع العام، يتحدّث ذاتيًا دون أي تدخل يدوي.
        </p>
      </div>

      <OverlaySettingsPanel initialSettings={settings} previewCampaign={preview.campaigns[0] ?? null} origin={origin} />

      <div className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
        <h2 className="text-sm font-bold text-foreground">أداء الروابط المختصرة (عام، وليس حصريًا للأوفرلاي)</h2>
        <p className="mt-1 text-xs text-muted">
          هذه أرقام فتحات الرابط المختصر <code dir="ltr">gharsah.sa/c/...</code> لنفس الحملات الظاهرة في «اقتربت...»، من كل المصادر مجتمعة. لا توجد طريقة تقنية موثوقة لعزل الزيارات القادمة تحديدًا من نافذة الأوفرلاي داخل البث (المشاهد يكتب الرابط يدويًا)، لذلك لا تُعرض هذه الأرقام كأداء حصري للأوفرلاي. التفاصيل لكل حملة على حدة في{" "}
          <Link href={`${ADMIN_BASE_PATH}/almost-there`} className="font-semibold text-primary-dark hover:underline">
            صفحة اقتربت...
          </Link>
          .
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-wash/50 p-4">
            <p className="text-2xl font-extrabold text-primary-dark">{totalOpens}</p>
            <p className="mt-1 text-xs text-muted">إجمالي فتحات الروابط المختصرة لهذه الحملات</p>
          </div>
          <div className="rounded-xl border border-border bg-wash/50 p-4">
            <p className="text-2xl font-extrabold text-primary-dark">{totalDonationClicks}</p>
            <p className="mt-1 text-xs text-muted">ضغطات تبرع بعد وصول عبر هذه الروابط (توجّه نحو المنصة الرسمية، وليست تبرعات مؤكدة)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
