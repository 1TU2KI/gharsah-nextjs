"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CampaignRequestRow, RequestStatus } from "@/app/lib/db/requests";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  new: "جديد",
  under_review: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
  completed: "مكتمل",
};

export const REQUEST_STATUS_CLASS: Record<RequestStatus, string> = {
  new: "bg-blue-50 text-blue-700",
  under_review: "bg-amber-50 text-amber-700",
  accepted: "bg-primary-50 text-primary-dark",
  rejected: "bg-red-50 text-red-700",
  completed: "bg-primary-100 text-foreground",
};

export default function RequestsTable({ rows }: { rows: CampaignRequestRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");

  const visible = useMemo(() => {
    let list = rows;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.username ?? "").toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q) ||
          r.campaign_url.toLowerCase().includes(q) ||
          (r.notes ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, search, statusFilter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم، البريد، الرابط..."
          className="min-w-[14rem] flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/15"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "all")}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
        >
          <option value="all">كل الحالات</option>
          {(Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[]).map((s) => (
            <option key={s} value={s}>
              {REQUEST_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-start text-sm">
            <thead>
              <tr className="border-b border-primary-100 bg-wash/70 text-xs font-semibold text-muted">
                <th className="px-4 py-3 text-start">الاسم</th>
                <th className="px-4 py-3 text-start">المعرّف / الصلة</th>
                <th className="px-4 py-3 text-start">البريد</th>
                <th className="px-4 py-3 text-start">التاريخ</th>
                <th className="px-4 py-3 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                    لا توجد طلبات مطابقة
                  </td>
                </tr>
              )}
              {visible.map((row) => (
                <tr key={row.id} className={`border-b border-wash last:border-0 hover:bg-wash/60 ${row.archived_at ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`${ADMIN_BASE_PATH}/requests/${row.id}`} className="font-semibold text-foreground hover:text-primary-dark">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {row.username ? `@${row.username}` : "—"}
                    {row.relationship_type ? ` · ${row.relationship_type}` : ""}
                  </td>
                  <td dir="ltr" className="px-4 py-3 text-start text-xs text-muted">
                    {row.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{new Date(row.created_at).toLocaleDateString("ar-SA")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REQUEST_STATUS_CLASS[row.status]}`}>
                      {REQUEST_STATUS_LABEL[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
