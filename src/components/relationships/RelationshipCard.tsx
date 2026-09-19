import Link from "next/link";
import type { RelationshipSummary } from "@/lib/types";

export function RelationshipCard({ relationship }: { relationship: RelationshipSummary }) {
  return (
    <Link
      href={`/relationships/detail?id=${relationship.id}`}
      className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition-colors hover:border-[var(--color-brand)] sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--color-text)]">{relationship.name}</h3>
        {relationship.pendingCount > 0 && (
          <span className="shrink-0 rounded-full border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]">
            확인 필요 {relationship.pendingCount}건
          </span>
        )}
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">
        {relationship.contacts.length > 0 ? relationship.contacts.join(" / ") : "담당자 미확인"}
      </p>
      <p className="text-sm text-[var(--color-text-muted)] tabular-nums">
        미완료 업무 {relationship.openTaskCount}건
      </p>
    </Link>
  );
}
