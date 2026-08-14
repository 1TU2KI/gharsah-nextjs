import type { Metadata } from "next";
import AdminLocaleLock from "@/app/components/admin/AdminLocaleLock";

/**
 * Top-level layout for the ENTIRE private admin area — wraps both the
 * login page and the authenticated dashboard (`(dashboard)/layout.tsx`
 * nested inside this one adds the sidebar/header chrome and the actual
 * auth guard). Deliberately minimal here: no public Header/Footer, no
 * AmbientBackground, no LanguageProvider — the admin area is a fully
 * separate application area sharing only the true root layout's
 * `<html>`/`<body>`/font/global-CSS shell (see app/layout.tsx).
 *
 * `robots: noindex, nofollow` applies to every page under this route
 * (Next merges metadata down the tree) — required even though the route is
 * never linked anywhere, since obscurity alone is explicitly not the
 * security mechanism here; a crawler that somehow finds the URL is still
 * told not to index or follow it.
 */
export const metadata: Metadata = {
  title: "لوحة تحكم غرسة",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminLocaleLock />
      {children}
    </>
  );
}
