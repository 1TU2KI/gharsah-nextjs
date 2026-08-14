"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ContactMessageRow } from "@/app/lib/db/messages";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

export default function MessagesTable({ rows }: { rows: ContactMessageRow[] }) {
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");

  const visible = useMemo(() => {
    let list = rows;
    if (readFilter === "unread") list = list.filter((r) => r.is_read === 0);
    if (readFilter === "read") list = list.filter((r) => r.is_read === 1);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q) || r.message.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, search, readFilter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم، البريد، محتوى الرسالة..."
          className="min-w-[14rem] flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/15"
        />
        <select
          value={readFilter}
          onChange={(e) => setReadFilter(e.target.value as typeof readFilter)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
        >
          <option value="all">الكل</option>
          <option value="unread">غير مقروءة</option>
          <option value="read">مقروءة</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {visible.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">لا توجد رسائل مطابقة</p>}
        <ul className="divide-y divide-wash">
          {visible.map((row) => (
            <li key={row.id} className={row.archived_at ? "opacity-50" : ""}>
              <Link href={`${ADMIN_BASE_PATH}/messages/${row.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-wash/60">
                {!row.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-light" aria-label="غير مقروءة" />}
                {row.is_read === 1 && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm ${row.is_read ? "font-medium text-foreground" : "font-bold text-foreground"}`}>{row.name}</p>
                    <span className="shrink-0 text-xs text-muted">{new Date(row.created_at).toLocaleDateString("ar-SA")}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">{row.message}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
