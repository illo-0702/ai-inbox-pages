import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-faint)]",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-faint)]",
  ghost:
    "bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-faint)]",
  danger:
    "bg-transparent text-[var(--color-danger)] border border-[var(--color-danger-border)] hover:bg-[var(--color-danger-bg)] disabled:text-[var(--color-text-faint)] disabled:border-[var(--color-border)]",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${variantClass[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}
