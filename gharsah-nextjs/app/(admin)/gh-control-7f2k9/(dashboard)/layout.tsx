import { requireAdminSessionOrRedirect } from "@/app/lib/auth/guard";
import { countRequestsByStatus } from "@/app/lib/db/requests";
import { countUnreadMessages } from "@/app/lib/db/messages";
import AdminShell from "@/app/components/admin/AdminShell";

/**
 * Every authenticated admin page renders through here. Two independent
 * things happen on every request, not just once at login:
 *
 * 1. `requireAdminSessionOrRedirect()` — the primary per-request guard.
 *    `proxy.ts` already redirects unauthenticated requests before they
 *    reach this far, but this re-checks independently (see the comment in
 *    guard.ts on why Proxy alone isn't treated as sufficient).
 * 2. Sidebar badge counts (new requests, unread messages) are fetched
 *    fresh so they're never stale after an admin action elsewhere.
 */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSessionOrRedirect();

  const requestCounts = countRequestsByStatus();
  const counts = {
    requests: requestCounts.new,
    messages: countUnreadMessages(),
  };

  return (
    <AdminShell username={session.username} counts={counts}>
      {children}
    </AdminShell>
  );
}
