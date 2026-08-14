import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./app/lib/auth/session";
import { ADMIN_LOGIN_PATH } from "./app/lib/auth/constants";

/**
 * `proxy.ts` — this Next.js version's renamed `middleware.ts` (see
 * node_modules/next/dist/docs/.../proxy.md; `middleware` is deprecated as
 * of v16 in favor of `proxy`, defaulting to the Node.js runtime). Runs
 * before every admin route renders and is the FIRST gate: unauthenticated
 * requests never reach an admin page or layout at all.
 *
 * Per Next's own docs, this is deliberately NOT the only gate — Server
 * Actions are POST requests to the page they're used on, so a matcher
 * mistake here would silently skip them too. `app/lib/auth/guard.ts`
 * re-checks independently in the admin layout (every page render) and in
 * every mutating Server Action, so this proxy is defense-in-depth's first
 * layer, not the only one.
 */
export function proxy(request: NextRequest) {
  return handleAdminAuth(request);
}

async function handleAdminAuth(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login page itself must stay reachable while signed out — everything
  // else under the admin prefix requires a valid session.
  if (pathname === ADMIN_LOGIN_PATH) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Next statically analyzes `matcher` at build time and silently ignores
// anything that isn't a literal constant (imported variables included) —
// see proxy.md's own warning. So this MUST be a literal string, kept in
// sync by hand with ADMIN_BASE_PATH in app/lib/auth/constants.ts (the
// runtime logic above can and does use the real constant safely; only this
// static config is restricted).
export const config = {
  matcher: ["/gh-control-7f2k9/:path*"],
};
