"use client";

import ContactForms from "@/app/(site)/contact/ContactForms";
import { useLanguage } from "../../lib/i18n/LanguageProvider";

export default function ContactSection() {
  const { t, locale } = useLanguage();

  return (
    <section className="relative overflow-x-hidden py-20">
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2
            className={`text-3xl font-extrabold text-foreground sm:text-4xl ${locale === "en" ? "tracking-tight" : ""}`}
          >
            {t.contact.pageHeading}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{t.contact.pageDescription}</p>
        </div>

        <div className="mt-12">
          <ContactForms initialTab={null} collapsible />
        </div>
      </div>
    </section>
  );
}
