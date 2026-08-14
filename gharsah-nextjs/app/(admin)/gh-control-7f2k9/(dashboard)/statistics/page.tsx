import type { Metadata } from "next";
import {
  countCampaigns,
  countCampaignsByStatus,
  countCampaignsByPlatform,
  campaignsCreatedByDay,
  campaignsCompletedByDay,
} from "@/app/lib/db/campaignsRepo";
import { countRequestsByStatus, requestsCreatedByDay } from "@/app/lib/db/requests";
import { messagesCreatedByDay } from "@/app/lib/db/messages";
import {
  getVisitTotals,
  campaignEngagement,
  pageViewsByRoute,
  navClicksBreakdown,
  toggleUsageCounts,
  randomFeatureStats,
  deviceBreakdown,
  browserBreakdown,
  osBreakdown,
  referrerBreakdown,
  eventCountsByDay,
  visitsByDay,
} from "@/app/lib/db/analyticsRepo";
import { bucketByMonth, rangeDaySeries, resolveRangeSinceIso, type RangeValue } from "@/app/lib/admin/chartUtils";
import AdminBarChart from "@/app/components/admin/AdminBarChart";
import AdminTrendChart from "@/app/components/admin/AdminTrendChart";
import CampaignAnalyticsTable from "@/app/components/admin/CampaignAnalyticsTable";
import MetricCard from "@/app/components/admin/MetricCard";
import { ChartCard, RankedList, RangeTabs, isRangeValue } from "@/app/components/admin/StatsWidgets";
import { TrendingUpIcon, UsersIcon } from "@/app/components/admin/icons";
import { REQUEST_STATUS_LABEL } from "@/app/components/admin/RequestsTable";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import { ROUTE_LABEL, NAV_LABEL, REFERRER_LABEL, DEVICE_LABEL } from "@/app/lib/admin/analyticsLabels";

export const metadata: Metadata = { title: "الإحصائيات | لوحة تحكم غرسة" };

