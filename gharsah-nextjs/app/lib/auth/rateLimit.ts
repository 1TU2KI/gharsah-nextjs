/**
 * Minimal in-memory login rate limiter — keyed by client IP, a sliding
 * lockout window. Deliberately not a database table: login attempts are
 * high-frequency, low-value data that doesn't need to survive a restart,
 * and this keeps the login path fast (no DB write per attempt).
 *
 * Known scope limit (documented, not hidden): this state is per Node
 * process. A single always-on server (this project's target — see
 * client.ts) keeps one process, so the limiter works as intended; it would
 * NOT coordinate across multiple serverless instances. Fine for a
 * single-admin control panel; revisit with a shared store (e.g. the SQLite
 * db itself, or Redis) if this ever runs multi-instance.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type Bucket = { count: number; windowStart: number };

declare global {
  var __gharsahLoginAttempts: Map<string, Bucket> | undefined;
}

const attempts: Map<string, Bucket> = globalThis.__gharsahLoginAttempts ?? new Map();
globalThis.__gharsahLoginAttempts = attempts;

export function isRateLimited(key: string): boolean {
  const bucket = attempts.get(key);
  if (!bucket) return false;
  if (Date.now() - bucket.windowStart > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return bucket.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const bucket = attempts.get(key);
  const now = Date.now();
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

export function remainingLockoutSeconds(key: string): number {
  const bucket = attempts.get(key);
  if (!bucket) return 0;
  const elapsed = Date.now() - bucket.windowStart;
  return Math.max(0, Math.ceil((WINDOW_MS - elapsed) / 1000));
}
