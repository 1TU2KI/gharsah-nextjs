import { NextResponse, type NextRequest } from "next/server";
import { buildGharsahOverlayResponse } from "@/app/lib/overlay/gharsah/data";

/**
 * Public, unauthenticated JSON feed for Gharsah Overlay (`/overlay/gharsah`,
 * see GharsahOverlayClient.tsx) — mirrors `/api/overlay/near/route.ts`
 * exactly. Polled every ~20s by the client. `no-store` so every poll sees
 * current state (even though nothing here is DB-backed today, this stays
 * consistent with the campaign overlay's own caching stance).
 */
export async function GET(request: NextRequest) {
  const body = await buildGharsahOverlayResponse(request.nextUrl.searchParams, request.nextUrl.origin);
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
