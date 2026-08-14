import { randomUUID } from "node:crypto";
import { all, get, run } from "./client";
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
 * by `db/seed.ts` the first time the database is initialized against an
 * empty `admins` table (not here — that runs during `client.ts`'s own
 * `initialize()`, before this module's gated query functions may be used).
 * After that, env vars are never consulted again — change the password
 * from Settings instead, which only ever touches the database.
 */
export async function createAdmin(username: string, password: string): Promise<AdminRow> {
  const { hash, salt } = hashPassword(password);
  const row: AdminRow = {
    id: randomUUID(),
    username,
    password_hash: hash,
    password_salt: salt,
    created_at: new Date().toISOString(),
  };
  await run("INSERT INTO admins (id, username, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)", [
    row.id,
    row.username,
    row.password_hash,
    row.password_salt,
    row.created_at,
  ]);
  return row;
}

export async function findAdminByUsername(username: string): Promise<AdminRow | undefined> {
  const row = await get<AdminRow>("SELECT * FROM admins WHERE username = ?", [username]);
  return row ? toPlain(row) : undefined;
}

export async function findAdminById(id: string): Promise<AdminRow | undefined> {
  const row = await get<AdminRow>("SELECT * FROM admins WHERE id = ?", [id]);
  return row ? toPlain(row) : undefined;
}

export async function listAdmins(): Promise<AdminRow[]> {
  return toPlainArray(await all<AdminRow>("SELECT * FROM admins ORDER BY created_at ASC"));
}

export async function verifyAdminCredentials(username: string, password: string): Promise<AdminRow | null> {
  const admin = await findAdminByUsername(username);
  if (!admin) return null;
  if (!verifyPassword(password, admin.password_hash, admin.password_salt)) return null;
  return admin;
}

export async function updateAdminPassword(id: string, newPassword: string): Promise<void> {
  const { hash, salt } = hashPassword(newPassword);
  await run("UPDATE admins SET password_hash = ?, password_salt = ? WHERE id = ?", [hash, salt, id]);
}
