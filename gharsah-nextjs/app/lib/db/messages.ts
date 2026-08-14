import { randomUUID } from "node:crypto";
import { db } from "./client";
import { toPlain, toPlainArray } from "./utils";

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string | null;
  message: string;
  is_read: number; // SQLite has no boolean type; 0/1
  admin_notes: string | null;
  archived_at: string | null;
  created_at: string;
};

/** Public-facing: called from the /contact page's "other inquiries" form. */
export function createContactMessage(input: { name: string; email?: string | null; message: string }): ContactMessageRow {
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
  db.prepare(
    `INSERT INTO contact_messages (id, name, email, message, is_read, admin_notes, archived_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(row.id, row.name, row.email, row.message, row.is_read, row.admin_notes, row.archived_at, row.created_at);
  return row;
}

export function listContactMessages(options?: { includeArchived?: boolean }): ContactMessageRow[] {
  if (options?.includeArchived) {
    return toPlainArray(
      db.prepare("SELECT * FROM contact_messages ORDER BY created_at DESC").all() as ContactMessageRow[],
    );
  }
  return toPlainArray(
    db
      .prepare("SELECT * FROM contact_messages WHERE archived_at IS NULL ORDER BY created_at DESC")
      .all() as ContactMessageRow[],
  );
}

export function getContactMessageById(id: string): ContactMessageRow | undefined {
  const row = db.prepare("SELECT * FROM contact_messages WHERE id = ?").get(id) as ContactMessageRow | undefined;
  return row ? toPlain(row) : undefined;
}

export function setContactMessageRead(id: string, isRead: boolean): void {
  db.prepare("UPDATE contact_messages SET is_read = ? WHERE id = ?").run(isRead ? 1 : 0, id);
}

export function updateContactMessageNotes(id: string, adminNotes: string): void {
  db.prepare("UPDATE contact_messages SET admin_notes = ? WHERE id = ?").run(adminNotes, id);
}

export function setContactMessageArchived(id: string, archived: boolean): void {
  db.prepare("UPDATE contact_messages SET archived_at = ? WHERE id = ?").run(
    archived ? new Date().toISOString() : null,
    id,
  );
}

/** Same day-bucketing convention as `campaignsCreatedByDay` in campaignsRepo.ts — for the "requests/messages over time" analytics chart. */
export function messagesCreatedByDay(): { day: string; count: number }[] {
  return toPlainArray(
    db
      .prepare("SELECT substr(created_at, 1, 10) as day, COUNT(*) as count FROM contact_messages GROUP BY day ORDER BY day ASC")
      .all() as { day: string; count: number }[],
  );
}

export function countUnreadMessages(): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM contact_messages WHERE is_read = 0 AND archived_at IS NULL")
    .get() as { count: number };
  return row.count;
}

export function countMessages(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM contact_messages WHERE archived_at IS NULL").get() as {
    count: number;
  };
  return row.count;
}
