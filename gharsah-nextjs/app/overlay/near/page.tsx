import { headers } from "next/headers";
import { buildOverlayResponse } from "@/app/lib/overlay/data";
import OverlayClient from "@/app/components/overlay/OverlayClient";

export const metadata = { title: "غرسة — أوفرلاي اقتربت..." };

// Never let a search engine or link preview index a page meant only to be
// loaded inside an OBS Browser Source.
export const dynamic = "force-dynamic";

/**
 * The actual OBS Browser Source URL: `/overlay/near`. Server-renders the
 * very first frame with real data (via the SAME buildOverlayResponse() the
 * polling API uses) so there's no blank/loading flash on initial load; every
 * poll after that happens client-side in OverlayClient.
 *
 * Query-string overrides (`?position=`, `?theme=`, `?compact=`,
 * `?showProgress=`, `?showLink=`, `?lang=`) are resolved here for the first
 * frame and independently by /api/overlay/near for every subsequent poll —
 * both go through the one shared resolveOverlayDisplay(), so a given URL
 * never means two different things.
 */
export default async function OverlayNearPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const rawParams = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") params.set(key, value);
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const initialData = await buildOverlayResponse(params, origin);

  return <OverlayClient initialData={initialData} />;
}
