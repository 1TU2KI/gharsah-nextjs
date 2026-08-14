/**
 * Stateless, signed admin session tokens — no server-side session table to
 * look up on every request. The cookie value is `<payload>.<signature>`,
 * both base64url; the signature is an HMAC-SHA256 over the payload using
 * ADMIN_SESSION_SECRET, verified with the Web Crypto API (`crypto.subtle`)
 * so the exact same code works whether this runs under the Node.js runtime
 * (Server Actions, route handlers) or a potential Edge runtime (Proxy) —
 * `crypto.subtle` is available globally in both, unlike Node's `crypto`
 * module. A forged/tampered cookie fails signature verification; an
 * expired one fails the `exp` check. Nothing here ever touches the
 * database, so `proxy.ts` can verify a session without importing SQLite.
 */
export const SESSION_COOKIE_NAME = "gharsah_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export type SessionPayload = {
  sub: string; // admin id
  username: string;
  iat: number;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET is missing or too short. Set a long random value in .env.local before using admin auth.",
    );
  }
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  // Explicitly backed by a plain ArrayBuffer (not the wider ArrayBufferLike
  // that `@types/node`'s global Uint8Array augmentation defaults to) —
  // `crypto.subtle.verify`/`sign` want a real BufferSource.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function createSessionToken(admin: { id: string; username: string }): Promise<string> {
  const key = await getKey();
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: admin.id,
    username: admin.username,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadStr = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadStr));
  return `${payloadStr}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadStr, signatureStr] = parts;

  try {
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signatureStr),
      new TextEncoder().encode(payloadStr),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadStr))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    // Malformed token (bad base64/JSON) — treat exactly like "not signed in".
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;
