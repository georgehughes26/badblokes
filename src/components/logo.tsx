export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 6.5 15.8 9.1l-1.45 4.5H9.65L8.2 9.1 12 6.5Z"
        fill="currentColor"
      />
      <path
        d="M12 6.5V3.25M15.8 9.1l2.95-1.1M14.35 13.6l1.85 2.75M9.65 13.6l-1.85 2.75M8.2 9.1 5.25 8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
