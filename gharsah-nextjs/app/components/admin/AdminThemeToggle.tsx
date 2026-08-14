"use client";

import { SunIcon, MoonIcon } from "@/app/components/home/icons";

/**
 * Same dark-mode mechanism as the public site's ThemeToggle.tsx (same
 * `data-theme` attribute, same localStorage key, so toggling here or on the
 * public site stays in sync) — not a re-import of that component because it
 * calls `useLanguage()` for its aria-label, and the admin area deliberately
 * has no `LanguageProvider` (see AdminRootLayout's own doc comment). Mounting
 * one just for this label risks fighting AdminLocaleLock over
 * `document.documentElement.dir`, since a real LanguageProvider syncs that
 * from its own locale state on mount too. A hardcoded Arabic label avoids
 * that entirely.
 */
export default function AdminThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const isDark = root.getAttribute("data-theme") === "dark";
    if (isDark) {
      root.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    } else {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="تبديل الوضع الداكن والفاتح"
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-primary-50 hover:text-primary active:bg-primary-100 ${className ?? ""}`}
    >
      <SunIcon className="hidden h-5 w-5 [html[data-theme=dark]_&]:block" />
      <MoonIcon className="h-5 w-5 [html[data-theme=dark]_&]:hidden" />
    </button>
  );
}
