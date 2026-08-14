"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CampaignEngagementRow } from "@/app/lib/db/analyticsRepo";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

const STATUS_LABEL: Record<string, string> = { active: "نشطة", completed: "مكتملة", closed: "مغلقة" };
const STATUS_CLASS: Record<string, string> = {
  active: "bg-primary-dark text-white",
  completed: "bg-[#0C787E] text-white",
  closed: "bg-border text-muted",
};

type SortKey = "views" | "cardClicks" | "donationClicks" | "linkCopies" | "ctr" | "randomSelected";

const SORT_LABEL: Record<SortKey, string> = {
  views: "المشاهدات",
  cardClicks: "فتح الحالة",
  donationClicks: "ضغطات التبرع",
  linkCopies: "نسخ الرابط",
  ctr: "CTR",
  randomSelected: `اختيار "دع غرسة تختار"`,
};

/** Hoisted out of the table component itself — an inline function component defined inside another component's render is recreated every render, which resets any state it holds (react-hooks/static-components) even though this one happens to be stateless today. */
function SortHeader({
  sortKeyName,
  activeKey,
  sortDir,
  onSort,
}: {
  sortKeyName: SortKey;
  activeKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKeyName;
  return (
    <th className="px-3 py-3 text-start">
      <button
        type="button"
        onClick={() => onSort(sortKeyName)}
        className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold transition-colors hover:text-primary-dark ${active ? "text-primary-dark" : ""}`}
      >
        {SORT_LABEL[sortKeyName]}
        {active && <span aria-hidden="true">{sortDir === "desc" ? "↓" : "↑"}</span>}
      </button>
    </th>
  );
}

/**
 * Dedicated, sortable per-campaign analytics view (separate from
 * CampaignsTable.tsx, which stays focused on campaign management/reordering
 * — see the module comment there). Client-sorted only: this project's
 * campaign count is small enough that fetching every campaign's engagement
 * once and sorting in the browser is simpler and just as fast as a
 * server round-trip per sort change.
 */
export default function CampaignAnalyticsTable({ rows }: { rows: CampaignEngagementRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });
    return list;
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">لا توجد حملات بعد</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-start text-sm">
          <thead>
            <tr className="border-b border-primary-100 bg-wash/70 text-xs font-semibold text-muted">
              <th className="px-3 py-3 text-start">الحملة</th>
              {(["views", "cardClicks", "donationClicks", "linkCopies", "randomSelected", "ctr"] as const).map((key) => (
                <SortHeader key={key} sortKeyName={key} activeKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              ))}
              <th className="px-3 py-3 text-start">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.campaignId} className="border-b border-wash last:border-0 hover:bg-wash/60">
                <td className="max-w-[16rem] px-3 py-3">
                  <Link
                    href={`${ADMIN_BASE_PATH}/campaigns/${row.campaignId}`}
                    className="block truncate font-semibold text-foreground hover:text-primary-dark"
                  >
                    {row.titleAr}
                  </Link>
                </td>
                <td className="px-3 py-3 text-foreground">{row.views}</td>
                <td className="px-3 py-3 text-foreground">{row.cardClicks}</td>
                <td className="px-3 py-3 text-foreground">{row.donationClicks}</td>
                <td className="px-3 py-3 text-foreground">{row.linkCopies}</td>
                <td className="px-3 py-3 text-foreground">{row.randomSelected}</td>
                <td className="px-3 py-3 text-foreground">{Math.round(row.ctr * 100)}%</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[row.status] ?? STATUS_CLASS.active}`}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
