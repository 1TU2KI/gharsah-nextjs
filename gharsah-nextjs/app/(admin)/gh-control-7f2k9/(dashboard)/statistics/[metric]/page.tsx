import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getVisitTotals,
  campaignEngagement,
  pageViewsByRoute,
  referrerBreakdown,
  deviceBreakdown,
  randomFeatureStats,
  eventCountsByDay,
  visitsByDay,
  uniqueVisitorsByDay,
  newVsReturningVisitorsByDay,
  countEventsByType,
} from "@/app/lib/db/analyticsRepo";
import { countRequestsByStatus, requestsCreatedByDay, listCampaignRequests, type RequestStatus } from "@/app/lib/db/requests";
import { messagesCreatedByDay, listContactMessages } from "@/app/lib/db/messages";
import { rangeDaySeries, resolveRangeSinceIso, type RangeValue } from "@/app/lib/admin/chartUtils";
import { ROUTE_LABEL, REFERRER_LABEL, DEVICE_LABEL } from "@/app/lib/admin/analyticsLabels";
import AdminBarChart from "@/app/components/admin/AdminBarChart";
import AdminTrendChart from "@/app/components/admin/AdminTrendChart";
import CampaignAnalyticsTable from "@/app/components/admin/CampaignAnalyticsTable";
import MetricCard from "@/app/components/admin/MetricCard";
import { ChartCard, RankedList, RangeTabs, isRangeValue, NO_DATA_YET } from "@/app/components/admin/StatsWidgets";
import { REQUEST_STATUS_LABEL, REQUEST_STATUS_CLASS } from "@/app/components/admin/RequestsTable";
import { TrendingUpIcon, UsersIcon, EyeIcon, CursorClickIcon, LinkIcon, DiceIcon, InboxIcon, MailIcon } from "@/app/components/admin/icons";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

const STATS = `${ADMIN_BASE_PATH}/statistics`;

const METRIC_META: Record<string, { title: string; icon: ReactNode; description: string }> = {
  visits: { title: "إجمالي الزيارات", icon: <TrendingUpIcon />, description: "الزيارات (جلسات فريدة) عبر الوقت، أكثر الصفحات زيارة، مصادر الزيارات، وأنواع الأجهزة." },
  "unique-visitors": { title: "الزوار الفريدون", icon: <UsersIcon />, description: "عدد الزوار الفريدين، الزوار الجدد مقابل العائدين، والتوزيع حسب الجهاز والمصدر." },
  "campaign-views": { title: "مشاهدات الحالات", icon: <EyeIcon />, description: "إجمالي مشاهدات صفحات الحملات، وأكثرها مشاهدة." },
  "donation-clicks": { title: "ضغطات التبرع", icon: <CursorClickIcon />, description: "ضغطات زر التبرع لكل حملة، وأعلى نسب التحويل (CTR)." },
  "link-copies": { title: "مرات نسخ الروابط", icon: <LinkIcon />, description: "عدد مرات نسخ رابط كل حملة." },
  "random-picker": { title: `استخدام "دع غرسة تختار"`, icon: <DiceIcon />, description: "مرات الاستخدام، الحملات الأكثر اختيارًا، ومتابعة المستخدمين حتى التبرع." },
  requests: { title: "طلبات إضافة حملة", icon: <InboxIcon />, description: "حالة الطلبات، نسبة القبول، وأحدث الطلبات المقدَّمة." },
  messages: { title: "رسائل التواصل", icon: <MailIcon />, description: "رسائل التواصل الواردة، حالتها، وأحدثها." },
};

