import ActiveCasesSectionClient from "./ActiveCasesSectionClient";
import { getActiveCampaignsLive } from "../../lib/campaignLiveSync";

export default async function ActiveCasesSection() {
  const allCampaigns = await getActiveCampaignsLive();
  const campaigns = allCampaigns.slice(0, 3);

  return <ActiveCasesSectionClient campaigns={campaigns} totalCount={allCampaigns.length} />;
}
