import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for admin accounts — Node's built-in `scrypt` (no extra
 * dependency like bcrypt, which would need native compilation). A random
 * 16-byte salt per admin, 64-byte derived key, constant-time comparison on
 * verify so timing can't leak how much of the password matched.
 */
const KEY_LENGTH = 64;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}
