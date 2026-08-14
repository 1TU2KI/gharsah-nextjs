import { revalidatePath } from "next/cache";

/**
 * Called after every admin mutation that changes what a visitor sees.
 * Explicit and unconditional (not relying on Next's automatic dynamic-data
 * detection) because campaign data is read via a plain synchronous SQLite
 * call, not `fetch()` — Next has no built-in visibility into that being
 * "dynamic," so without this an edit could sit behind a stale cached page
 * until the next unrelated revalidation. This is what makes "changes made
 * in admin immediately affect the public website" actually true rather
 * than aspirational.
 */
export function revalidatePublicCampaignPages(slug?: string): void {
  revalidatePath("/");
  revalidatePath("/cases/active");
  revalidatePath("/cases/completed");
  if (slug) {
    revalidatePath(`/cases/active/${slug}`);
  } else {
    revalidatePath("/cases/active/[slug]", "page");
  }
}
