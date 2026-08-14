"use client";

import ContactForms from "./ContactForms";
import SectionBackdrop from "@/app/components/decor/SectionBackdrop";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";

export default function ContactPageClient() {
  const { t, locale } = useLanguage();

  return (
    <main className="flex-1">
      <section className="relative overflow-x-hidden py-16">
        <SectionBackdrop tone="neutral" />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h1
              className={`text-3xl font-extrabold text-foreground sm:text-4xl ${locale === "en" ? "tracking-tight" : ""}`}
            >
              {t.contact.pageHeading}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-muted">{t.contact.pageDescription}</p>
          </div>

          <div className="mt-12">
            <ContactForms />
          </div>
        </div>
      </section>
    </main>
  );
}
