import { buildGharsahOverlayResponse } from "@/app/lib/overlay/gharsah/data";
import { getRequestOrigin } from "@/app/lib/requestOrigin";
import GharsahOverlayClient from "@/app/components/overlay/GharsahOverlayClient";

export const metadata = { title: "غرسة — أوفرلاي غرسة" };

// Never let a search engine or link preview index a page meant only to be
// loaded inside an OBS Browser Source.
export const dynamic = "force-dynamic";

/**
 * The actual OBS Browser Source URL for Gharsah Overlay: `/overlay/gharsah`
 * — mirrors `/overlay/near/page.tsx` exactly (server-renders the first
 * frame via the same buildGharsahOverlayResponse() the polling API uses,
 * so there's no blank/loading flash before the client's own polling takes
 * over). Inherits the transparent-background shell automatically from
 * app/overlay/layout.tsx, same as every route under `/overlay/*` — no
 * Header/Footer/normal page background, untouched by this new route.
 */
export default async function OverlayGharsahPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const rawParams = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") params.set(key, value);
  }

  const origin = await getRequestOrigin();
  const initialData = await buildGharsahOverlayResponse(params, origin);

  return <GharsahOverlayClient initialData={initialData} />;
}
