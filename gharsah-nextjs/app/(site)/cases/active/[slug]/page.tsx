import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampaignDetailClient from "./CampaignDetailClient";
import { getCampaigns } from "@/app/lib/campaigns";
import { getCampaignBySlugLive } from "@/app/lib/campaignLiveSync";

export function generateStaticParams() {
  return getCampaigns().map((campaign) => ({ slug: campaign.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaignBySlugLive(slug);
  // Metadata is server-rendered before locale is known client-side (see
  // LanguageProvider), so — same as every other route's <title> — this
  // stays Arabic-only regardless of the visitor's chosen language.
  return { title: campaign ? `${campaign.title.ar} | غرسة` : "الحالة غير موجودة | غرسة" };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await getCampaignBySlugLive(slug);

  if (!campaign) {
    notFound();
  }

  return <CampaignDetailClient campaign={campaign} />;
}
