"use client";

import Link from "next/link";
import { logout } from "@/app/lib/auth/actions";
import { MenuIcon, LogoutIcon, ExternalLinkIcon } from "./icons";
import AdminGlobalSearch from "./AdminGlobalSearch";
import AdminThemeToggle from "./AdminThemeToggle";

/** Same "tier 1 material" as the public Header — `.header-material` (shared
 * shadow/highlight tokens) + the identical translucent/blurred/saturated
 * surface recipe — so the admin top bar reads as the same floating layer
 * language as the public site's own header, not a lookalike rebuild. */
export default function AdminHeader({ username, onOpenSidebar }: { username: string; onOpenSidebar: () => void }) {
  return (
    <header className="header-material sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/72 px-4 backdrop-blur-xl backdrop-saturate-[1.4] sm:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="فتح القائمة"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary-50 hover:text-primary lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <AdminGlobalSearch />
      </div>

      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-primary-50 hover:text-primary-dark sm:inline-flex"
      >
        <ExternalLinkIcon className="h-3.5 w-3.5" />
        عرض الموقع
      </Link>

      <AdminThemeToggle className="h-9 w-9 shrink-0" />

      <div className="hidden items-center gap-2 border-s border-border ps-3 sm:flex">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-dark text-xs font-bold text-white">
          {username.slice(0, 1).toUpperCase()}
        </div>
        <span dir="ltr" className="max-w-[8rem] truncate text-xs font-semibold text-foreground/80">
          {username}
        </span>
      </div>

      <form action={logout}>
        <button
          type="submit"
          aria-label="تسجيل الخروج"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogoutIcon className="h-4.5 w-4.5" />
        </button>
      </form>
    </header>
  );
}
