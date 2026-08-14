type IconProps = {
  className?: string;
};

/** Charity donation box: a bold-outlined rectangular box with a slotted lid
 * on top and a solid heart centered on its front — reads unambiguously as
 * "donation box" rather than an abstract hand/bag shape. The lid and slot
 * use the same "punched through" technique as before (a solid bar with a
 * cutout in the container's own green) so the slot stays crisp at small
 * sizes; the box itself is stroke-only (bold width, not a thin line) so its
 * green interior shows through around the heart. */
export function DonationBoxIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* Lid — solid bar sitting on top of the box */}
      <rect x="3.5" y="7" width="17" height="3" rx="1.3" fill="currentColor" />
      {/* Slot cut into the lid, punched through in the container's own
          green (#16a34a is --primary, unchanged between light/dark) */}
      <rect x="9.5" y="7.8" width="5" height="1.4" rx="0.7" fill="#16a34a" />
      {/* Box body — bold outline only, so the heart reads clearly against
          the green interior showing through */}
      <rect
        x="5"
        y="9.5"
        width="14"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Heart, centered on the box front */}
      <path
        d="M12 18.5c-2.4-1.4-4.3-2.9-4.3-4.9 0-1.2.9-2.1 2.1-2.1.9 0 1.7.5 2.2 1.3.5-.8 1.3-1.3 2.2-1.3 1.2 0 2.1.9 2.1 2.1 0 2-1.9 3.5-4.3 4.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Minimal balance scale (scales of justice) — post, base, beam, and two
 * hanging pans — for "rules/terms" contexts, clearer than a gavel or a
 * generic checkmark. */
export function ScaleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.5v15.5M8 19h8M5 6.5h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 6.5 2.3 12.5M5 6.5l2.7 6M19 6.5l-2.7 6M19 6.5l2.7 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M2.3 12.5a2.7 2.7 0 0 0 5.4 0M16.3 12.5a2.7 2.7 0 0 0 5.4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LeafIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 19c8 0 14-6 14-14 0 0-13-1-14 8-.6 4.6 0 6 0 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M5 19c0-4 2-8 6-11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function LeafParticleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 18c7 0 12-5 12-12 0 0-11-.8-12 7-.5 3.9 0 5 0 5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 5h10v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 5 5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Chain-link mark for "copy/share this internal page's link" — distinct
 * from ExternalLinkIcon, which signals leaving Gharsah for another site. */
export function LinkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M10.5 13.5 13.5 10.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path
        d="M8.5 15.5 6.5 17.5a3 3 0 0 1-4.24-4.24l3-3a3 3 0 0 1 4.24 0"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 8.5l2-2a3 3 0 0 1 4.24 4.24l-3 3a3 3 0 0 1-4.24 0"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Plain checkmark — used for the "copied" confirmation, distinct from
 * CheckBadgeIcon (which always carries its own badge/seal outline). */
export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 12.5 9.5 17 19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 20s-7.5-4.6-10-9.3C.5 7.2 2.3 4 5.6 4 8 4 10 5.4 12 8c2-2.6 4-4 6.4-4 3.3 0 5.1 3.2 3.6 6.7C19.5 15.4 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PulseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 12h4l2-7 4 14 2-7h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 6.3c1.2.4 2 1.5 2 2.7 0 1.2-.8 2.3-2 2.7M19 20c0-2.6-1.6-4.8-4-5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function WalletIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="14" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9.5h18M8 3v3M16 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CheckBadgeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5 14.4 4h2.6l1.3 2.3 2.3 1.3V10l1.4 2.4-1.4 2.3v2.6l-2.3 1.3L16.9 21h-2.6L12 22.5 9.7 21H7.1l-1.3-2.3-2.3-1.3v-2.6L2 12.4l1.4-2.3V7.4l2.3-1.3L7.1 4h2.6L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8.5 12.3l2.3 2.3 4.5-4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Thin outlined circle with an exclamation mark inside — same construction
 * idea as CheckBadgeIcon (a self-contained badge shape, not just a bare
 * glyph), so it sits inside a pale-green chip the same way. */
export function AlertCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 7.5v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.75" r="1" fill="currentColor" />
    </svg>
  );
}

export function DiceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" />
      <circle cx="16" cy="8" r="1.15" fill="currentColor" />
      <circle cx="8" cy="16" r="1.15" fill="currentColor" />
      <circle cx="16" cy="16" r="1.15" fill="currentColor" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
    </svg>
  );
}

/** Two raised open palms (dua gesture) with a small light/blessing mark above. */
export function DuaIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.8 4.3l1 2.4M15.2 4.3l-1 2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M4.5 20c.3-4.5 1.7-7.6 3.8-9.5.5-.4 1-.7 1.4-.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 20c-.3-4.5-1.7-7.6-3.8-9.5-.5-.4-1-.7-1.4-.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 20c0-3 1.2-5.2 3-6.4 1.8 1.2 3 3.4 3 6.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="12" cy="12" rx="3.6" ry="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.7 9.5h16.6M3.7 14.5h16.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function WarningIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.7" r="1" fill="currentColor" />
    </svg>
  );
}

export function TwitterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4 4l7.1 9.3L4.4 20H6l5.9-6.4L16.5 20H20l-7.5-9.8L19 4h-1.6l-5.4 5.8L7.5 4H4Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
}

export function WhatsappIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 20l1.3-4A8 8 0 1 1 8.3 19L4 20Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 9.5c0 3 2.5 5.5 5.5 5.5.4 0 .8-.4.8-.9v-1l-2-.6-.7.8a4.8 4.8 0 0 1-2-2l.8-.7-.6-2h-1c-.5 0-.8.4-.8.9Z"
        fill="currentColor"
      />
    </svg>
  );
}
