"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/lib/auth/guard";
import { logActivity } from "@/app/lib/db/activity";
import {
  updateCampaignRequestStatus,
  updateCampaignRequestNotes,
  setCampaignRequestArchived,
  getCampaignRequestById,
  type RequestStatus,
} from "@/app/lib/db/requests";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

function refresh(id: string) {
  revalidatePath(`${ADMIN_BASE_PATH}/requests`);
  revalidatePath(`${ADMIN_BASE_PATH}/requests/${id}`);
}

export async function changeRequestStatusAction(id: string, status: RequestStatus): Promise<void> {
  const session = await requireAdminSession();
  const existing = await getCampaignRequestById(id);
  if (!existing) return;

  await updateCampaignRequestStatus(id, status);
  await logActivity({
    action: "request_status_changed",
    targetType: "request",
    targetId: id,
    targetLabel: existing.name,
    adminUsername: session.username,
    details: `${existing.status} → ${status}`,
  });
  refresh(id);
}

export async function updateRequestNotesAction(id: string, notes: string): Promise<void> {
  const session = await requireAdminSession();
  const existing = await getCampaignRequestById(id);
  if (!existing) return;

  await updateCampaignRequestNotes(id, notes);
  await logActivity({
    action: "request_note_added",
    targetType: "request",
    targetId: id,
    targetLabel: existing.name,
    adminUsername: session.username,
  });
  refresh(id);
}

export async function setRequestArchivedAction(id: string, archived: boolean): Promise<void> {
  const session = await requireAdminSession();
  const existing = await getCampaignRequestById(id);
  if (!existing) return;

  await setCampaignRequestArchived(id, archived);
  await logActivity({
    action: "request_archived",
    targetType: "request",
    targetId: id,
    targetLabel: existing.name,
    adminUsername: session.username,
    details: archived ? "archived" : "restored",
  });
  refresh(id);
}
