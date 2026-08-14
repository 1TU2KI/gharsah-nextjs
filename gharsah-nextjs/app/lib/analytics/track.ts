import { trackEvent, type TrackInput } from "./trackAction";

/**
 * The only import client components should use to send an analytics event —
 * wraps the `trackEvent` Server Action so every call site gets the same
 * "fire-and-forget, never throws into the UI" behavior for free, instead of
 * repeating `void trackEvent(...).catch(() => {})` everywhere. Deliberately
 * never awaited by callers either: a click handler that called `await
 * track(...)` before navigating would tie the visit to how fast this network
 * round-trip completes, exactly what "must not block navigation" rules out.
 */
export function track(input: TrackInput): void {
  void trackEvent(input).catch(() => {
    // Network-level failure (offline, etc.) — trackEvent already swallows
    // everything it can reach; this only guards the call itself.
  });
}
