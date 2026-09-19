import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center"
      role="status"
      aria-label={description ? `${title}. ${description}` : title}
    >
      <p className="text-base font-medium text-[var(--color-text)]">{title}</p>
      {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
