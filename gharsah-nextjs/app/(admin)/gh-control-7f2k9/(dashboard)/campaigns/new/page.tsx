import type { Metadata } from "next";
import { getPlatforms } from "@/app/lib/db/settings";
import { getCampaignRequestById } from "@/app/lib/db/requests";
import CampaignForm, { type CampaignFormValues } from "@/app/components/admin/CampaignForm";
import { createCampaignAction } from "../actions";

export const metadata: Metadata = { title: "إضافة حملة | لوحة تحكم غرسة" };

/**
 * When arriving via "تحويل إلى حملة" from a request's detail page
 * (`?fromRequest=<id>`), the request's own fields prefill the form so the
 * admin doesn't retype them — see the requirement to convert an accepted
 * request "without retyping all information". Title/description are left
 * for the admin to write properly (a request's free-text notes aren't a
 * safe source for the campaign's actual public title), but the structural
 * fields still supported by the form (username, campaign URL, and now
 * relationAr/"العنوان الفرعي" from the request's stated relationship) carry
 * over, and the request is marked converted once the campaign is actually
 * created.
 */
export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ fromRequest?: string }>;
}) {
  const { fromRequest } = await searchParams;
  const platforms = await getPlatforms();
  const sourceRequest = fromRequest ? await getCampaignRequestById(fromRequest) : undefined;

  const initialValues: CampaignFormValues = {
    slug: "",
    platform: sourceRequest ? guessPlatform(sourceRequest.campaign_url, platforms.map((p) => p.value)) : platforms[0]?.value ?? "",
    url: sourceRequest?.campaign_url ?? "",
    username: sourceRequest?.username ?? "",
    memorialPrefixAr: "",
    relationAr: sourceRequest?.relationship_type ?? "",
    titleAr: "",
    titleSource: "",
    descriptionAr: "",
    descriptionSource: "",
    status: "active",
    percent: "",
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">إضافة حملة جديدة</h1>
        <p className="mt-1 text-sm text-muted">
          {sourceRequest ? `تم تعبئة الحقول المتاحة من طلب "${sourceRequest.name}" — أكمل الباقي قبل الحفظ.` : "تظهر الحملة في القسم النشط فور الحفظ."}
        </p>
      </div>

      <CampaignForm
        mode="create"
        action={createCampaignAction}
        initialValues={initialValues}
        platforms={platforms}
        sourceRequestId={sourceRequest?.id}
      />
    </div>
  );
}

function guessPlatform(url: string, knownValues: string[]): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("ehsan")) return knownValues.find((v) => v.includes("إحسان")) ?? knownValues[0] ?? "";
    if (host.includes("dawa-alqasba")) return knownValues.find((v) => v.includes("القصبة")) ?? knownValues[0] ?? "";
  } catch {
    // Not a valid URL yet — leave platform unset, admin picks manually.
  }
  return knownValues[0] ?? "";
}
