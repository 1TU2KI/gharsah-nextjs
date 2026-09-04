export default function HeroBackground() {
  return (
    // `section-fade-mask` (see globals.css) feathers this layer's own
    // top/bottom edges to transparent — without it, the bottom-anchored
    // glows below (`-bottom-36`/`-bottom-24`) get hard-clipped exactly at
    // Hero's own box edge by this wrapper's `overflow-hidden`, which reads
    // as a visible seam against the shared global background continuing
    // underneath into the next section (2026 global-background rebuild).
    <div className="section-fade-mask pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* soft canopy vignette — evokes dappled sunlight through trees */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 0%, transparent 35%, rgba(20,83,45,0.14) 100%)",
        }}
      />

      {/* soft sunlight glow */}
      <div className="animate-glow-pulse absolute -top-20 left-1/4 h-[26rem] w-[26rem] rounded-full bg-sunlight/90 blur-3xl" />
      <div
        className="animate-glow-pulse absolute -top-12 right-1/4 h-80 w-80 rounded-full bg-primary-100 blur-3xl"
        style={{ animationDelay: "3s" }}
      />

      {/* gentle drifting foliage blobs */}
      <div className="animate-drift absolute -left-28 -top-28 h-96 w-96 rounded-full bg-primary-200/70 blur-3xl" />
      <div className="animate-drift-slow absolute -bottom-36 -right-20 h-96 w-96 rounded-full bg-primary-300/50 blur-3xl" />
      <div
        className="animate-drift-slow absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-blob-b blur-3xl"
        style={{ animationDelay: "5s" }}
      />
    </div>
  );
}
