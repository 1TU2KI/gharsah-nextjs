import type { Metadata } from "next";
import Link from "next/link";
import { countCampaigns, countCampaignsByStatus, countCampaignsByPlatform } from "@/app/lib/db/campaignsRepo";
import { countRequestsByStatus } from "@/app/lib/db/requests";
import { countMessages, countUnreadMessages } from "@/app/lib/db/messages";
import { listActivity } from "@/app/lib/db/activity";
import { getVisitTotals, countEventsByType } from "@/app/lib/db/analyticsRepo";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import { ACTIVITY_LABEL } from "@/app/components/admin/activityLabels";
import MetricCard from "@/app/components/admin/MetricCard";
import {
  TrendingUpIcon,
  UsersIcon,
  EyeIcon,
  CursorClickIcon,
  LinkIcon,
  DiceIcon,
  InboxIcon,
  MailIcon,
  ListIcon,
  ChartIcon,
} from "@/app/components/admin/icons";

export const metadata: Metadata = { title: "نظرة عامة | لوحة تحكم غرسة" };

const STATS = `${ADMIN_BASE_PATH}/statistics`;

export default function AdminOverviewPage() {
  const totalCampaigns = countCampaigns();
  const statusCounts = countCampaignsByStatus();
  const byPlatform = countCampaignsByPlatform();
  const requestCounts = countRequestsByStatus();
  const totalRequests = Object.values(requestCounts).reduce((a, b) => a + b, 0);
  const totalMessages = countMessages();
  const unreadMessages = countUnreadMessages();
  const completionRate = totalCampaigns > 0 ? Math.round((statusCounts.completed / totalCampaigns) * 100) : 0;
  const recentActivity = listActivity(8);

  const visits = getVisitTotals();
  const detailViews = countEventsByType("campaign_detail_view");
  const donationClicks = countEventsByType("donation_click");
  const linkCopies = countEventsByType("campaign_link_copy");
  const randomUses = countEventsByType("random_campaign_use");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">نظرة عامة</h1>
          <p className="mt-1 text-sm text-muted">ملخص سريع لحالة غرسة الآن</p>
        </div>
        <Link href={STATS} className="text-xs font-semibold text-primary hover:underline">
          عرض تحليلات الزوار الكاملة ←
        </Link>
      </div>

      <p className="mb-2 text-xs font-bold text-muted">الزوار والتفاعل (الموقع العام) — اضغط أي بطاقة للتفاصيل</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <MetricCard label="إجمالي الزيارات" value={visits.totalVisits} icon={<TrendingUpIcon />} href={`${STATS}/visits`} />
        <MetricCard
          label="زوار اليوم"
          value={visits.visitsToday}
          tone="emerald"
          icon={<TrendingUpIcon />}
          href={`${STATS}/visits?range=today`}
        />
        <MetricCard label="الزوار الفريدون" value={visits.uniqueVisitors} icon={<UsersIcon />} href={`${STATS}/unique-visitors`} />
        <MetricCard label="مشاهدات الحالات" value={detailViews} icon={<EyeIcon />} href={`${STATS}/campaign-views`} />
        <MetricCard
          label="ضغطات التبرع"
          value={donationClicks}
          tone="emerald"
          icon={<CursorClickIcon />}
          href={`${STATS}/donation-clicks`}
        />
        <MetricCard label="مرات نسخ الروابط" value={linkCopies} icon={<LinkIcon />} href={`${STATS}/link-copies`} />
        <MetricCard label={`استخدام "دع غرسة تختار"`} value={randomUses} icon={<DiceIcon />} href={`${STATS}/random-picker`} />
        <MetricCard
          label="الطلبات الجديدة"
          value={requestCounts.new}
          tone={requestCounts.new > 0 ? "amber" : "default"}
          icon={<InboxIcon />}
          href={`${STATS}/requests?status=new`}
        />
      </div>

      <p className="mt-6 mb-2 text-xs font-bold text-muted">الحملات والطلبات</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <MetricCard label="إجمالي الحملات" value={totalCampaigns} icon={<ListIcon />} href={`${ADMIN_BASE_PATH}/campaigns`} />
        <MetricCard
          label="الحملات النشطة"
          value={statusCounts.active}
          tone="emerald"
          icon={<ListIcon />}
          href={`${ADMIN_BASE_PATH}/campaigns`}
        />
        <MetricCard
          label="الحملات المكتملة"
          value={statusCounts.completed}
          tone="teal"
          icon={<ListIcon />}
          href={`${ADMIN_BASE_PATH}/campaigns`}
        />
        <MetricCard label="نسبة الاكتمال" value={`${completionRate}%`} icon={<ChartIcon />} href={`${ADMIN_BASE_PATH}/campaigns`} />
        <MetricCard label="إجمالي الطلبات" value={totalRequests} icon={<InboxIcon />} href={`${STATS}/requests`} />
        <MetricCard
          label="طلبات مقبولة"
          value={requestCounts.accepted}
          tone="emerald"
          icon={<InboxIcon />}
          href={`${STATS}/requests?status=accepted`}
        />
        <MetricCard
          label="طلبات مرفوضة"
          value={requestCounts.rejected}
          tone="red"
          icon={<InboxIcon />}
          href={`${STATS}/requests?status=rejected`}
        />
        <MetricCard label="رسائل التواصل" value={totalMessages} icon={<MailIcon />} href={`${STATS}/messages`} />
        <MetricCard
          label="رسائل غير مقروءة"
          value={unreadMessages}
          tone={unreadMessages > 0 ? "amber" : "default"}
          icon={<MailIcon />}
          href={`${STATS}/messages?filter=unread`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">آخر النشاطات</h2>
            <Link href={`${ADMIN_BASE_PATH}/activity`} className="text-xs font-semibold text-primary hover:underline">
              عرض السجل الكامل
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted">لا يوجد نشاط بعد</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-light" />
                  <div className="min-w-0">
                    <p className="text-foreground">
                      <span className="font-semibold">{ACTIVITY_LABEL[entry.action] ?? entry.action}</span>
                      {entry.target_label && <span className="text-muted"> — {entry.target_label}</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {entry.admin_username} · {new Date(entry.created_at).toLocaleString("ar-SA")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">الحملات حسب المنصة</h2>
          {byPlatform.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted">لا توجد بيانات كافية حتى الآن</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byPlatform.map((p) => {
                const pct = totalCampaigns > 0 ? Math.round((p.count / totalCampaigns) * 100) : 0;
                return (
                  <li key={p.platform}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{p.platform}</span>
                      <span className="text-muted">{p.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-primary-100">
                      <div className="h-full rounded-full bg-primary-light" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
