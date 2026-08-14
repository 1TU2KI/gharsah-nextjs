import { randomUUID } from "node:crypto";
import { db } from "./client";
import { hashPassword, verifyPassword } from "../auth/password";
import { toPlain, toPlainArray } from "./utils";

export type AdminRow = {
  id: string;
  username: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
};

/**
 * Single admin today, but stored as a proper table (not a hardcoded env
 * check at login time) specifically so adding a second admin later is a
 * matter of inserting a row — see `createAdmin` — not a rewrite. The very
 * first admin is bootstrapped from ADMIN_USERNAME/ADMIN_PASSWORD env vars
 * by `db/seed.ts` the first time the database is created against an empty
 * `admins` table (not here — that runs during `client.ts`'s own module
 * initialization, before this module's imported `db` singleton exists).
 * After that, env vars are never consulted again — change the password
 * from Settings instead, which only ever touches the database.
 */
export function createAdmin(username: string, password: string): AdminRow {
  const { hash, salt } = hashPassword(password);
  const row: AdminRow = {
    id: randomUUID(),
    username,
    password_hash: hash,
    password_salt: salt,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO admins (id, username, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(row.id, row.username, row.password_hash, row.password_salt, row.created_at);
  return row;
}

export function findAdminByUsername(username: string): AdminRow | undefined {
  const row = db.prepare("SELECT * FROM admins WHERE username = ?").get(username) as AdminRow | undefined;
  return row ? toPlain(row) : undefined;
}

export function findAdminById(id: string): AdminRow | undefined {
  const row = db.prepare("SELECT * FROM admins WHERE id = ?").get(id) as AdminRow | undefined;
  return row ? toPlain(row) : undefined;
}

export function listAdmins(): AdminRow[] {
  return toPlainArray(db.prepare("SELECT * FROM admins ORDER BY created_at ASC").all() as AdminRow[]);
}

export function verifyAdminCredentials(username: string, password: string): AdminRow | null {
  const admin = findAdminByUsername(username);
  if (!admin) return null;
  if (!verifyPassword(password, admin.password_hash, admin.password_salt)) return null;
  return admin;
}

export function updateAdminPassword(id: string, newPassword: string): void {
  const { hash, salt } = hashPassword(newPassword);
  db.prepare("UPDATE admins SET password_hash = ?, password_salt = ? WHERE id = ?").run(hash, salt, id);
}
