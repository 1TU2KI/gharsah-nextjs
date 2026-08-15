import AlmostThereSectionClient from "./AlmostThereSectionClient";
import { getAlmostThereCampaigns } from "../../lib/almostThere";

/**
 * "اقتربت..." — the active campaigns closest to completion, entirely
 * computed (never hand-picked) from the same live-synced data
 * ActiveCasesSection already fetches. See almostThere.ts for the ranking
 * itself; this file only decides how many to show on the homepage (3).
 */
export default async function AlmostThereSection() {
  const campaigns = await getAlmostThereCampaigns(3);
  if (campaigns.length === 0) return null;

  return <AlmostThereSectionClient campaigns={campaigns} />;
}
