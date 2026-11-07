"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./design-preview.module.css";

/**
 * Entirely invented, clearly-fake sample data — never the real campaigns
 * table, never campaignLiveSync, never any `db/` import. Names/amounts are
 * made up for this preview only, deliberately not resembling any real
 * beneficiary name on the actual site.
 */
const SAMPLE_CAMPAIGNS = [
  {
    title: "صدقة جارية — حالة تجريبية ١",
    subtitle: "عن جدة سلمى @sample_01 رحمها الله",
    percent: 72,
    platform: "منصّة تجريبية",
  },
  {
    title: "صدقة جارية — حالة تجريبية ٢",
    subtitle: "عن والد فيصل @sample_02 رحمه الله",
    percent: 38,
    platform: "منصّة تجريبية",
  },
];

type DpTheme = "light" | "dark";

/**
 * All visual state here is LOCAL to this one page — this toggle never
 * reads or writes the real site's `theme` localStorage key, and never
 * touches `document.documentElement`'s `data-theme` attribute (see
 * design-preview.module.css's own top comment for why). Flipping it only
 * ever changes `data-dp-theme` on this component's own wrapper div, so it
 * can have zero effect on the real site, in either direction.
 */
export default function DesignPreviewClient() {
  const [theme, setTheme] = useState<DpTheme>("light");

  return (
    <div className={styles.page} data-dp-theme={theme}>
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {/* Clearly labels this as a non-production experiment, so a
            screenshot of this page can never be mistaken for the real
            homepage or for real campaign data. */}
        <p className="pt-4 text-center text-xs font-semibold tracking-wide" style={{ color: "var(--dp-muted)" }}>
          معاينة تصميم تجريبية — بيانات وهمية لأغراض العرض فقط، وليست جزءًا من الموقع الحالي
        </p>

        {/* ===== Header ===== */}
        <header dir="rtl" className={`${styles.glassSurface} ${styles.header} flex items-center justify-between gap-3 px-4 py-3 sm:px-6`}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/70 p-1">
              <Image src="/logo.png" alt="غرسة" width={32} height={32} className="h-full w-full object-contain" />
            </span>
            <span className="truncate text-lg font-extrabold">غرسة</span>
          </div>

          {/* Decorative-only nav labels — not real routed links, this is a
              visual mockup of the header shape, not a functional nav. */}
          <nav className="hidden items-center gap-5 text-sm font-semibold sm:flex" style={{ color: "var(--dp-muted)" }}>
            <span>الرئيسية</span>
            <span>الحالات النشطة</span>
            <span>عن غرسة</span>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className={`${styles.glassSurface} ${styles.toggleButton} px-3 py-2 text-xs font-bold`}
              aria-pressed={theme === "dark"}
            >
              {theme === "light" ? "🌙 الوضع الداكن" : "☀️ الوضع الفاتح"}
            </button>
          </div>
        </header>

        {/* ===== Hero ===== */}
        <section dir="rtl" className="mt-10 text-center sm:mt-14">
          <span
            className={`${styles.glassSurface} inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold sm:text-sm`}
            style={{ color: "var(--dp-green-dark)" }}
          >
            نافذتك لحملات البثوث
          </span>

          <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
            صَدَقَةٌ تُهْدَى... وَأَجْرٌ
            <br />
            لَا يَنقَطِعُ
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-7 sm:text-base" style={{ color: "var(--dp-muted)" }}>
            دليل يجمع حملات التبرع الموثوقة من منصات رسمية، ويأخذك مباشرة لإتمام تبرعك، لتكون صدقة جارية لمن سبقونا إلى الله.
          </p>

          <button type="button" className={`${styles.liquidButton} mt-6 rounded-full px-7 py-3 text-sm font-bold sm:text-base`}>
            تصفّح الحالات
          </button>
        </section>

        {/* ===== Sample campaign cards ===== */}
        <section className="mt-12 grid gap-5 sm:mt-16 sm:grid-cols-2">
          {SAMPLE_CAMPAIGNS.map((c) => (
            <article key={c.title} dir="rtl" className={`${styles.glassSurface} ${styles.card} flex flex-col gap-3 p-5`}>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`${styles.glassSurface} rounded-full px-2.5 py-1 text-[11px] font-bold`}
                  style={{ color: "var(--dp-green-dark)" }}
                >
                  {c.platform}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: "var(--dp-muted)" }}>
                  نشطة
                </span>
              </div>

              <h2 className="text-base font-bold leading-6 sm:text-lg">{c.title}</h2>
              <p className="text-sm leading-6" style={{ color: "var(--dp-muted)" }}>
                {c.subtitle}
              </p>

              <div>
                <div className={`${styles.progressTrack} h-2 w-full overflow-hidden rounded-full`}>
                  <div className={`${styles.progressFill} h-full rounded-full`} style={{ width: `${c.percent}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs font-bold">
                  <span style={{ color: "var(--dp-green-dark)" }}>{c.percent}٪ مكتملة</span>
                  <span style={{ color: "var(--dp-muted)" }}>تبقّى {100 - c.percent}٪</span>
                </div>
              </div>

              <button type="button" className={`${styles.liquidButton} mt-1 rounded-full px-4 py-2.5 text-sm font-bold`}>
                التبرع عبر المنصة الرسمية
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
