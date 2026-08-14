import type { Metadata } from "next";
import ActiveCasesPageClient from "./ActiveCasesPageClient";
import { getActiveCampaignsLive } from "@/app/lib/campaignLiveSync";

export const metadata: Metadata = {
  title: "الحالات النشطة | غرسة",
};

export default async function ActiveCasesPage() {
  const campaigns = await getActiveCampaignsLive();

  return <ActiveCasesPageClient campaigns={campaigns} />;
}
