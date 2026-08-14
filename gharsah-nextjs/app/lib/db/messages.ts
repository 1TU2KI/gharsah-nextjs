import { randomUUID } from "node:crypto";
import { all, get, run } from "./client";
import { toPlain, toPlainArray } from "./utils";

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string | null;
  message: string;
  is_read: number; // No boolean type in the original schema; 0/1
  admin_notes: string | null;
  archived_at: string | null;
  created_at: string;
};

/** Public-facing: called from the /contact page's "other inquiries" form. */
export async function createContactMessage(input: {
  name: string;
  email?: string | null;
  message: string;
}): Promise<ContactMessageRow> {
  const row: ContactMessageRow = {
    id: randomUUID(),
    name: input.name,
    email: input.email || null,
    message: input.message,
    is_read: 0,
    admin_notes: null,
    archived_at: null,
    created_at: new Date().toISOString(),
  };
  await run(
    `INSERT INTO contact_messages (id, name, email, message, is_read, admin_notes, archived_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.name, row.email, row.message, row.is_read, row.admin_notes, row.archived_at, row.created_at],
  );
  return row;
}

export async function listContactMessages(options?: { includeArchived?: boolean }): Promise<ContactMessageRow[]> {
  if (options?.includeArchived) {
    return toPlainArray(await all<ContactMessageRow>("SELECT * FROM contact_messages ORDER BY created_at DESC"));
  }
  return toPlainArray(
    await all<ContactMessageRow>("SELECT * FROM contact_messages WHERE archived_at IS NULL ORDER BY created_at DESC"),
  );
}

export async function getContactMessageById(id: string): Promise<ContactMessageRow | undefined> {
  const row = await get<ContactMessageRow>("SELECT * FROM contact_messages WHERE id = ?", [id]);
  return row ? toPlain(row) : undefined;
}

export async function setContactMessageRead(id: string, isRead: boolean): Promise<void> {
  await run("UPDATE contact_messages SET is_read = ? WHERE id = ?", [isRead ? 1 : 0, id]);
}

export async function updateContactMessageNotes(id: string, adminNotes: string): Promise<void> {
  await run("UPDATE contact_messages SET admin_notes = ? WHERE id = ?", [adminNotes, id]);
}

export async function setContactMessageArchived(id: string, archived: boolean): Promise<void> {
  await run("UPDATE contact_messages SET archived_at = ? WHERE id = ?", [
    archived ? new Date().toISOString() : null,
    id,
  ]);
}

/** Same day-bucketing convention as `campaignsCreatedByDay` in campaignsRepo.ts — for the "requests/messages over time" analytics chart. */
export async function messagesCreatedByDay(): Promise<{ day: string; count: number }[]> {
  return toPlainArray(
    await all<{ day: string; count: number }>(
      "SELECT substr(created_at, 1, 10) as day, COUNT(*)::int as count FROM contact_messages GROUP BY day ORDER BY day ASC",
    ),
  );
}

export async function countUnreadMessages(): Promise<number> {
  const row = await get<{ count: number }>(
    "SELECT COUNT(*)::int as count FROM contact_messages WHERE is_read = 0 AND archived_at IS NULL",
  );
  return row?.count ?? 0;
}

export async function countMessages(): Promise<number> {
  const row = await get<{ count: number }>("SELECT COUNT(*)::int as count FROM contact_messages WHERE archived_at IS NULL");
  return row?.count ?? 0;
}
