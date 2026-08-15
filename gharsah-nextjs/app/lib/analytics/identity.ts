import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const VISITOR_COOKIE = "gh_vid";
const SESSION_COOKIE = "gh_sid";
/** ~400 days — the practical cap most browsers honor for a first-party cookie; defines "unique visitor" (see analyticsRepo.ts). */
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
/** 30-minute sliding window, renewed on every event — defines one "visit"/session. */
const SESSION_COOKIE_MAX_AGE = 60 * 30;

/**
 * Reads (or creates) both anonymous identity cookies for the current
 * request. Both are random, non-identifying UUIDs — never derived from IP,
 * device fingerprint, or any personal data — set httpOnly so no client
 * script ever needs (or gets) direct access to them.
 *
 * Extracted out of `trackAction.ts` (the original, still the only caller
 * from client components via `track()`) so `app/c/[code]/route.ts` — the
 * short-link redirect, a Route Handler rather than a Server Action — can
 * resolve the exact same visitor/session identity before recording its own
 * `short_link_open` event. `cookies().set()` is valid in both contexts (Next
 * only disallows it during plain Server Component rendering), so this one
 * implementation covers both entry points without duplicating the cookie
 * names/lifetimes, which must stay identical for the two to ever agree on
 * who "the same visitor" is.
 */
export async function resolveVisitorIdentity(): Promise<{ visitorId: string; sessionId: string }> {
  const store = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  let visitorId = store.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = randomUUID();
    store.set(VISITOR_COOKIE, visitorId, { ...cookieOpts, maxAge: VISITOR_COOKIE_MAX_AGE });
  }

  // Always re-set (slides the 30-minute window forward on every event, so a
  // continuously active visit doesn't fragment into several "visits").
  const sessionId = store.get(SESSION_COOKIE)?.value ?? randomUUID();
  store.set(SESSION_COOKIE, sessionId, { ...cookieOpts, maxAge: SESSION_COOKIE_MAX_AGE });

  return { visitorId, sessionId };
}
