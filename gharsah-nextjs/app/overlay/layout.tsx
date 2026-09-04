/**
 * Root for every `/overlay/*` route — a sibling of `(site)` and `(admin)`,
 * so it inherits NEITHER of their chrome (no Header/Footer/AmbientBackground
 * /InitialLoadOverlay, no admin shell) automatically, just the bare
 * `<html>/<body>` from the true root layout (app/layout.tsx).
 *
 * That root `<body>` carries a global flowing-gradient background
 * (`globals.css`'s plain `body { background-color/-image: ... }` rule) —
 * necessary everywhere else, but fatal here: an OBS Browser Source captures
 * exactly what the page paints, so an opaque body would show up as a solid
 * rectangle over the stream instead of true alpha transparency. The inline
 * `<style>` below overrides that, scoped in effect to this route because
 * it's only ever in the DOM while something under `/overlay/*` is mounted
 * (Next.js removes it on navigating away, same as any other route-segment
 * markup) — plain CSS, server-rendered from the very first byte, so there's
 * no client-JS-dependent flash of the normal site background before it
 * applies. Do not remove this even if it looks redundant with `OverlayCard`'s
 * own transparent wrapper — that only controls ITS OWN box, not `body`'s.
 */
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html, body { background: transparent !important; background-image: none !important; background-color: transparent !important; } body::before { display: none !important; }`}</style>
      {children}
    </>
  );
}
