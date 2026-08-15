"use server";

import { headers } from "next/headers";
import { recordAnalyticsEvent, type AnalyticsEventType } from "../db/analyticsRepo";
import { parseUserAgent, isLikelyBot } from "./userAgent";
import { bucketReferrer } from "./referrer";
import { resolveVisitorIdentity } from "./identity";

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

    const { visitorId, sessionId } = await resolveVisitorIdentity();
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
