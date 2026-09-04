/**
 * Shared clipboard helper — copies `text`, calling `onDone(true)` on
 * success (including the `execCommand` fallback for browsers without the
 * async Clipboard API). Fails silently (never calls `onDone`) on denial/
 * unavailability, matching the existing project-wide "fail quietly on a
 * copy action" convention. Used by GeneratedUrlBox.tsx, shared by both
 * overlay types' copy buttons.
 */
export async function copyText(text: string, onDone: (ok: boolean) => void): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    onDone(true);
  } catch {
    // Clipboard write denied/unavailable — fail quietly, same as every other copy action in this project.
  }
}
