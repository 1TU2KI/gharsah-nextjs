"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/lib/auth/guard";
import { logActivity } from "@/app/lib/db/activity";
import {
  setContactMessageRead,
  updateContactMessageNotes,
  setContactMessageArchived,
  getContactMessageById,
} from "@/app/lib/db/messages";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

function refresh(id: string) {
  revalidatePath(`${ADMIN_BASE_PATH}/messages`);
  revalidatePath(`${ADMIN_BASE_PATH}/messages/${id}`);
}

export async function markMessageReadAction(id: string, isRead: boolean): Promise<void> {
  const session = await requireAdminSession();
  const existing = getContactMessageById(id);
  if (!existing) return;

  setContactMessageRead(id, isRead);
  logActivity({
    action: "message_read_changed",
    targetType: "message",
    targetId: id,
    targetLabel: existing.name,
    adminUsername: session.username,
    details: isRead ? "read" : "unread",
  });
  refresh(id);
}

export async function updateMessageNotesAction(id: string, notes: string): Promise<void> {
  const session = await requireAdminSession();
  const existing = getContactMessageById(id);
  if (!existing) return;

  updateContactMessageNotes(id, notes);
  logActivity({
    action: "message_note_added",
    targetType: "message",
    targetId: id,
    targetLabel: existing.name,
    adminUsername: session.username,
  });
  refresh(id);
}

export async function setMessageArchivedAction(id: string, archived: boolean): Promise<void> {
  const session = await requireAdminSession();
  const existing = getContactMessageById(id);
  if (!existing) return;

  setContactMessageArchived(id, archived);
  logActivity({
    action: "message_archived",
    targetType: "message",
    targetId: id,
    targetLabel: existing.name,
    adminUsername: session.username,
    details: archived ? "archived" : "restored",
  });
  refresh(id);
}
