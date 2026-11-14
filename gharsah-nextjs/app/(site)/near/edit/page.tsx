import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveCampaignsLive } from "@/app/lib/campaignLiveSync";
import { CUSTOM_NEAR_PROTOTYPE } from "@/app/lib/customNear/store";
import { CustomNearEditorScreen } from "../CustomNearScreen";

export const metadata: Metadata = {
  title: "تعديل صفحتك | غرسة",
  robots: { index: false, follow: false },
  // The private token is only ever in this page's URL fragment; also stop
  // the browser from sending even the bare path as a Referer elsewhere.
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

/**
 * Private edit screen: /near/edit#<token>. The token is in the fragment, so
 * it never reaches the server request, server logs or page-view analytics;
 * the client passes it to the server actions directly (CustomNearScreen.tsx).
 */
export default async function EditCustomNearPage() {
  if (!CUSTOM_NEAR_PROTOTYPE) notFound();
  const campaigns = await getActiveCampaignsLive();
  return <CustomNearEditorScreen mode="edit" campaigns={campaigns} />;
}
