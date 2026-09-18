export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-4 text-sm text-[var(--color-danger)] sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
