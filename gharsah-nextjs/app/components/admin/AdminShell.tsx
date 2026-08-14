"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { CloseIcon } from "./icons";

/**
 * Responsive chrome: a fixed sidebar on large screens (lg+), collapsing to
 * a slide-over drawer (with a backdrop) on smaller ones — desktop is the
 * priority surface for administration per the brief, but the whole thing
 * stays usable down to mobile widths.
 *
 * Visual identity: the sidebar uses `--primary-darker` — the same forest
 * green from the site's own primary ramp, and (like every `--primary-*`
 * step) one of the few tokens that does NOT change between light/dark mode
 * on the public site either, so a persistently dark, brand-anchored sidebar
 * is consistent with the public site's own token behavior, not a deviation
 * from it. The content column has no opaque background of its own — the
 * shared body gradient (globals.css, identical to the public site) shows
 * through faintly between cards, exactly as it does on every public page.
 */
export default function AdminShell({
  username,
  counts,
  children,
}: {
  username: string;
  counts: { requests: number; messages: number };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-primary-darker lg:block">
        <div className="sticky top-0 h-screen">
          <AdminSidebar counts={counts} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-primary-darker shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="إغلاق القائمة"
              className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="h-4.5 w-4.5" />
            </button>
            <AdminSidebar counts={counts} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader username={username} onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
