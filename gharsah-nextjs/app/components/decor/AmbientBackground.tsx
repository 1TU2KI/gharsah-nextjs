"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  r: number;
  colorIndex: number;
  phase: number;
  pulseSpeed: number;
  driftX: number;
  driftY: number;
};

/* Light-mode particles use darker, more saturated rgb triplets (no white)
   at a higher alpha range — a faint pale dot is nearly invisible against
   this site's light pastel body gradient, unlike against the dark one,
   where the current (unchanged) palette already reads clearly. Read live
   via a MutationObserver on `data-theme` so toggling the theme updates
   particle color/alpha on the very next frame, not just on next mount. */
const DARK_PARTICLE_COLORS = ["34,197,94", "127,196,190", "255,255,255"];
const LIGHT_PARTICLE_COLORS = ["21,128,61", "13,110,104", "51,92,122"];
const DARK_ALPHA = { base: 0.12, variance: 0.22 };
const LIGHT_ALPHA = { base: 0.24, variance: 0.32 };

function readTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/**
 * Global ambient background: a few large soft-blurred orbs and faint light
 * ribbons (pure CSS, GPU-composited transform/opacity loops — no scroll
 * listeners) plus a lightweight canvas layer of tiny glowing particles
 * drawn with `requestAnimationFrame`. The canvas exists specifically for
 * the particles: their continuous per-frame drift/fade reads as alive and
 * non-repeating in a way a handful of fixed CSS keyframes can't, while
 * staying cheap (a few dozen small circles, capped device-pixel-ratio,
 * paused when the tab is hidden, skipped entirely under
 * `prefers-reduced-motion`).
 *
 * Mounted once in the root layout as a `fixed` layer. It uses a *negative*
 * z-index (not 0) — unlike the section-local decorative layers elsewhere in
 * this app (which pair a `z-0` backdrop with a `z-10` content wrapper
 * within the same section), this sits behind the *entire* page, including
 * plain, non-positioned content that has no z-index of its own to compare
 * against; only a negative z-index reliably paints behind that.
 */
export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let rafId = 0;
    let running = true;
    let time = 0;
    let theme = readTheme();

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
      const count = width < 640 ? 10 : width < 1024 ? 18 : 30;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2,
        colorIndex: Math.floor(Math.random() * 3),
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.15 + Math.random() * 0.2,
        driftX: (Math.random() - 0.5) * 0.12,
        driftY: (Math.random() - 0.5) * 0.12,
      }));
    }

    function drawFrame() {
      const palette = theme === "dark" ? DARK_PARTICLE_COLORS : LIGHT_PARTICLE_COLORS;
      const { base, variance } = theme === "dark" ? DARK_ALPHA : LIGHT_ALPHA;

      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.driftX;
        p.y += p.driftY;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        const color = palette[p.colorIndex % palette.length];
        const alpha = base + variance * (0.5 + 0.5 * Math.sin(time * p.pulseSpeed * 6 + p.phase));
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${color},${alpha.toFixed(3)})`;
        ctx!.shadowColor = `rgba(${color},0.5)`;
        ctx!.shadowBlur = p.r * 6;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function loop() {
      if (!running) return;
      time += 0.008;
      drawFrame();
      rafId = requestAnimationFrame(loop);
    }

    resize();
    initParticles();

    if (reduceMotion) {
      // Draw one static frame instead of animating.
      drawFrame();
    } else {
      rafId = requestAnimationFrame(loop);
    }

    function handleVisibility() {
      if (reduceMotion) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else if (!running) {
        running = true;
        rafId = requestAnimationFrame(loop);
      }
    }

    let resizeTimeout: ReturnType<typeof setTimeout>;
    function handleResize() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        resize();
        initParticles();
        if (reduceMotion) drawFrame();
      }, 200);
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", handleResize);

    const themeObserver = new MutationObserver(() => {
      theme = readTheme();
      if (reduceMotion) drawFrame();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimeout);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="animate-ambient-drift-a animate-ambient-breathe absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-ambient-orb-a blur-3xl" />
      <div
        className="animate-ambient-drift-b animate-ambient-breathe absolute -right-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-ambient-orb-b blur-3xl"
        style={{ animationDelay: "-9s" }}
      />
      <div
        className="animate-ambient-drift-c animate-ambient-breathe absolute -bottom-40 left-1/3 h-[34rem] w-[34rem] rounded-full bg-ambient-orb-c blur-3xl"
        style={{ animationDelay: "-15s" }}
      />

      <div
        className="animate-ambient-ribbon absolute left-[-15%] top-[18%] h-px w-[130%] origin-left"
        style={{ background: "linear-gradient(90deg, transparent, var(--ambient-ribbon-a), transparent)", filter: "blur(5px)" }}
      />
      <div
        className="animate-ambient-ribbon absolute left-[-15%] top-[68%] h-px w-[130%] origin-left"
        style={{
          background: "linear-gradient(90deg, transparent, var(--ambient-ribbon-b), transparent)",
          filter: "blur(5px)",
          animationDelay: "-24s",
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
