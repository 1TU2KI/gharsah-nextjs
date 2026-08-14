type Tone = "accent" | "green" | "teal" | "neutral";

/**
 * `tint` supplies the section's overall wash color (painted last, on top of
 * the blobs, so it carries the contrast a section's text needs); `a`/`b` are
 * large blurred blobs underneath for organic texture/variation instead of a
 * flat color. "accent" is the strong near-solid wash for sections that need
 * white (`on-accent`) text contrast (e.g. Goals); the others are the same
 * pale wash strength `bg-wash`/`bg-wash-completed` already used.
 */
const toneConfig: Record<Tone, { tint: string; a: string; b: string }> = {
  accent: { tint: "bg-blob-accent-tint", a: "bg-blob-a", b: "bg-blob-b" },
  green: { tint: "bg-blob-green-tint", a: "bg-blob-a", b: "bg-blob-b" },
  teal: { tint: "bg-blob-teal-tint", a: "bg-blob-b", b: "bg-blob-c" },
  neutral: { tint: "bg-blob-neutral-tint", a: "bg-blob-a", b: "bg-blob-c" },
};

/**
 * Decorative section background: two soft blurred blobs plus a wash tint,
 * the whole layer feathered top/bottom via `.section-fade-mask` so
 * consecutive sections blend into the shared body gradient between them
 * instead of meeting at a hard flat-color seam. Purely visual — mount before
 * the section's content and give the content wrapper `relative z-10`.
 */
export default function SectionBackdrop({ tone = "neutral" }: { tone?: Tone }) {
  const c = toneConfig[tone];

  return (
    <div className="section-fade-mask pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className={`animate-drift absolute -left-24 top-6 h-72 w-72 rounded-full ${c.a} blur-3xl`} />
      <div className={`animate-drift-slow absolute -right-20 bottom-4 h-80 w-80 rounded-full ${c.b} blur-3xl`} />
      <div className={`absolute inset-0 ${c.tint}`} />
    </div>
  );
}
