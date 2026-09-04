"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "../home/icons";

/**
 * Custom-styled sort control for /cases/active only (see
 * ActiveCasesPageClient.tsx) — a real Gharsah "material" (soft mint fill,
 * green border, card-style popup) instead of a native `<select>`, which
 * can't be restyled past its OS chrome. Generic over the caller's own sort
 * mode union via `T extends string` so this stays a dumb, reusable trigger+
 * listbox with no sort-specific logic of its own.
 *
 * Built as a plain button + `role="listbox"` popup (same "click outside to
 * close" wiring as RandomCaseButton's tooltip, rather than a new
 * dependency) — deliberately scoped to this one component/page, per the
 * brief: no other campaign list gets this control.
 */
export default function SortDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2.5 rounded-full border border-primary-200/60 bg-primary-50/80 px-4 py-2.5 text-start shadow-[0_2px_10px_-6px_rgba(20,83,45,0.3)] backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-primary-50 active:scale-[0.98] sm:w-auto"
      >
        <span className="flex items-baseline gap-1.5 truncate text-sm">
          <span className="font-medium text-muted">{label}</span>
          <span className="font-semibold text-primary-dark">{selected?.label}</span>
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-primary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        role="listbox"
        aria-label={label}
        className={`absolute end-0 top-full z-30 mt-2 w-full min-w-[15rem] max-w-[calc(100vw-3rem)] rounded-2xl border border-border/70 bg-background/95 p-1.5 shadow-[0_16px_32px_-12px_rgba(20,83,45,0.35)] backdrop-blur-md transition-all duration-200 ease-out sm:w-72 ${
          open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-2 scale-95 opacity-0"
        }`}
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-start text-sm transition-colors ${
                isSelected ? "bg-primary-50 font-semibold text-primary-dark" : "font-medium text-foreground hover:bg-primary-50/60"
              }`}
            >
              {option.label}
              {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
