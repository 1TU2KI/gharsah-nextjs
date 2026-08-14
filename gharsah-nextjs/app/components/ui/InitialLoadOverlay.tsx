"use client";

import { useEffect, useState } from "react";
import GharsahLoader from "./GharsahLoader";

/**
 * Covers the very first paint of a hard page load (before hydration), which
 * `app/loading.tsx` cannot do since Suspense fallbacks only activate for
 * async Server Component data-fetching, not the base HTML delivery itself.
 * Mounted once in the root layout, so it only appears on a real navigation
 * to the site (reload/first visit), never on client-side route changes —
 * those are handled by the per-route `loading.tsx` files instead.
 *
 * Hides on the real `window.load` signal (all resources fetched), never an
 * artificial timer, so it never lingers longer than the page actually needs.
 */
export default function InitialLoadOverlay() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    let removeTimeout: ReturnType<typeof setTimeout>;

    function reveal() {
      setVisible(false);
      removeTimeout = setTimeout(() => setMounted(false), 500);
    }

    if (document.readyState === "complete") {
      reveal();
    } else {
      window.addEventListener("load", reveal, { once: true });
    }

    return () => {
      window.removeEventListener("load", reveal);
      clearTimeout(removeTimeout);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[999] flex items-center justify-center bg-background transition-opacity duration-500 ease-out ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <GharsahLoader size={112} />
    </div>
  );
}
