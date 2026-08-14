export default function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
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
