"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CloseIcon, GlobeIcon, MenuIcon } from "./icons";
import ThemeToggle from "./ThemeToggle";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import type { Locale } from "../../lib/i18n/translations";
import { track } from "../../lib/analytics/track";

const navLinks = [
  { href: "/", key: "home" as const },
  { href: "/cases/active", key: "activeCases" as const },
  { href: "/cases/completed", key: "completedCases" as const },
  { href: "/about", key: "about" as const },
  { href: "/terms", key: "terms" as const },
  { href: "/contact", key: "contact" as const },
];

/** A link is "active" on its own page and any of its sub-routes (e.g. /cases/active/[slug] keeps الحالات النشطة highlighted). "/" only matches the exact homepage. */
function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Respects prefers-reduced-motion: an instant jump instead of an animated scroll. */
function scrollToTop() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
}

const otherLanguageLabel: Record<Locale, string> = { ar: "EN", en: "العربية" };

export default function Header({ devBadgeVisible = true }: { devBadgeVisible?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { locale, t, toggleLocale } = useLanguage();

  // Clicking the nav link for the page you're already on has nothing to
  // navigate to, so it scrolls to top instead of doing nothing. Exact-match
  // only (not sub-routes) — e.g. from a case detail page, "الحالات النشطة"
  // still navigates back to the list rather than just scrolling.
  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string, navKey: string) {
    track({ type: "nav_click", route: href, metadata: navKey });
    if (pathname === href) {
      e.preventDefault();
      scrollToTop();
    }
  }
  // Scoped override: only while on the Completed Campaigns page does the
  // "تبرع الآن" CTA switch to the same exact blue-green (#0C787E) used
  // across that page's completed-campaign UI. Its destination (/cases/active)
  // and every other page's button color are unchanged.
  const isCompletedPage = pathname === "/cases/completed";
  const donateButtonClass = isCompletedPage
    ? "bg-[#0C787E] text-white shadow-[0_8px_20px_-8px_rgba(12,120,126,0.5)] hover:bg-[#0A666B] hover:shadow-[0_10px_24px_-8px_rgba(12,120,126,0.6)]"
    : "bg-accent text-on-accent shadow-[0_8px_20px_-8px_rgba(20,83,45,0.45)] hover:bg-accent-strong hover:shadow-[0_10px_24px_-8px_rgba(20,83,45,0.55)]";

  return (
    <header className="header-material sticky top-0 z-50 border-b border-border bg-background/72 backdrop-blur-xl backdrop-saturate-[1.4]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        {/* Brand cluster: the logo link plus the "in development" status,
            grouped as a single flex item so the header keeps exactly three
            top-level children (brand / nav / controls) — the status badge
            doesn't add a fourth gap to the row's space-between distribution.
            The divider keeps it visually distinct from the logo, not nested
            inside the clickable Link. */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
              <Image src="/logo.png" alt={t.nav.logoAlt} width={36} height={36} className="h-full w-full object-cover" />
            </span>
            <span className="text-xl font-bold text-foreground">غرسة</span>
          </Link>

          {/* Admin-controlled (Settings → إعدادات عامة) — hidden entirely,
              divider included, when the site is no longer flagged as "in
              development" rather than just toggling the text. */}
          {devBadgeVisible && (
            <>
              {/* Deliberate themed divider (muted teal, not the neutral
                  border-border token) — a dedicated fixed-height bar rather
                  than a text-height border, so it reads as a considered part
                  of the header rather than an incidental rule. `items-center`
                  on the row centers it against both the logo and the status
                  text. */}
              <span aria-hidden="true" className="h-5 w-px shrink-0 bg-teal-600/35 [html[data-theme=dark]_&]:bg-teal-400/35" />

              <span
                title={t.nav.devBadgeTooltip}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium leading-none whitespace-nowrap text-teal-700 [html[data-theme=dark]_&]:text-teal-400"
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 animate-status-dot rounded-full bg-teal-500" />
                {t.nav.devBadgeLabel}
              </span>
            </>
          )}
        </div>

        <nav className="hidden items-center gap-7 xl:flex">
          {navLinks.map((link) => {
            const active = isActiveLink(pathname, link.href);
            const isCompletedLink = link.href === "/cases/completed";
            const isAboutLink = link.href === "/about";
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href, link.key)}
                aria-current={active ? "page" : undefined}
                className={`group inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px] transition-colors active:opacity-70 ${
                  active
                    ? isCompletedLink
                      ? "font-semibold text-[#0C787E]"
                      : "font-semibold text-primary-dark"
                    : `font-medium text-foreground/80 ${isCompletedLink ? "hover:text-[#0C787E]" : "hover:text-primary"}`
                }`}
              >
                {t.nav[link.key]}
                {isAboutLink && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-xs font-bold leading-none text-primary/70 transition-all duration-200 group-hover:scale-110 group-hover:text-primary"
                  >
                    !
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/cases/active"
            onClick={() => track({ type: "nav_click", route: "/cases/active", metadata: "donateNow" })}
            className={`hidden rounded-full px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 active:brightness-95 sm:inline-block ${donateButtonClass}`}
          >
            {t.nav.donateNow}
          </Link>
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={t.nav.switchLanguage}
            title={t.nav.switchLanguage}
            className="flex h-10 items-center gap-1 rounded-full border border-border px-2.5 text-sm font-semibold text-foreground transition-all hover:bg-primary-50 hover:text-primary active:scale-90 active:bg-primary-100"
          >
            <GlobeIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{otherLanguageLabel[locale]}</span>
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={t.nav.openMenu}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-all active:scale-90 active:bg-primary-50 xl:hidden"
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Always mounted (not conditionally rendered) so the open/close can
          actually transition — reuses the same grid-template-rows 0fr/1fr
          collapse trick already established in ContactForms.tsx, rather
          than the previous hard mount/unmount with no exit motion at all.
          Anchored to the hamburger button above it (same edge, same xl:hidden
          breakpoint), so it opens from the control that triggered it.
          Tier 1 material (same `.header-material` recipe as the header
          itself, so the panel reads as the same floating layer continuing
          downward) with its own soft shadow for separation from the page
          content it now floats above. The nav's own opacity/translate-y
          transition (separate from the grid-rows one on its wrapper) is
          what makes the links fade/slide in with the panel instead of
          popping in the instant there's any height. */}
      <div
        aria-hidden={!open}
        className={`header-material grid overflow-hidden border-t border-border bg-background/72 backdrop-blur-xl backdrop-saturate-[1.4] transition-[grid-template-rows] duration-300 ease-in-out xl:hidden ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        {/* Own opacity/translate-y transition, separate from the outer
            grid-rows one, so the links visibly fade/slide in as the panel
            grows instead of appearing at full opacity the instant there's
            any height — the "materialize with the container" effect. */}
        <nav
          className={`flex min-h-0 flex-col gap-1 px-6 py-4 transition-all duration-300 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
          }`}
        >
          {navLinks.map((link) => {
            const active = isActiveLink(pathname, link.href);
            const isCompletedLink = link.href === "/cases/completed";
            const isAboutLink = link.href === "/about";
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  setOpen(false);
                  handleNavClick(e, link.href, link.key);
                }}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-1 rounded-lg px-2 py-2.5 text-sm transition-colors ${
                  active
                    ? isCompletedLink
                      ? "bg-[#E7F2F2] font-semibold text-[#0C787E]"
                      : "bg-primary-50 font-semibold text-primary-dark"
                    : isCompletedLink
                      ? "font-medium text-foreground/80 hover:bg-[#E7F2F2] active:bg-[#E7F2F2] hover:text-[#0C787E]"
                      : "font-medium text-foreground/80 hover:bg-primary-50 active:bg-primary-50 hover:text-primary"
                }`}
              >
                {t.nav[link.key]}
                {isAboutLink && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-xs font-bold leading-none text-primary/70 transition-all duration-200 group-hover:scale-110 group-hover:text-primary"
                  >
                    !
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href="/cases/active"
            onClick={() => {
              setOpen(false);
              track({ type: "nav_click", route: "/cases/active", metadata: "donateNow" });
            }}
            className={`mt-2 rounded-full px-5 py-2.5 text-center text-sm font-semibold transition-all active:scale-95 active:brightness-95 ${donateButtonClass}`}
          >
            {t.nav.donateNow}
          </Link>
        </nav>
      </div>
    </header>
  );
}
