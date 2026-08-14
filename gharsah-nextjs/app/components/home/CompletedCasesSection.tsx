import CompletedCasesSectionClient from "./CompletedCasesSectionClient";
import { getCompletedCampaignsLive } from "../../lib/campaignLiveSync";

export default async function CompletedCasesSection() {
  const allCampaigns = await getCompletedCampaignsLive();
  const campaigns = allCampaigns.slice(0, 3);

  return <CompletedCasesSectionClient campaigns={campaigns} totalCount={allCampaigns.length} />;
}
