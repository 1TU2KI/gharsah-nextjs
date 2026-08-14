"use client";

import Link from "next/link";
import { ScaleIcon, WarningIcon } from "@/app/components/home/icons";
import SectionBackdrop from "@/app/components/decor/SectionBackdrop";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";

export default function TermsPageClient() {
  const { t, locale } = useLanguage();
  const headingClass = locale === "en" ? "leading-tight tracking-tight" : "";
  const bodyLeadingClass = locale === "ar" ? "leading-8" : "leading-7";

  return (
    <main className="flex-1">
      <section className="relative overflow-x-hidden py-16">
        <SectionBackdrop tone="neutral" />

        <div className="relative z-10 mx-auto max-w-4xl px-6">
          <h1 className={`text-2xl font-extrabold text-foreground sm:text-3xl ${headingClass}`}>{t.terms.heading}</h1>

          <div className="mt-8 space-y-8">
            {/* Requirements for adding a case */}
            <div className="card-elevated rounded-2xl border border-border bg-background/80 p-8 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
                  <ScaleIcon className="h-5 w-5" />
                </span>
                <h2 className={`text-xl font-extrabold text-foreground sm:text-2xl ${headingClass}`}>
                  {t.terms.requirementsHeading}
                </h2>
              </div>

              <p className={`mt-3 text-sm text-foreground/80 ${bodyLeadingClass}`}>{t.terms.requirementsIntro}</p>

              <ul className="mt-4 space-y-4">
                {t.terms.requirements.map((item) => (
                  <li
                    key={item}
                    className={`flex items-center gap-3 text-base font-semibold text-foreground/80 ${bodyLeadingClass}`}
                  >
                    <span className="shrink-0 translate-y-2 text-[3em] font-bold leading-none text-primary" aria-hidden="true">
                      *
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notice */}
            <div className="card-elevated flex items-start gap-4 rounded-2xl border border-border bg-sunlight/85 p-6 backdrop-blur-md">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/60 text-foreground">
                <WarningIcon className="h-5 w-5" />
              </span>
              <p className={`text-sm text-foreground/90 ${bodyLeadingClass}`}>{t.terms.notice}</p>
            </div>
          </div>

          <p className="mt-6 text-sm">
            <Link
              href="/about"
              className="font-semibold text-primary-dark transition-colors hover:underline active:opacity-70"
            >
              {t.terms.backLinkLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
