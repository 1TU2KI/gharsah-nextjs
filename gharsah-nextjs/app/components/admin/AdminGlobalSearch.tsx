"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { searchAdmin, type AdminSearchResult } from "@/app/lib/admin/search";
import { SearchIcon } from "./icons";

const TYPE_LABEL: Record<AdminSearchResult["type"], string> = {
  campaign: "حملة",
  request: "طلب",
  message: "رسالة",
};

export default function AdminGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(debounceRef.current);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setOpen(true);
    window.clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      startTransition(async () => {
        const found = await searchAdmin(value);
        setResults(found);
      });
    }, 250);
  }

  return (
    <div ref={containerRef} className="relative max-w-md">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="بحث في الحملات، الطلبات، الرسائل..."
          className="w-full rounded-xl border border-border bg-wash py-2 pe-9 ps-3 text-sm text-foreground outline-none transition-all placeholder:text-muted focus:border-primary-light focus:bg-background focus:ring-2 focus:ring-primary-light/20"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-border bg-background py-1.5 shadow-xl shadow-black/10">
          {pending && <p className="px-4 py-3 text-xs text-muted">جارٍ البحث...</p>}

          {!pending && results.length === 0 && <p className="px-4 py-3 text-xs text-muted">لا توجد نتائج</p>}

          {!pending &&
            results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-wash"
              >
                <span className="shrink-0 rounded-md bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-muted">
                  {TYPE_LABEL[result.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{result.title}</span>
                  <span dir="ltr" className="block truncate text-start text-xs text-muted">
                    {result.subtitle}
                  </span>
                </span>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
