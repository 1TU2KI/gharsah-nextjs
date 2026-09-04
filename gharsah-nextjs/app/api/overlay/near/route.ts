import { NextResponse, type NextRequest } from "next/server";
import { buildOverlayResponse } from "@/app/lib/overlay/data";

/**
 * Public, unauthenticated JSON feed for the OBS overlay (`/overlay/near`,
 * see OverlayClient.tsx) — has to be reachable with no login, exactly like
 * the rest of the public site, since OBS's Browser Source has no way to
 * authenticate. Polled every ~20s by the client. All the actual logic
 * (settings + query-override resolution, ranking, campaign mapping) lives
 * in buildOverlayResponse() — shared with the page's own initial
 * server-rendered frame, never duplicated. `no-store` because every poll
 * must see the current DB state, not a cached one.
 */
export async function GET(request: NextRequest) {
  const body = await buildOverlayResponse(request.nextUrl.searchParams, request.nextUrl.origin);
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
