"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, GlobeIcon, MenuIcon } from "./icons";
import ThemeToggle from "./ThemeToggle";
import RandomCaseButton from "../cases/RandomCaseButton";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import type { Locale } from "../../lib/i18n/translations";
import type { Campaign } from "../../lib/campaigns";
import { track } from "../../lib/analytics/track";

const navLinks = [
  { href: "/", key: "home" as const },
  { href: "/cases/active", key: "activeCases" as const },
  { href: "/cases/completed", key: "completedCases" as const },
  // This trio is a deliberate consecutive visual group (see the brief):
  // in this page's RTL layout, the FIRST array item renders rightmost and
  // the LAST renders leftmost within a flex row (confirmed empirically —
  // see the tick-label ordering note elsewhere in this project), so DOM
  // order overlay → almostThere → updates produces the requested visual
  // left-to-right reading "التحديثات ← اقتربت... → الأوفرلاي" with
  // "اقتربت..." exactly in the middle. Never reorder these 3 independently
  // of each other.
  { href: "/overlay", key: "overlay" as const },
  { href: "/near", key: "almostThere" as const },
  { href: "/updates", key: "updates" as const },
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

/** false during SSR/hydration, true afterwards — gates the body portal for the menu drawer without a setState-in-effect. */
const noopSubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export default function Header({
  devBadgeVisible = true,
  activeCampaigns,
}: {
  devBadgeVisible?: boolean;
  activeCampaigns: Campaign[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { locale, t, toggleLocale } = useLanguage();
  const isClient = useIsClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Drawer open: lock page scroll, Escape closes, focus the close button.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
  // Always the same primary Gharsah green, on every page including
  // Completed Campaigns — this used to swap to that page's blue-green
  // (`--completed`) identity here too, but the Header's own "تبرع الآن" CTA is
  // meant to stay unmistakably the site's green regardless of page; that
  // completed-campaign teal identity still applies everywhere else on the
  // page itself (cards, badges, the nav's own active-state color), just
  // never this one Header button.
  // `relative liquid-sheen` adds the approved "Liquid Glass" edge-highlight
  // sweep (see globals.css) on top of the existing fill/shadow above —
  // nothing about the color/shape/shadow changes. One shared constant used
  // by both the desktop button below and the mobile-menu one further down,
  // so the sheen applies identically to both without a second edit.
  // `header-donate` + `header--completed` (below): on /cases/completed the
  // donate and random-pick buttons take the completed-campaign accent
  // (globals.css), everywhere else their usual colors.
  const donateButtonClass =
    "header-donate relative liquid-sheen bg-accent text-on-accent shadow-[0_8px_20px_-8px_rgba(20,83,45,0.45)] hover:bg-accent-strong hover:shadow-[0_10px_24px_-8px_rgba(20,83,45,0.55)]";

  return (
    // `glass-surface glass-surface--bar` (globals.css): the whole strip,
    // mobile menu panel included, is ONE shared Liquid Glass surface.
    <header
      className={`header-material glass-surface glass-clear glass-surface--bar liquid-sheen section-edge-glow sticky top-0 z-50 border-b border-border ${
        pathname === "/cases/completed" ? "header--completed" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-6">
        {/* Brand cluster: the logo link plus the "in development" status,
            grouped as a single flex item so the header keeps exactly three
            top-level children (brand / nav / controls) — the status badge
            doesn't add a fourth gap to the row's space-between distribution.
            The divider keeps it visually distinct from the logo, not nested
            inside the clickable Link. */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t.nav.openMenu}
            aria-expanded={open}
            aria-controls="site-nav-drawer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-all active:scale-90 active:bg-primary-50 xl:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <Image src="/logo.png" alt={t.nav.logoAlt} width={36} height={36} className="h-full w-full object-cover" />
            </span>
            <span className="text-xl font-bold text-foreground">غرسة</span>
          </Link>

          {/* Admin-controlled (Settings → إعدادات عامة) — hidden entirely,
              divider included, when the site is no longer flagged as "in
              development" rather than just toggling the text. Also hidden
              below `md:` regardless of that setting — a small overflow fix:
              this cluster's divider + un-wrappable status text sits next to
              an equally non-shrinking controls cluster (donate/random-pick/
              language/theme/hamburger, every one `shrink-0`) in a single
              non-wrapping `justify-between` row, and their combined natural
              width doesn't reliably fit in the ~640–767px band where the
              donate + random-pick buttons have just become visible but the
              desktop nav/hamburger swap hasn't happened yet — the header
              row was overflowing the viewport there. This is the one purely
              decorative piece in that row (a "still building this" notice,
              not a functional control), so it's the one that yields first;
              it reappears exactly as before from `md:` up, where there's
              reliably enough room. */}
          {devBadgeVisible && (
            <div className="hidden items-center gap-3 md:flex">
              {/* Deliberate themed divider (muted teal, not the neutral
                  border-border token) — a dedicated fixed-height bar rather
                  than a text-height border, so it reads as a considered part
                  of the header rather than an incidental rule. `items-center`
                  on the row centers it against both the logo and the status
                  text. Dark-mode variant is Champagne (the project's own
                  --primary token, which resolves to Champagne only under
                  data-theme="dark") instead of Tailwind's stock teal — Light
                  Mode's teal is untouched, this only recolors the dark-mode
                  arbitrary variant so no leftover teal survives the luxury
                  black/Champagne rebuild. */}
              <span aria-hidden="true" className="h-5 w-px shrink-0 bg-teal-600/35 [html[data-theme=dark]_&]:bg-primary/35" />

              <span
                title={t.nav.devBadgeTooltip}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium leading-none whitespace-nowrap text-teal-700 [html[data-theme=dark]_&]:text-primary"
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 animate-status-dot rounded-full bg-teal-500 [html[data-theme=dark]_&]:bg-primary" />
                {t.nav.devBadgeLabel}
              </span>
            </div>
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
                      ? "font-bold text-completed-text"
                      : "font-bold text-primary-dark"
                    : `font-semibold text-foreground/80 ${isCompletedLink ? "hover:text-completed-text" : "hover:text-primary"}`
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

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/cases/active"
            onClick={() => track({ type: "nav_click", route: "/cases/active", metadata: "donateNow" })}
            className={`hidden shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 active:brightness-95 sm:inline-block ${donateButtonClass}`}
          >
            {t.nav.donateNow}
          </Link>
          {/* Global random-campaign action, next to donate — same shared
              RandomCaseButton every page uses (see its own doc comment for
              why "header" is only a different button skin, never a second
              pick implementation). Hidden below `sm:` alongside donate
              itself (not enough top-row room on the smallest phones with
              the logo/dev-badge cluster already there) — it's also always
              reachable from the mobile menu panel below for those widths. */}
          <div className="hidden sm:block">
            <RandomCaseButton campaigns={activeCampaigns} variant="header" />
          </div>
          {/* Phones (below sm:): a compact «تبرع الآن» stays in the top row,
              next to the menu button, so it's always one tap away. The
              language switch moves into the menu panel at these widths to
              make room (see below). */}
          <Link
            href="/cases/active"
            onClick={() => track({ type: "nav_click", route: "/cases/active", metadata: "donateNow" })}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2.5 text-xs font-semibold transition-all active:scale-95 active:brightness-95 sm:hidden ${donateButtonClass}`}
          >
            {t.nav.donateNow}
          </Link>
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={t.nav.switchLanguage}
            title={t.nav.switchLanguage}
            className="hidden shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border px-4 py-[9px] text-sm font-semibold text-foreground transition-all hover:bg-primary-50 hover:text-primary active:scale-90 active:bg-primary-100 sm:flex"
          >
            <GlobeIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{otherLanguageLabel[locale]}</span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Below xl: side drawer (replaces the old full-width dropdown).
          Portaled to <body> because the header's glass backdrop-filter
          would otherwise become the containing block of these fixed
          layers. Always mounted after hydration so it can slide both ways;
          slides in from the start edge (right in Arabic, left in English —
          .site-drawer in globals.css) over a dimmed backdrop that closes it. */}
      {isClient &&
        createPortal(
          <div className={`site-drawer-root xl:hidden ${open ? "is-open" : ""} ${pathname === "/cases/completed" ? "header--completed" : ""}`} aria-hidden={!open} inert={!open}>
            <div className="site-drawer-backdrop" onClick={() => setOpen(false)} />
            <div
              id="site-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={t.nav.openMenu}
              className="site-drawer glass-surface glass-clear glass-surface--bar flex flex-col border-border bg-background/90 backdrop-blur-xl"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
                <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    <Image src="/logo.png" alt={t.nav.logoAlt} width={36} height={36} className="h-full w-full object-cover" />
                  </span>
                  <span className="text-xl font-bold text-foreground">غرسة</span>
                </Link>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t.nav.closeMenu}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-all active:scale-90 active:bg-primary-50"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                <ul className="flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const active = isActiveLink(pathname, link.href);
                    const isCompletedLink = link.href === "/cases/completed";
                    const isAboutLink = link.href === "/about";
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={(e) => {
                            setOpen(false);
                            handleNavClick(e, link.href, link.key);
                          }}
                          aria-current={active ? "page" : undefined}
                          className={`site-drawer-link group flex min-h-12 items-center gap-1 rounded-xl px-4 text-[15px] transition-colors ${
                            active
                              ? isCompletedLink
                                ? "is-active is-completed bg-completed-tint/70 font-bold text-completed-strong"
                                : "is-active bg-primary-50/80 font-bold text-primary-dark"
                              : isCompletedLink
                                ? "font-semibold text-foreground/80 hover:bg-completed-surface active:bg-completed-surface hover:text-completed-strong"
                                : "font-semibold text-foreground/80 hover:bg-primary-50 active:bg-primary-50 hover:text-primary"
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
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-4 flex flex-col gap-2 border-t border-border px-1 pt-4">
                  <Link
                    href="/cases/active"
                    onClick={() => {
                      setOpen(false);
                      track({ type: "nav_click", route: "/cases/active", metadata: "donateNow" });
                    }}
                    className={`whitespace-nowrap rounded-full px-5 py-3 text-center text-sm font-semibold transition-all active:scale-95 active:brightness-95 ${donateButtonClass}`}
                  >
                    {t.nav.donateNow}
                  </Link>
                  <div className="flex justify-center">
                    <RandomCaseButton campaigns={activeCampaigns} variant="compact" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      toggleLocale();
                    }}
                    className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-all hover:bg-primary-50 active:scale-95 sm:hidden"
                  >
                    <GlobeIcon className="h-4 w-4 shrink-0" />
                    {otherLanguageLabel[locale]}
                  </button>
                </div>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