const STATS = `${ADMIN_BASE_PATH}/statistics`;

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rangeParam } = await searchParams;
  const range: RangeValue = isRangeValue(rangeParam) ? rangeParam : "30";
  const sinceIso = resolveRangeSinceIso(range);
  const toSeries = (rows: { day: string; count: number }[]) => rangeDaySeries(range, rows);

  // Existing campaign-management stats (unchanged from before this page grew).
  const totalCampaigns = countCampaigns();
  const statusCounts = countCampaignsByStatus();
  const platformCounts = countCampaignsByPlatform();
  const requestCounts = countRequestsByStatus();
  const completionRate = totalCampaigns > 0 ? Math.round((statusCounts.completed / totalCampaigns) * 100) : 0;
  const createdTrend = bucketByMonth(campaignsCreatedByDay());
  const completedTrend = bucketByMonth(campaignsCompletedByDay());

  // Visitor/engagement analytics.
  const visits = getVisitTotals();
  const engagement = campaignEngagement();
  const pageViews = pageViewsByRoute();
  const navClicks = navClicksBreakdown();
  const toggles = toggleUsageCounts();
  const randomStats = randomFeatureStats();
  const devices = deviceBreakdown();
  const browsers = browserBreakdown();
  const oses = osBreakdown();
  const referrers = referrerBreakdown();

  const visitsSeries = toSeries(visitsByDay(sinceIso));
  const pageViewSeries = toSeries(eventCountsByDay(["page_view"], sinceIso));
  const cardClickSeries = toSeries(eventCountsByDay(["campaign_card_click"], sinceIso));
  const donationClickSeries = toSeries(eventCountsByDay(["donation_click"], sinceIso));
  const requestsSeries = toSeries(requestsCreatedByDay());
  const messagesSeries = toSeries(messagesCreatedByDay());

  const totalRequestsAllTime = Object.values(requestCounts).reduce((a, b) => a + b, 0);
  const requestConversionRate = totalRequestsAllTime > 0 ? Math.round((requestCounts.completed / totalRequestsAllTime) * 100) : 0;

  const engagedCampaigns = engagement.filter((c) => c.views + c.cardClicks + c.donationClicks + c.linkCopies > 0);
  const mostViewed = [...engagement].sort((a, b) => b.views - a.views).slice(0, 5);
  const mostClicked = [...engagement].sort((a, b) => b.donationClicks - a.donationClicks).slice(0, 5);
  const highestCtr = [...engagement].filter((c) => c.views > 0).sort((a, b) => b.ctr - a.ctr).slice(0, 5);
  const leastEngaged = [...engagedCampaigns]
    .sort((a, b) => a.views + a.cardClicks + a.donationClicks + a.linkCopies - (b.views + b.cardClicks + b.donationClicks + b.linkCopies))
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">الإحصائيات</h1>
          <p className="mt-1 text-sm text-muted">نسبة الاكتمال الحالية {completionRate}% من إجمالي {totalCampaigns} حملة</p>
        </div>
        <RangeTabs basePath={STATS} range={range} />
      </div>

      <p className="mb-6 rounded-xl bg-wash/70 px-4 py-3 text-xs leading-6 text-muted">
        بيانات حقيقية من زوار الموقع العام فقط — لا تشمل صفحات لوحة التحكم. الزيارة تُحتسب عبر معرّف جلسة عشوائي غير
        معرِّف صالح لـ٣٠ دقيقة (وليس عنوان IP)، والزائر الفريد عبر معرّف عشوائي طويل الأمد في المتصفح — لا يُخزَّن أي
        بريد أو اسم أو محتوى نموذج ضمن هذه البيانات.
      </p>

      <p className="mb-2 text-xs font-bold text-muted">ملخص الزوار — اضغط أي بطاقة للتفاصيل</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <MetricCard label="إجمالي الزيارات" value={visits.totalVisits} icon={<TrendingUpIcon />} href={`${STATS}/visits`} />
        <MetricCard label="الزوار الفريدون" value={visits.uniqueVisitors} icon={<UsersIcon />} href={`${STATS}/unique-visitors`} />
        <MetricCard
          label="زيارات اليوم"
          value={visits.visitsToday}
          tone="emerald"
          icon={<TrendingUpIcon />}
          href={`${STATS}/visits?range=today`}
        />
        <MetricCard
          label="زيارات آخر ٧ أيام"
          value={visits.visitsLast7d}
          icon={<TrendingUpIcon />}
          href={`${STATS}/visits?range=7`}
        />
        <MetricCard
          label="زيارات آخر ٣٠ يومًا"
          value={visits.visitsLast30d}
          icon={<TrendingUpIcon />}
          href={`${STATS}/visits?range=30`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="الزيارات عبر الوقت" hint="عدد الجلسات الفريدة، وليس عدد الصفحات المفتوحة">
          <AdminTrendChart data={visitsSeries} unit="زيارة" />
        </ChartCard>
        <ChartCard title="مشاهدات الصفحات عبر الوقت">
          <AdminTrendChart data={pageViewSeries} unit="مشاهدة" />
        </ChartCard>
        <ChartCard title="ضغطات فتح الحالات عبر الوقت" hint="من بطاقات الحملات">
          <AdminTrendChart data={cardClickSeries} unit="ضغطة" />
        </ChartCard>
        <ChartCard title="ضغطات زر التبرع عبر الوقت">
          <AdminTrendChart data={donationClickSeries} unit="ضغطة" />
        </ChartCard>
        <ChartCard title="طلبات الحملات عبر الوقت">
          <AdminTrendChart data={requestsSeries} unit="طلب" />
        </ChartCard>
        <ChartCard title="رسائل التواصل عبر الوقت">
          <AdminTrendChart data={messagesSeries} unit="رسالة" />
        </ChartCard>
      </div>

      <p className="mt-8 mb-3 text-sm font-bold text-foreground">تفاعل الحملات</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="الأكثر مشاهدة">
          <RankedList
            rows={mostViewed.map((c) => ({ label: c.titleAr, value: c.views }))}
            valueLabel="مشاهدة"
          />
        </ChartCard>
        <ChartCard title="الأكثر ضغطًا على زر التبرع">
          <RankedList
            rows={mostClicked.map((c) => ({ label: c.titleAr, value: c.donationClicks }))}
            valueLabel="ضغطة"
          />
        </ChartCard>
        <ChartCard title="أعلى نسبة تحويل للتبرع (CTR)" hint="ضغطات زر التبرع ÷ مشاهدات الحالة">
          <RankedList
            rows={highestCtr.map((c) => ({ label: c.titleAr, value: Math.round(c.ctr * 100), sub: `${c.views} مشاهدة` }))}
            valueLabel="%"
          />
        </ChartCard>
        <ChartCard title="الأقل تفاعلًا" hint="من بين الحملات التي سُجّل لها أي تفاعل على الأقل">
          <RankedList
            rows={leastEngaged.map((c) => ({ label: c.titleAr, value: c.views + c.cardClicks + c.donationClicks + c.linkCopies }))}
            valueLabel="تفاعل"
          />
        </ChartCard>
      </div>

      <div className="mt-6">
        <ChartCard title="تحليلات كل حملة" hint="قابلة للفرز — اضغط أي عمود">
          <CampaignAnalyticsTable rows={engagement} />
        </ChartCard>
      </div>

      <p className="mt-8 mb-3 text-sm font-bold text-foreground">استخدام الموقع</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="أكثر الصفحات مشاهدة">
          <AdminBarChart
            data={pageViews.map((p) => ({ label: ROUTE_LABEL[p.route] ?? p.route, value: p.count, color: "#16a34a" }))}
          />
        </ChartCard>

        <ChartCard title="التنقّل في القائمة العلوية">
          <AdminBarChart
            data={navClicks.map((n) => ({ label: NAV_LABEL[n.key] ?? n.key, value: n.count, color: "#0C787E" }))}
          />
        </ChartCard>

        <ChartCard title={`ميزة "دع غرسة تختار"`}>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-extrabold text-foreground">{randomStats.uses}</p>
              <p className="text-[11px] text-muted">مرة استخدام</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground">{randomStats.followedToDonation}</p>
              <p className="text-[11px] text-muted">تابع للتبرع</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground">
                {randomStats.selectedCount > 0 ? Math.round((randomStats.followedToDonation / randomStats.selectedCount) * 100) : 0}%
              </p>
              <p className="text-[11px] text-muted">نسبة المتابعة للتبرع</p>
            </div>
          </div>
          <RankedList
            rows={randomStats.topCampaigns.map((c) => ({ label: c.titleAr, value: c.count }))}
            valueLabel="اختيار"
            emptyText="لم تُستخدم الميزة بعد"
          />
        </ChartCard>

        <ChartCard title="اللغة والمظهر">
          <AdminBarChart
            data={[
              { label: "تبديل اللغة", value: toggles.languageSwitch, color: "#2563eb" },
              { label: "تبديل الوضع الليلي", value: toggles.themeToggle, color: "#7c3aed" },
            ]}
          />
        </ChartCard>
      </div>

      <p className="mt-8 mb-3 text-sm font-bold text-foreground">مصادر الزيارات والأجهزة</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="مصادر الزيارات" hint="إجمالي كل الفترات">
          <AdminBarChart
            data={referrers.map((r) => ({ label: REFERRER_LABEL[r.source] ?? r.source, value: r.count, color: "#16a34a" }))}
          />
        </ChartCard>
        <ChartCard title="نوع الجهاز" hint="إجمالي كل الفترات">
          <AdminBarChart data={devices.map((d) => ({ label: DEVICE_LABEL[d.label] ?? d.label, value: d.count, color: "#0C787E" }))} />
        </ChartCard>
        <ChartCard title="المتصفح" hint="إجمالي كل الفترات">
          <AdminBarChart data={browsers.map((b) => ({ label: b.label, value: b.count, color: "#d97706" }))} />
        </ChartCard>
        <ChartCard title="نظام التشغيل" hint="إجمالي كل الفترات">
          <AdminBarChart data={oses.map((o) => ({ label: o.label, value: o.count, color: "#2563eb" }))} />
        </ChartCard>
      </div>

      <p className="mt-8 mb-3 text-sm font-bold text-foreground">الحملات والطلبات</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="الحملات: نشطة مقابل مكتملة">
          <AdminBarChart
            data={[
              { label: "نشطة", value: statusCounts.active, color: "#16a34a" },
              { label: "مكتملة", value: statusCounts.completed, color: "#0C787E" },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="الطلبات حسب الحالة"
          hint={`نسبة التحويل إلى حملة فعلية: ${requestConversionRate}%`}
        >
          <AdminBarChart
            data={[
              { label: REQUEST_STATUS_LABEL.new, value: requestCounts.new, color: "#2563eb" },
              { label: REQUEST_STATUS_LABEL.under_review, value: requestCounts.under_review, color: "#d97706" },
              { label: REQUEST_STATUS_LABEL.accepted, value: requestCounts.accepted, color: "#059669" },
              { label: REQUEST_STATUS_LABEL.rejected, value: requestCounts.rejected, color: "#dc2626" },
              { label: REQUEST_STATUS_LABEL.completed, value: requestCounts.completed, color: "#7c3aed" },
            ]}
          />
        </ChartCard>

        <ChartCard title="الحملات حسب المنصة">
          <AdminBarChart data={platformCounts.map((p) => ({ label: p.platform, value: p.count, color: "#16a34a" }))} />
        </ChartCard>

        <ChartCard title="نسبة الاكتمال">
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#0C787E"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${completionRate * 0.974} 1000`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-foreground">{completionRate}%</span>
            </div>
            <p className="text-sm text-muted">
              {statusCounts.completed} من {totalCampaigns} حملة وصلت لحالة «مكتملة»
            </p>
          </div>
        </ChartCard>

        <ChartCard title="الحملات المضافة عبر الوقت" hint="مجمّعة شهريًا حسب تاريخ الإنشاء الفعلي">
          <AdminTrendChart data={createdTrend} unit="حملة" />
        </ChartCard>

        <ChartCard title="الحملات المكتملة عبر الوقت" hint="مجمّعة شهريًا حسب تاريخ الاكتمال الفعلي — لا تشمل الحملات التي كانت مكتملة عند إدخالها الأولي">
          <AdminTrendChart data={completedTrend} unit="حملة" />
        </ChartCard>
      </div>
    </div>
  );
}

