"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { translations, type Locale } from "./translations";
import { track } from "../analytics/track";

const STORAGE_KEY = "lang";

type LanguageContextValue = {
  locale: Locale;
  t: (typeof translations)["ar"];
  toggleLocale: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Server always renders Arabic (matches the `<html lang="ar" dir="rtl">`
 * shipped from the root layout), so `locale` starts at "ar" here too —
 * anything else would be a hydration mismatch. The stored preference is
 * read after mount instead, in a `useEffect`, which means a returning
 * English-preferring visitor sees a brief flash of Arabic before it
 * switches; that's the accepted tradeoff of a client-only (no locale-in-URL)
 * toggle. See the inline anti-flash script in layout.tsx for how dark mode
 * avoids the equivalent flash for *colors* — that trick doesn't extend to
 * swapping actual text content, which only React can do.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ar");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable (private mode, etc.) — stay on the default.
    }
    // Deliberate: hydrating client-only state from localStorage after mount
    // (not deriving it during render) is exactly what avoids the SSR/client
    // text mismatch documented above — there's no external "change" event to
    // move this into instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "en") setLocale("en");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "en" ? "ltr" : "rtl";
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Ignore — the toggle still works for the current session.
    }
  }, [locale]);

  const toggleLocale = useCallback(() => {
    const next = locale === "ar" ? "en" : "ar";
    // Fired here rather than in Header's button (the only real caller today,
    // but not the only conceivable one) so any trigger of an actual switch
    // is captured. `setLocale`'s own updater form is deliberately not used
    // for this state change — a state updater function must stay pure and
    // can run more than once (React Strict Mode, concurrent rendering),
    // which would double-count a side effect placed inside it.
    track({ type: "language_switch", metadata: next });
    setLocale(next);
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, t: translations[locale], toggleLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
