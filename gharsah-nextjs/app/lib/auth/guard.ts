import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./session";
import { ADMIN_LOGIN_PATH } from "./constants";

/** Reads and verifies the admin session cookie. Never throws — returns null for "not signed in" in any form (missing cookie, bad signature, expired). */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * For Server Components (the admin dashboard layout, specifically): the
 * primary per-request gate for every admin page render. `proxy.ts` already
 * redirects unauthenticated requests before they get this far, but Next's
 * own guidance is explicit that Proxy alone isn't sufficient — a matcher
 * mistake later must not silently remove protection — so this re-checks
 * independently rather than trusting the request already passed Proxy.
 */
export async function requireAdminSessionOrRedirect(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  return session;
}

/**
 * For Server Actions and route handlers: the same check, but throws instead
 * of redirecting (a mutation shouldn't trigger a full-page navigation from
 * inside itself). Every admin mutation calls this first — see the note in
 * Next's Proxy docs: Server Functions are POST requests to their own route,
 * so a Proxy matcher mistake would silently skip them too. This is the
 * independent, always-on check that doesn't depend on the matcher being
 * right.
 */
export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
