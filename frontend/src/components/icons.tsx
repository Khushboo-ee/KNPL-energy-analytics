/** Inline stroke icons — no runtime dependency, sized by `em` so they track text. */

interface IconProps {
  className?: string;
}

const base = "h-[1em] w-[1em] shrink-0";

export function ChevronRight({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`${base} ${className}`}>
      <path
        d="M6 3.5 10.5 8 6 12.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronDown({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`${base} ${className}`}>
      <path
        d="M3.5 6 8 10.5 12.5 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalendarIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`${base} ${className}`}>
      <rect
        x="2.25"
        y="3.25"
        width="11.5"
        height="10.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2.25 6.5h11.5M5.5 2v2.5M10.5 2v2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DownloadIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`${base} ${className}`}>
      <path
        d="M8 2.5v7.5m0 0L5 7.25M8 10l3-2.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.75 11.5v1.25c0 .55.45 1 1 1h8.5c.55 0 1-.45 1-1V11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SheetIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`${base} ${className}`}>
      <rect
        x="2.5"
        y="2.5"
        width="11"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M2.5 6.5h11M6.5 6.5v7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function DocIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`${base} ${className}`}>
      <path
        d="M4 2.5h5L12.5 6v7.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9 2.5V6h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function BoltIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`${base} ${className}`}>
      <path
        d="M8.75 1.5 3.5 9h3.5l-.75 5.5L12.5 7H9l-.25-5.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function SpinnerIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`${base} animate-spin ${className}`}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" opacity="0.25" />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
