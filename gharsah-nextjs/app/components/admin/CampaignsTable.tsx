"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { CampaignRow } from "@/app/lib/db/campaignsRepo";
import type { CampaignEngagementRow } from "@/app/lib/db/analyticsRepo";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import { moveCampaignAction, reorderCampaignsAction, quickChangeStatusAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/campaigns/actions";

type SortBy = "order" | "newest" | "title";

const STATUS_LABEL: Record<string, string> = { active: "نشطة", completed: "مكتملة", closed: "مغلقة" };
/** Exact same solid badge colors as the public campaign card's status badge (`badgeClass` in CampaignCard.tsx) — active = primary-dark, completed = the site's dedicated completed-teal #0C787E — so the admin badge and the public one read as the same visual language, not a lookalike. */
const STATUS_CLASS: Record<string, string> = {
  active: "bg-primary-dark text-white",
  completed: "bg-[#0C787E] text-white",
  closed: "bg-border text-muted",
};

export default function CampaignsTable({
  initialRows,
  engagement,
}: {
  initialRows: CampaignRow[];
  /** Read-only glance numbers — see the full sortable breakdown on الإحصائيات (CampaignAnalyticsTable) instead of duplicating sort/filter logic here. */
  engagement?: CampaignEngagementRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const engagementById = useMemo(() => new Map((engagement ?? []).map((e) => [e.campaignId, e])), [engagement]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("order");
  const [showArchived, setShowArchived] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  const platforms = useMemo(() => Array.from(new Set(rows.map((r) => r.platform))), [rows]);

  const dragEnabled = sortBy === "order" && !search.trim() && statusFilter === "all" && platformFilter === "all";

  const visibleRows = useMemo(() => {
    let list = rows.filter((r) => (showArchived ? true : !r.archived_at));
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (platformFilter !== "all") list = list.filter((r) => r.platform === platformFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title_ar.toLowerCase().includes(q) ||
          r.title_en.toLowerCase().includes(q) ||
          (r.username ?? "").toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.url.toLowerCase().includes(q),
      );
    }
    if (sortBy === "newest") list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sortBy === "title") list = [...list].sort((a, b) => a.title_ar.localeCompare(b.title_ar, "ar"));
    else list = [...list].sort((a, b) => a.order_index - b.order_index);
    return list;
  }, [rows, search, statusFilter, platformFilter, sortBy, showArchived]);

  function handleMove(id: string, direction: "up" | "down") {
    setRows((prev) => {
      const list = [...prev].sort((a, b) => a.order_index - b.order_index);
      const idx = list.findIndex((r) => r.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return prev;
      const a = list[idx].order_index;
      const b = list[swapIdx].order_index;
      list[idx] = { ...list[idx], order_index: b };
      list[swapIdx] = { ...list[swapIdx], order_index: a };
      return list;
    });
    startTransition(() => moveCampaignAction(id, direction));
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ordered = [...visibleRows];
    const fromIndex = ordered.findIndex((r) => r.id === dragId);
    const toIndex = ordered.findIndex((r) => r.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);

    setRows((prev) => {
      const byId = new Map(prev.map((r) => [r.id, r]));
      ordered.forEach((r, i) => byId.set(r.id, { ...r, order_index: i + 1 }));
      return Array.from(byId.values());
    });
    setDragId(null);
    startTransition(() => reorderCampaignsAction(ordered.map((r) => r.id)));
  }

  function handleStatusToggle(row: CampaignRow) {
    const next = row.status === "active" ? "completed" : "active";
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    startTransition(() => quickChangeStatusAction(row.id, next));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالعنوان، المستخدم، الرابط..."
          className="min-w-[14rem] flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/15"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشطة</option>
          <option value="completed">مكتملة</option>
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
        >
          <option value="all">كل المنصات</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
        >
          <option value="order">الترتيب المعروض</option>
          <option value="newest">الأحدث</option>
          <option value="title">العنوان (أ-ي)</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          إظهار المؤرشفة
        </label>
      </div>

      {!dragEnabled && (
        <p className="mb-3 text-xs text-muted">السحب لإعادة الترتيب متاح فقط عند اختيار «الترتيب المعروض» بلا بحث أو فلاتر.</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-start text-sm">
            <thead>
              <tr className="border-b border-primary-100 bg-wash/70 text-xs font-semibold text-muted">
                <th className="w-10 px-3 py-3"></th>
                <th className="px-3 py-3 text-start">الحملة</th>
                <th className="px-3 py-3 text-start">المنصة</th>
                <th className="px-3 py-3 text-start">الحالة</th>
                <th className="px-3 py-3 text-start">النسبة</th>
                {engagement && (
                  <th className="px-3 py-3 text-start" title="مشاهدات / ضغطات التبرع — الأرقام الكاملة والفرز في الإحصائيات">
                    التفاعل
                  </th>
                )}
                <th className="px-3 py-3 text-start">الترتيب</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={engagement ? 8 : 7} className="px-3 py-10 text-center text-sm text-muted">
                    لا توجد حملات مطابقة
                  </td>
                </tr>
              )}
              {visibleRows.map((row) => (
                <tr
                  key={row.id}
                  draggable={dragEnabled}
                  onDragStart={() => setDragId(row.id)}
                  onDragOver={(e) => dragEnabled && e.preventDefault()}
                  onDrop={() => dragEnabled && handleDrop(row.id)}
                  className={`border-b border-wash last:border-0 hover:bg-wash/60 ${row.archived_at ? "opacity-50" : ""} ${dragEnabled ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  <td className="px-3 py-3 text-primary-200">{dragEnabled ? "⠿" : ""}</td>
                  <td className="max-w-[20rem] px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`${ADMIN_BASE_PATH}/campaigns/${row.id}`} className="block truncate font-semibold text-foreground hover:text-primary-dark">
                        {row.title_ar}
                      </Link>
                      {row.translation_status === "error" && (
                        <span
                          title="تعذّرت الترجمة الإنجليزية التلقائية — افتح الحملة لإعادة المحاولة"
                          className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600"
                        >
                          EN⚠
                        </span>
                      )}
                    </div>
                    <p dir="ltr" className="truncate text-xs text-muted">
                      /{row.slug} {row.username ? `· @${row.username}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">{row.platform}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(row)}
                      disabled={pending}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80 ${STATUS_CLASS[row.status]}`}
                      title="اضغط لتبديل الحالة"
                    >
                      {STATUS_LABEL[row.status]}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">{row.percent !== null ? `${row.percent}%` : "—"}</td>
                  {engagement && (
                    <td className="px-3 py-3 text-xs text-muted">
                      {engagementById.get(row.id) ? (
                        <span>
                          {engagementById.get(row.id)!.views} مشاهدة · {engagementById.get(row.id)!.donationClicks} تبرع
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(row.id, "up")}
                        disabled={pending}
                        aria-label="نقل لأعلى"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-primary-100 hover:text-foreground"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(row.id, "down")}
                        disabled={pending}
                        aria-label="نقل لأسفل"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-primary-100 hover:text-foreground"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-end">
                    <Link
                      href={`${ADMIN_BASE_PATH}/campaigns/${row.id}`}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-wash"
                    >
                      تعديل
                    </Link>
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
