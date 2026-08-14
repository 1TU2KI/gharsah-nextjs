"use client";

import { MoonIcon, SunIcon } from "./icons";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import { track } from "../../lib/analytics/track";

export default function ThemeToggle({ className }: { className?: string }) {
  const { t } = useLanguage();

  function toggle() {
    const root = document.documentElement;
    const isDark = root.getAttribute("data-theme") === "dark";
    if (isDark) {
      root.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
      track({ type: "theme_toggle", metadata: "light" });
    } else {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
      track({ type: "theme_toggle", metadata: "dark" });
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t.nav.themeToggle}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-primary-50 hover:text-primary active:bg-primary-100 ${className ?? ""}`}
    >
      <SunIcon className="hidden h-5 w-5 [html[data-theme=dark]_&]:block" />
      <MoonIcon className="h-5 w-5 [html[data-theme=dark]_&]:hidden" />
    </button>
  );
}
