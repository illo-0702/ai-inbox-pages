export function Spinner({ size = 20, label }: { size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        role="status"
        aria-label={label ?? "로딩 중"}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="text-sm text-[var(--color-text-muted)]">{label}</span>}
    </span>
  );
}
