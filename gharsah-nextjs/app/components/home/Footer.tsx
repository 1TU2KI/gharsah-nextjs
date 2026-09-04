"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckBadgeIcon, LeafIcon } from "./icons";
import { useLanguage } from "../../lib/i18n/LanguageProvider";

const quickLinks = [
  { href: "/", key: "home" as const },
  { href: "/cases/active", key: "activeCases" as const },
  { href: "/cases/completed", key: "completedCases" as const },
  { href: "/about", key: "about" as const },
  { href: "/terms", key: "terms" as const },
  { href: "/contact", key: "contact" as const },
];

const whyIcons = [LeafIcon, CheckBadgeIcon, LeafIcon, CheckBadgeIcon];

export default function Footer() {
  const { t } = useLanguage();
  // Scoped override: only the Completed Campaigns page swaps the footer's
  // green identity for the same exact blue-green (#0C787E) used throughout
  // that page's completed-campaign UI. Every other page keeps the normal
  // accent/on-accent tokens (which already invert green<->white per theme).
  const isCompletedPage = usePathname() === "/cases/completed";

  // Flat, fully OPAQUE surface, no blur/mask — a clean, hard-edged block
  // against the page background, per the brief ("sharp, solid, no
  // gradient/fade/blur transition"). Painted straight on `<footer>` itself.
  const surfaceClass = isCompletedPage ? "bg-[#0C787E]" : "bg-accent";
  const textClass = isCompletedPage ? "text-white" : "text-on-accent";
  const mutedTextClass = isCompletedPage ? "text-white/70" : "text-on-accent/70";
  const faintTextClass = isCompletedPage ? "text-white/60" : "text-on-accent/60";
  const iconChipClass = isCompletedPage ? "bg-white/10" : "bg-on-accent/10";
  const dividerClass = isCompletedPage ? "border-white/10" : "border-on-accent/10";
  const linkHoverClass = isCompletedPage ? "hover:text-white" : "hover:text-on-accent";

  return (
    <footer className={`border-t border-border ${surfaceClass}`}>
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            {/* Footer-only: white circular backdrop behind the logo mark (per
                brief — Header stays transparent, this is intentionally not a
                shared class so it can never leak there). object-contain +
                padding keeps the mark from touching the circle's edge; p-1
                (vs. p-1.5) lets the icon fill more of the circle while still
                keeping a comfortable gap from the edge. */}
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
              <Image src="/logo.png" alt={t.nav.logoAlt} width={36} height={36} className="h-full w-full object-contain" />
            </span>
            <span className={`text-xl font-bold ${textClass}`}>غرسة</span>
          </div>
          <p className={`mt-4 text-sm leading-6 ${mutedTextClass}`}>{t.footer.description}</p>
        </div>

        <div>
          <h3 className={`text-sm font-semibold ${textClass}`}>{t.footer.quickLinksHeading}</h3>
          <ul className="mt-4 space-y-3">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={`text-sm ${mutedTextClass} ${linkHoverClass}`}>
                  {t.nav[link.key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className={`text-sm font-semibold ${textClass}`}>{t.footer.whyHeading}</h3>
          <ul className="mt-4 space-y-3">
            {t.footer.whyItems.map((label, index) => {
              const Icon = whyIcons[index];
              return (
                <li key={label} className={`flex items-center gap-2.5 text-sm ${mutedTextClass}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${iconChipClass}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  {label}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className={`text-sm font-semibold ${textClass}`}>{t.footer.contactHeading}</h3>
          <p className={`mt-4 text-sm leading-6 ${mutedTextClass}`}>
            {t.footer.contactTextBefore}{" "}
            <Link href="/contact" className={`font-semibold underline underline-offset-2 ${linkHoverClass} ${textClass}`}>
              {t.footer.contactLinkLabel}
            </Link>
            .
          </p>
        </div>
      </div>

      <div className={`border-t px-6 py-6 text-center text-xs ${dividerClass} ${faintTextClass}`}>
        {t.footer.copyright(new Date().getFullYear())}
      </div>
    </footer>
  );
}
