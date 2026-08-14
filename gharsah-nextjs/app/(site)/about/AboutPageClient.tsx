"use client";

import Link from "next/link";
import { Amiri } from "next/font/google";
import { AlertCircleIcon } from "@/app/components/home/icons";
import SectionBackdrop from "@/app/components/decor/SectionBackdrop";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";

const amiri = Amiri({ subsets: ["arabic"], weight: ["700"] });

export default function AboutPageClient() {
  const { t, locale } = useLanguage();

  return (
    <main className="flex-1">
      <section className="relative overflow-x-hidden py-16">
        <SectionBackdrop tone="neutral" />

        <div className="relative z-10 mx-auto max-w-4xl px-6">
          <div className="card-elevated rounded-2xl border border-border bg-background/80 p-8 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
                <AlertCircleIcon className="h-5 w-5" />
              </span>
              <h1
                className={`text-2xl font-extrabold text-foreground sm:text-3xl ${
                  locale === "en" ? "leading-tight tracking-tight" : ""
                }`}
              >
                {t.about.heading} <span className="text-primary">!</span>
              </h1>
            </div>

            <div
              className={`mt-6 space-y-4 text-justify text-sm text-foreground/80 sm:text-base ${
                locale === "ar" ? "leading-8" : "leading-7"
              }`}
            >
              {t.about.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <p className="mt-6 text-sm">
              <Link
                href="/terms"
                className="font-semibold text-primary-dark transition-colors hover:underline active:opacity-70"
              >
                {t.about.termsLinkLabel}
              </Link>
            </p>

            <p className="mt-8 border-t border-border pt-5 text-xs leading-6 text-muted">{t.about.developedBy}</p>
          </div>

          {/* Closing signature: deliberately outside the card and un-boxed so
              it reads as the page's own concluding voice, not another content
              block — a thin fading gradient line stands in for a divider,
              and only the couplet's second line carries the brand green so
              the accent stays a detail, not a wash. */}
          <div className="mt-16 text-center sm:mt-20">
            <div className="mx-auto h-px w-16 bg-gradient-to-l from-transparent via-primary/40 to-transparent" />
            <p
              className={`${locale === "ar" ? amiri.className : ""} mx-auto mt-6 max-w-2xl text-xl leading-loose text-foreground/90 sm:text-2xl`}
            >
              {/* Intentional break after the em dash (not left to automatic
                  wrapping): `whitespace-nowrap` keeps this first line whole
                  on normal desktop widths — wide enough now, with the
                  widened container above, that "remain" can't drop onto a
                  line of its own — while staying `whitespace-normal` below
                  `sm` so narrow phones can still wrap it naturally instead
                  of overflowing or forcing the font smaller. */}
              <span className="whitespace-normal sm:whitespace-nowrap">{t.about.coupletLine1}</span>
              <br />
              <span className="text-primary-dark">{t.about.coupletLine2}</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
