"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { recordAnalyticsEvent, type AnalyticsEventType } from "../db/analyticsRepo";
import { parseUserAgent, isLikelyBot } from "./userAgent";
import { bucketReferrer } from "./referrer";

const VISITOR_COOKIE = "gh_vid";
const SESSION_COOKIE = "gh_sid";
/** ~400 days — the practical cap most browsers honor for a first-party cookie; defines "unique visitor" (see analyticsRepo.ts). */
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
/** 30-minute sliding window, renewed on every event — defines one "visit"/session. */
const SESSION_COOKIE_MAX_AGE = 60 * 30;

const MAX_FIELD_LENGTH = 200;

export type TrackInput = {
  type: AnalyticsEventType;
  campaignId?: string | null;
  route?: string | null;
  /** Raw `document.referrer` from the client — bucketed into a fixed label server-side (see referrer.ts); the raw URL is never stored. */
  referrer?: string | null;
  /** Short plain-text tag for event-specific context (e.g. which nav link) — never free-form user input. */
  metadata?: string | null;
};

function truncate(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length > MAX_FIELD_LENGTH ? value.slice(0, MAX_FIELD_LENGTH) : value;
}

/**
 * Reads (or creates) both anonymous identity cookies for the current
 * request. Both are random, non-identifying UUIDs — never derived from IP,
 * device fingerprint, or any personal data — set httpOnly so no client
 * script ever needs (or gets) direct access to them; only this server
 * action reads/writes them.
 */
async function resolveIdentity(): Promise<{ visitorId: string; sessionId: string }> {
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

/**
 * The one write path for all public-site analytics — called fire-and-forget
 * (never awaited) from client components, so a slow or failing call can
 * never delay navigation or the donation transition. Swallows every error
 * itself for the same reason: analytics must never be able to break the
 * site. Never called from admin-side code (see PageViewTracker.tsx being
 * mounted only in the public (site) layout).
 */
export async function trackEvent(input: TrackInput): Promise<void> {
  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    if (isLikelyBot(ua)) return;

    const { visitorId, sessionId } = await resolveIdentity();
    const { deviceCategory, browser, os } = parseUserAgent(ua);
    const referrerSource = bucketReferrer(input.referrer ?? null, h.get("host"));

    await recordAnalyticsEvent({
      eventType: input.type,
      campaignId: input.campaignId ?? null,
      route: truncate(input.route),
      visitorId,
      sessionId,
      referrerSource,
      deviceCategory,
      browser,
      os,
      metadata: truncate(input.metadata),
    });
  } catch {
    // Never let an analytics failure surface to the visitor.
  }
}
