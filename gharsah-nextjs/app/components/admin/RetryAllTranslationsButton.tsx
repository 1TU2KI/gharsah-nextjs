"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  retryAllCampaignTranslationsAction,
  type RetryOutcomeKind,
  type RetryReportItem,
} from "@/app/(admin)/gh-control-7f2k9/(dashboard)/campaigns/actions";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

const OUTCOME: Record<RetryOutcomeKind, { label: string; tone: string }> = {
  translated: { label: "مترجمة", tone: "bg-primary-50 text-primary-dark" },
  review: { label: "مترجمة — يُنصح بالمراجعة", tone: "bg-amber-50 text-amber-700" },
  pending: { label: "معلّقة — المحرك غير متاح", tone: "bg-amber-50 text-amber-700" },
  failed: { label: "فشلت", tone: "bg-red-50 text-red-600" },
};

/**
 * Retries English for every campaign that needs it (missing / pending /
 * failed / stale fields, plus changed live Ehsan text) and lists the outcome
 * for EACH campaign. Only translation columns are written; hand-typed and
 * current English are never replaced.
 */
export default function RetryAllTranslationsButton({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [running, startRun] = useTransition();
  const [items, setItems] = useState<RetryReportItem[] | null>(null);

  function run() {
    startRun(async () => {
      const result = await retryAllCampaignTranslationsAction();
      setItems(result.items);
      router.refresh();
    });
  }

  // Campaigns this run touched, or that still aren't fully translated.
  const shown = items?.filter((i) => i.changed || i.outcome !== "translated") ?? [];
  const untouched = items ? items.length - shown.length : 0;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-wash disabled:opacity-50"
      >
        {running ? "جارٍ إعادة المحاولة..." : `إعادة محاولة الترجمات الناقصة (${pendingCount})`}
      </button>
      {items && (
        <div data-testid="retry-report" className="w-full max-w-md rounded-xl border border-border bg-background p-3 text-xs">
          <p className="font-semibold text-foreground">نتيجة إعادة المحاولة لكل حملة</p>
          {shown.length === 0 && <p className="mt-1 text-muted">لا توجد حملات تحتاج ترجمة.</p>}
          <ul className="mt-2 space-y-1.5">
            {shown.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`${ADMIN_BASE_PATH}/campaigns/${item.id}`} className="truncate text-foreground hover:underline">
                    {item.titleAr} <span dir="ltr" className="text-muted">/{item.slug}</span>
                  </Link>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${OUTCOME[item.outcome].tone}`}>
                    {OUTCOME[item.outcome].label}
                  </span>
                </div>
                {item.error && <p className="text-[11px] leading-5 text-red-600">{item.error}</p>}
              </li>
            ))}
          </ul>
          {untouched > 0 && <p className="mt-2 text-[11px] text-muted">{untouched} حملة أخرى مترجمة بالكامل ولم تتغير.</p>}
        </div>
      )}
    </div>
  );
}
