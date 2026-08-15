import { NextResponse, type NextRequest } from "next/server";
import { getCampaignRowByShortCode } from "@/app/lib/db/campaignsRepo";
import { recordAnalyticsEvent } from "@/app/lib/db/analyticsRepo";
import { resolveVisitorIdentity } from "@/app/lib/analytics/identity";
import { parseUserAgent, isLikelyBot } from "@/app/lib/analytics/userAgent";

/**
 * Compact, shareable redirect for streamers: `gharsah.sa/c/<code>` — never
 * the destination itself, always a same-origin hop to the real Gharsah
 * campaign detail page (`/cases/active/<slug>`), which is what actually
 * shows the donate button. Never redirects straight to the external
 * donation platform — that only ever happens from the detail page's own
 * donate button, exactly like every other entry point (a card, a direct
 * link, search).
 *
 * A Route Handler rather than a page: this has no UI of its own (a plain
 * redirect), and a plain Server Component render isn't allowed to set
 * cookies — a Route Handler is. `?via=c` on the destination lets
 * `CampaignDetailClient.tsx` attribute that page view (and, if it follows,
 * the donate click) back to this short link — see analyticsRepo.ts's
 * `shortLinkStats`.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const campaign = code ? await getCampaignRowByShortCode(code) : undefined;

  // Unknown, mistyped, or archived code — the campaign is no longer public,
  // so there's nothing sensible to redirect to except the homepage. Never a
  // dead end for someone who just heard the link on a stream.
  if (!campaign) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (!isLikelyBot(ua)) {
      const { visitorId, sessionId } = await resolveVisitorIdentity();
      const { deviceCategory, browser, os } = parseUserAgent(ua);
      await recordAnalyticsEvent({
        eventType: "short_link_open",
        campaignId: campaign.id,
        route: `/c/${code}`,
        visitorId,
        sessionId,
        deviceCategory,
        browser,
        os,
        // The code as typed/clicked, not the campaign's canonical short_code
        // casing — useful if a custom alias is ever shared with different
        // casing than stored.
        metadata: code,
      });
    }
  } catch {
    // Analytics must never be able to break the redirect itself.
  }

  return NextResponse.redirect(new URL(`/cases/active/${campaign.slug}?via=c`, request.url));
}
