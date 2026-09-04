/**
 * OBS Browser Source setup steps — identical for every overlay type (the
 * steps themselves don't depend on which overlay URL is pasted in), shared
 * between Campaign Overlay and Gharsah Overlay rather than two copies of
 * the same 3 steps.
 */
export default function ObsInstructions() {
  return (
    <div className="mt-6 rounded-xl border border-primary/15 bg-wash/40 p-3.5 text-xs text-foreground/80">
      <p className="font-semibold text-primary-dark">طريقة الإضافة في OBS</p>
      <ol className="mt-1.5 list-inside list-decimal space-y-1">
        <li>Sources ← + ← Browser</li>
        <li>الصق الرابط أعلاه في خانة URL</li>
        <li>اضبط المقاس على 1920 × 1080</li>
      </ol>
    </div>
  );
}
