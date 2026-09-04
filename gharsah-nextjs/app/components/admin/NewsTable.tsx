"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import type { NewsItemRow, NewsType } from "@/app/lib/db/newsRepo";
import { NEWS_TYPE_META } from "@/app/lib/news/presentation";
import { deleteNewsItemAction, setNewsPublishedAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/news/actions";
import { formatAdminDate } from "@/app/lib/dateFormat";

const SOURCE_LABEL: Record<NewsItemRow["source"], string> = { automatic: "تلقائي", manual: "يدوي" };

/**
 * Every news item (automatic + manual), with source/type badges, a
 * publish/unpublish toggle (works on BOTH kinds — hides from the public
 * feed without deleting the record, per the brief), and edit/delete links
 * shown ONLY for manual rows — automatic campaign_added/campaign_completed
 * rows can be viewed and hidden here, never edited or deleted, so their
 * underlying meaning can't be changed through the admin UI.
 */
export default function NewsTable({ rows }: { rows: NewsItemRow[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<NewsType | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | NewsItemRow["source"]>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(() => {
    let list = rows;
    if (typeFilter !== "all") list = list.filter((r) => r.type === typeFilter);
    if (sourceFilter !== "all") list = list.filter((r) => r.source === sourceFilter);
    const q = search.trim();
    if (q) list = list.filter((r) => (r.title_ar ?? "").includes(q) || r.body_ar.includes(q));
    return list;
  }, [rows, search, typeFilter, sourceFilter]);

  function togglePublished(row: NewsItemRow) {
    setPendingId(row.id);
    startTransition(async () => {
      await setNewsPublishedAction(row.id, row.published !== 1);
      setPendingId(null);
    });
  }

  function handleDelete(row: NewsItemRow) {
    if (!confirm("هل تريد حذف هذا التحديث نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setPendingId(row.id);
    startTransition(async () => {
      await deleteNewsItemAction(row.id);
      setPendingId(null);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث في العنوان أو النص..."
          className="min-w-[14rem] flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/15"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
        >
          <option value="all">كل المصادر</option>
          <option value="automatic">تلقائي</option>
          <option value="manual">يدوي</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
        >
          <option value="all">كل الأنواع</option>
          {(Object.keys(NEWS_TYPE_META) as NewsType[]).map((type) => (
            <option key={type} value={type}>
              {NEWS_TYPE_META[type].labelAr}
            </option>
          ))}
        </select>
        <Link
          href={`${ADMIN_BASE_PATH}/news/new`}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
        >
          + تحديث جديد
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-start text-sm">
            <thead>
              <tr className="border-b border-primary-100 bg-wash/70 text-xs font-semibold text-muted">
                <th className="px-4 py-3 text-start">النوع</th>
                <th className="px-4 py-3 text-start">المصدر</th>
                <th className="px-4 py-3 text-start">العنوان / النص</th>
                <th className="px-4 py-3 text-start">التاريخ</th>
                <th className="px-4 py-3 text-start">الحالة</th>
                <th className="px-4 py-3 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                    لا توجد تحديثات مطابقة
                  </td>
                </tr>
              )}
              {visible.map((row) => {
                const meta = NEWS_TYPE_META[row.type];
                const rowPending = isPending && pendingId === row.id;
                return (
                  <tr key={row.id} className={`border-b border-wash last:border-0 hover:bg-wash/60 ${row.published ? "" : "opacity-60"}`}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badgeClass}`}>{meta.labelAr}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-muted">{SOURCE_LABEL[row.source]}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{row.title_ar || meta.labelAr}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted">{row.body_ar}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{formatAdminDate(row.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.published ? "bg-primary-50 text-primary-dark" : "bg-border text-muted"}`}>
                        {row.published ? "منشور" : "غير منشور"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={rowPending}
                          onClick={() => togglePublished(row)}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-wash disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {row.published ? "إلغاء النشر" : "نشر"}
                        </button>
                        {row.source === "manual" && (
                          <>
                            <Link
                              href={`${ADMIN_BASE_PATH}/news/${row.id}`}
                              className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-wash"
                            >
                              تعديل
                            </Link>
                            <button
                              type="button"
                              disabled={rowPending}
                              onClick={() => handleDelete(row)}
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              حذف
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
