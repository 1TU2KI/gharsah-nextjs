import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveCampaignsLive } from "@/app/lib/campaignLiveSync";
import { CUSTOM_NEAR_PROTOTYPE, getPageById } from "@/app/lib/customNear/store";
import { CustomNearViewScreen } from "../../near/CustomNearScreen";

export const dynamic = "force-dynamic";

/** Unlisted: never indexed, never followed, not in any navigation or listing. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const page = CUSTOM_NEAR_PROTOTYPE ? getPageById(id) : null;
  return {
    title: page ? `${page.title} | غرسة` : "غرسة",
    robots: { index: false, follow: false },
  };
}

/**
 * The short, unlisted viewing link for a custom اقتربت... page: /n/<id>.
 * Only the stored campaign REFERENCES are kept, resolved here against the
 * current public active campaigns in the creator's order — a campaign that's
 * no longer public just drops out, and every card/donation link is the
 * campaign's own. Never exposes the edit token (only its hash is stored).
 */
export default async function CustomNearViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!CUSTOM_NEAR_PROTOTYPE) notFound();
  const page = getPageById(id);
  if (!page) notFound();

  const active = new Map((await getActiveCampaignsLive()).map((c) => [c.slug, c]));
  const campaigns = page.campaignSlugs.map((s) => active.get(s)).filter((c) => c !== undefined);

  return <CustomNearViewScreen title={page.title} description={page.description} campaigns={campaigns} />;
}
