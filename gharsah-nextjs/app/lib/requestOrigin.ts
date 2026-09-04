import "server-only";
import { headers } from "next/headers";

/**
 * Absolute origin (protocol + host) derived from the CURRENT request's own
 * headers — never a hardcoded domain, so callers are automatically correct
 * in both development (`http://localhost:3000`) and production
 * (`https://gharsah.sa`) with no environment-specific config. Same
 * derivation the overlay/admin overlay pages already use internally (kept
 * as its own small file rather than folded into those, since this task's
 * scope deliberately doesn't touch overlay/admin overlay code).
 */
export async function getRequestOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}
