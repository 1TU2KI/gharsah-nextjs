import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveCampaignsLive } from "@/app/lib/campaignLiveSync";
import { CUSTOM_NEAR_PROTOTYPE } from "@/app/lib/customNear/store";
import { CustomNearEditorScreen } from "../CustomNearScreen";

export const metadata: Metadata = {
  title: "اصنع صفحتك | غرسة",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** «اصنع صفحتك» creation screen (local prototype — 404 in production builds). */
export default async function CreateCustomNearPage() {
  if (!CUSTOM_NEAR_PROTOTYPE) notFound();
  const campaigns = await getActiveCampaignsLive();
  return <CustomNearEditorScreen mode="create" campaigns={campaigns} />;
}
