"use client";

import { useEffect } from "react";

/**
 * The root layout's anti-flash script (app/layout.tsx) reads the PUBLIC
 * site's stored language preference from localStorage and may flip
 * `<html lang dir>` to English/LTR before this ever mounts — correct for
 * the public site's own toggle, but the admin area has no such toggle and
 * always renders Arabic labels. Without this, an admin who'd previously
 * switched the public site to English would land on a mismatched
 * `dir="ltr"` admin page with Arabic text. Forces it back on mount.
 */
export default function AdminLocaleLock() {
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, []);

  return null;
}