type PageProps = {
  params: Promise<{ metric: string }>;
  searchParams: Promise<{ range?: string; status?: string; filter?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { metric } = await params;
  const meta = METRIC_META[metric];
  return { title: meta ? `${meta.title} | الإحصائيات | لوحة تحكم غرسة` : "الإحصائيات | لوحة تحكم غرسة" };
}

function StatStrip({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

export default async function MetricDrilldownPage({ params, searchParams }: PageProps) {
  const { metric } = await params;
  const meta = METRIC_META[metric];
  if (!meta) notFound();

  const { range: rangeParam, status: statusParam, filter: filterParam } = await searchParams;
  const range: RangeValue = isRangeValue(rangeParam) ? rangeParam : "30";
  const sinceIso = resolveRangeSinceIso(range);
  const toSeries = (rows: { day: string; count: number }[]) => rangeDaySeries(range, rows);
  const basePath = `${STATS}/${metric}`;

  return (
    <div>
      <div className="mb-6">
        <Link href={STATS} className="text-xs font-semibold text-primary hover:underline">
          ← الإحصائيات
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-dark">
              <span className="h-5 w-5">{meta.icon}</span>
            </span>
            <div>
              <h1 className="text-xl font-bold text-foreground">{meta.title}</h1>
              <p className="mt-0.5 text-xs text-muted">{meta.description}</p>
            </div>
          </div>
          <RangeTabs basePath={basePath} range={range} />
        </div>
      </div>

      {metric === "visits" && <VisitsDetail sinceIso={sinceIso} toSeries={toSeries} />}
      {metric === "unique-visitors" && <UniqueVisitorsDetail sinceIso={sinceIso} toSeries={toSeries} />}
      {metric === "campaign-views" && <CampaignViewsDetail sinceIso={sinceIso} toSeries={toSeries} />}
      {metric === "donation-clicks" && <DonationClicksDetail sinceIso={sinceIso} toSeries={toSeries} />}
      {metric === "link-copies" && <LinkCopiesDetail sinceIso={sinceIso} toSeries={toSeries} />}
      {metric === "random-picker" && <RandomPickerDetail sinceIso={sinceIso} toSeries={toSeries} />}
      {metric === "requests" && <RequestsDetail toSeries={toSeries} statusFilter={statusParam} />}
      {metric === "messages" && <MessagesDetail toSeries={toSeries} readFilter={filterParam} />}
    </div>
  );
}

type SeriesFn = (rows: { day: string; count: number }[]) => { label: string; value: number }[];

function VisitsDetail({ sinceIso, toSeries }: { sinceIso: string | null; toSeries: SeriesFn }) {
  const visits = getVisitTotals();
  const pageViews = pageViewsByRoute();
  const referrers = referrerBreakdown();
  const devices = deviceBreakdown();
  const series = toSeries(visitsByDay(sinceIso));

  return (
    <div className="space-y-6">
      <StatStrip>
        <MetricCard label="اليوم" value={visits.visitsToday} tone="emerald" icon={<TrendingUpIcon />} />
        <MetricCard label="آخر ٧ أيام" value={visits.visitsLast7d} icon={<TrendingUpIcon />} />
        <MetricCard label="آخر ٣٠ يومًا" value={visits.visitsLast30d} icon={<TrendingUpIcon />} />
        <MetricCard label="كل الفترات" value={visits.totalVisits} icon={<TrendingUpIcon />} />
      </StatStrip>

      <ChartCard title="الزيارات عبر الوقت" hint="عدد الجلسات الفريدة، وليس عدد الصفحات المفتوحة">
        <AdminTrendChart data={series} unit="زيارة" />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="أكثر الصفحات زيارة" hint="إجمالي كل الفترات">
          <AdminBarChart data={pageViews.map((p) => ({ label: ROUTE_LABEL[p.route] ?? p.route, value: p.count, color: "#16a34a" }))} />
        </ChartCard>
        <ChartCard title="مصادر الزيارات" hint="إجمالي كل الفترات">
          <AdminBarChart data={referrers.map((r) => ({ label: REFERRER_LABEL[r.source] ?? r.source, value: r.count, color: "#0C787E" }))} />
        </ChartCard>
      </div>

      <ChartCard title="نوع الجهاز" hint="إجمالي كل الفترات">
        <AdminBarChart data={devices.map((d) => ({ label: DEVICE_LABEL[d.label] ?? d.label, value: d.count, color: "#2563eb" }))} />
      </ChartCard>
    </div>
  );
}

function UniqueVisitorsDetail({ sinceIso, toSeries }: { sinceIso: string | null; toSeries: SeriesFn }) {
  const visits = getVisitTotals();
  const newVsReturning = newVsReturningVisitorsByDay(sinceIso);
  const totalNew = newVsReturning.reduce((sum, r) => sum + r.newCount, 0);
  const totalReturning = newVsReturning.reduce((sum, r) => sum + r.returningCount, 0);
  const uniqueSeries = toSeries(uniqueVisitorsByDay(sinceIso));
  const devices = deviceBreakdown();
  const referrers = referrerBreakdown();

  return (
    <div className="space-y-6">
      <StatStrip>
        <MetricCard label="الزوار الفريدون (كل الفترات)" value={visits.uniqueVisitors} icon={<UsersIcon />} />
        <MetricCard label="اليوم" value={visits.uniqueToday} tone="emerald" icon={<UsersIcon />} />
        <MetricCard label="آخر ٧ أيام" value={visits.uniqueLast7d} icon={<UsersIcon />} />
        <MetricCard label="آخر ٣٠ يومًا" value={visits.uniqueLast30d} icon={<UsersIcon />} />
      </StatStrip>

      <ChartCard title="الزوار الفريدون عبر الوقت">
        <AdminTrendChart data={uniqueSeries} unit="زائر" />
      </ChartCard>

      <ChartCard title="زوار جدد مقابل عائدين" hint="جديد = أول ظهور لهذا الزائر ضمن الفترة المحددة؛ عائد = زار الموقع سابقًا">
        <AdminBarChart
          data={[
            { label: "زوار جدد", value: totalNew, color: "#16a34a" },
            { label: "زوار عائدون", value: totalReturning, color: "#0C787E" },
          ]}
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="نوع الجهاز" hint="إجمالي كل الفترات">
          <AdminBarChart data={devices.map((d) => ({ label: DEVICE_LABEL[d.label] ?? d.label, value: d.count, color: "#2563eb" }))} />
        </ChartCard>
        <ChartCard title="مصادر الزيارات" hint="إجمالي كل الفترات">
          <AdminBarChart data={referrers.map((r) => ({ label: REFERRER_LABEL[r.source] ?? r.source, value: r.count, color: "#0C787E" }))} />
        </ChartCard>
      </div>
    </div>
  );
}

function CampaignViewsDetail({ sinceIso, toSeries }: { sinceIso: string | null; toSeries: SeriesFn }) {
  const total = countEventsByType("campaign_detail_view");
  const engagement = campaignEngagement();
  const mostViewed = [...engagement].sort((a, b) => b.views - a.views).slice(0, 10);
  const series = toSeries(eventCountsByDay(["campaign_detail_view"], sinceIso));

  return (
    <div className="space-y-6">
      <StatStrip>
        <MetricCard label="إجمالي المشاهدات" value={total} icon={<EyeIcon />} />
        <MetricCard label="عدد الحملات التي شُوهدت" value={engagement.filter((c) => c.views > 0).length} icon={<EyeIcon />} />
      </StatStrip>

      <ChartCard title="المشاهدات عبر الوقت">
        <AdminTrendChart data={series} unit="مشاهدة" />
      </ChartCard>

      <ChartCard title="الأكثر مشاهدة">
        <RankedList rows={mostViewed.map((c) => ({ label: c.titleAr, value: c.views }))} valueLabel="مشاهدة" />
      </ChartCard>

      <ChartCard title="المشاهدات لكل حملة" hint="قابلة للفرز — اضغط أي عمود">
        <CampaignAnalyticsTable rows={engagement} />
      </ChartCard>
    </div>
  );
}

function DonationClicksDetail({ sinceIso, toSeries }: { sinceIso: string | null; toSeries: SeriesFn }) {
  const total = countEventsByType("donation_click");
  const engagement = campaignEngagement();
  const mostClicked = [...engagement].sort((a, b) => b.donationClicks - a.donationClicks).slice(0, 10);
  const highestCtr = [...engagement].filter((c) => c.views > 0).sort((a, b) => b.ctr - a.ctr).slice(0, 10);
  const series = toSeries(eventCountsByDay(["donation_click"], sinceIso));

  return (
    <div className="space-y-6">
      <StatStrip>
        <MetricCard label="إجمالي ضغطات التبرع" value={total} tone="emerald" icon={<CursorClickIcon />} />
      </StatStrip>

      <ChartCard title="ضغطات التبرع عبر الوقت">
        <AdminTrendChart data={series} unit="ضغطة" />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="الأكثر ضغطًا على زر التبرع">
          <RankedList rows={mostClicked.map((c) => ({ label: c.titleAr, value: c.donationClicks }))} valueLabel="ضغطة" />
        </ChartCard>
        <ChartCard title="أعلى نسبة تحويل (CTR)" hint="ضغطات التبرع ÷ مشاهدات الحالة">
          <RankedList
            rows={highestCtr.map((c) => ({ label: c.titleAr, value: Math.round(c.ctr * 100), sub: `${c.views} مشاهدة` }))}
            valueLabel="%"
          />
        </ChartCard>
      </div>

      <ChartCard title="ضغطات التبرع لكل حملة" hint="قابلة للفرز — اضغط أي عمود">
        <CampaignAnalyticsTable rows={engagement} />
      </ChartCard>
    </div>
  );
}

function LinkCopiesDetail({ sinceIso, toSeries }: { sinceIso: string | null; toSeries: SeriesFn }) {
  const total = countEventsByType("campaign_link_copy");
  const engagement = campaignEngagement();
  const mostCopied = [...engagement].sort((a, b) => b.linkCopies - a.linkCopies).slice(0, 10);
  const series = toSeries(eventCountsByDay(["campaign_link_copy"], sinceIso));

  return (
    <div className="space-y-6">
      <StatStrip>
        <MetricCard label="إجمالي مرات النسخ" value={total} icon={<LinkIcon />} />
      </StatStrip>

      <ChartCard title="مرات النسخ عبر الوقت">
        <AdminTrendChart data={series} unit="نسخة" />
      </ChartCard>

      <ChartCard title="الأكثر نسخًا لرابطها">
        <RankedList rows={mostCopied.map((c) => ({ label: c.titleAr, value: c.linkCopies }))} valueLabel="نسخة" />
      </ChartCard>

      <ChartCard title="مرات النسخ لكل حملة" hint="قابلة للفرز — اضغط أي عمود">
        <CampaignAnalyticsTable rows={engagement} />
      </ChartCard>
    </div>
  );
}

function RandomPickerDetail({ sinceIso, toSeries }: { sinceIso: string | null; toSeries: SeriesFn }) {
  const stats = randomFeatureStats();
  const followThroughRate = stats.selectedCount > 0 ? Math.round((stats.followedToDonation / stats.selectedCount) * 100) : 0;
  const series = toSeries(eventCountsByDay(["random_campaign_use"], sinceIso));

  return (
    <div className="space-y-6">
      <StatStrip>
        <MetricCard label="مرات الاستخدام" value={stats.uses} icon={<DiceIcon />} />
        <MetricCard label="تابع لعرض الحملة" value={stats.selectedCount} icon={<EyeIcon />} secondary="الاختيار ينقل تلقائيًا لصفحة الحملة" />
        <MetricCard label="ثم ضغط زر التبرع" value={stats.followedToDonation} tone="emerald" icon={<CursorClickIcon />} secondary={`${followThroughRate}% من المتابعين`} />
      </StatStrip>

      <ChartCard title="استخدام الميزة عبر الوقت">
        <AdminTrendChart data={series} unit="استخدام" />
      </ChartCard>

      <ChartCard title="الحملات الأكثر اختيارًا">
        <RankedList rows={stats.topCampaigns.map((c) => ({ label: c.titleAr, value: c.count }))} valueLabel="اختيار" />
      </ChartCard>
    </div>
  );
}

function RequestsDetail({ toSeries, statusFilter }: { toSeries: SeriesFn; statusFilter?: string }) {
  const counts = countRequestsByStatus();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const acceptanceRate = total > 0 ? Math.round((counts.completed / total) * 100) : 0;
  const series = toSeries(requestsCreatedByDay());

  const validStatus = statusFilter && statusFilter in REQUEST_STATUS_LABEL ? (statusFilter as RequestStatus) : null;
  let recent = listCampaignRequests();
  if (validStatus) recent = recent.filter((r) => r.status === validStatus);
  recent = recent.slice(0, 10);

  return (
    <div className="space-y-6">
      <StatStrip>
        <MetricCard label="إجمالي الطلبات" value={total} icon={<InboxIcon />} />
        <MetricCard label="طلبات جديدة" value={counts.new} tone={counts.new > 0 ? "amber" : "default"} icon={<InboxIcon />} />
        <MetricCard label="طلبات مقبولة" value={counts.accepted} tone="emerald" icon={<InboxIcon />} />
        <MetricCard label="طلبات مرفوضة" value={counts.rejected} tone="red" icon={<InboxIcon />} />
      </StatStrip>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="الطلبات حسب الحالة">
          <AdminBarChart
            data={(Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[]).map((s) => ({
              label: REQUEST_STATUS_LABEL[s],
              value: counts[s],
              color: s === "accepted" || s === "completed" ? "#16a34a" : s === "rejected" ? "#dc2626" : "#0C787E",
            }))}
          />
        </ChartCard>
        <ChartCard title="الطلبات عبر الوقت" hint={`نسبة التحويل إلى حملة فعلية: ${acceptanceRate}%`}>
          <AdminTrendChart data={series} unit="طلب" />
        </ChartCard>
      </div>

      <ChartCard
        title={validStatus ? `أحدث الطلبات — ${REQUEST_STATUS_LABEL[validStatus]}` : "أحدث الطلبات"}
        hint="أحدث ١٠ طلبات فقط — لإدارة كل الطلبات والفلترة الكاملة استخدم صفحة الطلبات"
      >
        <RequestsMiniTable rows={recent} />
        <Link href={`${ADMIN_BASE_PATH}/requests`} className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">
          عرض كل الطلبات ←
        </Link>
      </ChartCard>
    </div>
  );
}

function RequestsMiniTable({ rows }: { rows: ReturnType<typeof listCampaignRequests> }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">{NO_DATA_YET}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-start text-sm">
        <thead>
          <tr className="border-b border-primary-100 text-xs font-semibold text-muted">
            <th className="px-2 py-2 text-start">الاسم</th>
            <th className="px-2 py-2 text-start">الحالة</th>
            <th className="px-2 py-2 text-start">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-wash last:border-0 hover:bg-wash/60">
              <td className="px-2 py-2.5">
                <Link href={`${ADMIN_BASE_PATH}/requests/${r.id}`} className="font-medium text-foreground hover:text-primary-dark">
                  {r.name}
                </Link>
              </td>
              <td className="px-2 py-2.5">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REQUEST_STATUS_CLASS[r.status]}`}>
                  {REQUEST_STATUS_LABEL[r.status]}
                </span>
              </td>
              <td className="px-2 py-2.5 text-xs text-muted">{new Date(r.created_at).toLocaleDateString("ar-SA")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MessagesDetail({ toSeries, readFilter }: { toSeries: SeriesFn; readFilter?: string }) {
  const all = listContactMessages({ includeArchived: true });
  const active = all.filter((m) => !m.archived_at);
  const unread = active.filter((m) => m.is_read === 0).length;
  const read = active.filter((m) => m.is_read === 1).length;
  const archived = all.length - active.length;
  const series = toSeries(messagesCreatedByDay());

  let recent = active;
  if (readFilter === "unread") recent = recent.filter((m) => m.is_read === 0);
  recent = recent.slice(0, 10);

  return (
    <div className="space-y-6">
      <StatStrip>
        <MetricCard label="إجمالي الرسائل" value={all.length} icon={<MailIcon />} />
        <MetricCard label="غير مقروءة" value={unread} tone={unread > 0 ? "amber" : "default"} icon={<MailIcon />} />
        <MetricCard label="مقروءة" value={read} tone="emerald" icon={<MailIcon />} />
        <MetricCard label="مؤرشفة" value={archived} icon={<MailIcon />} />
      </StatStrip>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="حالة الرسائل">
          <AdminBarChart
            data={[
              { label: "غير مقروءة", value: unread, color: "#d97706" },
              { label: "مقروءة", value: read, color: "#16a34a" },
              { label: "مؤرشفة", value: archived, color: "#64748b" },
            ]}
          />
        </ChartCard>
        <ChartCard title="الرسائل عبر الوقت">
          <AdminTrendChart data={series} unit="رسالة" />
        </ChartCard>
      </div>

      <ChartCard
        title={readFilter === "unread" ? "أحدث الرسائل — غير مقروءة" : "أحدث الرسائل"}
        hint="أحدث ١٠ رسائل فقط — لإدارة كل الرسائل استخدم صفحة الرسائل"
      >
        <MessagesMiniTable rows={recent} />
        <Link href={`${ADMIN_BASE_PATH}/messages`} className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">
          عرض كل الرسائل ←
        </Link>
      </ChartCard>
    </div>
  );
}

function MessagesMiniTable({ rows }: { rows: ReturnType<typeof listContactMessages> }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">{NO_DATA_YET}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-start text-sm">
        <thead>
          <tr className="border-b border-primary-100 text-xs font-semibold text-muted">
            <th className="px-2 py-2 text-start">الاسم</th>
            <th className="px-2 py-2 text-start">الحالة</th>
            <th className="px-2 py-2 text-start">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-wash last:border-0 hover:bg-wash/60">
              <td className="px-2 py-2.5">
                <Link href={`${ADMIN_BASE_PATH}/messages/${m.id}`} className="font-medium text-foreground hover:text-primary-dark">
                  {m.name}
                </Link>
              </td>
              <td className="px-2 py-2.5">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    m.is_read ? "bg-primary-50 text-primary-dark" : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {m.is_read ? "مقروءة" : "غير مقروءة"}
                </span>
              </td>
              <td className="px-2 py-2.5 text-xs text-muted">{new Date(m.created_at).toLocaleDateString("ar-SA")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
