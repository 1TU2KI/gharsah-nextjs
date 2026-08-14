import type { Metadata } from "next";
import CompletedCasesPageClient from "./CompletedCasesPageClient";
import { getCompletedCampaignsLive } from "@/app/lib/campaignLiveSync";

export const metadata: Metadata = {
  title: "الحالات المكتملة | غرسة",
};

export default async function CompletedCasesPage() {
  const campaigns = await getCompletedCampaignsLive();

  return <CompletedCasesPageClient campaigns={campaigns} />;
}
