import Link from "next/link";
import type { PendingProposalView } from "@/lib/types";
import { JudgmentBadge } from "@/components/ui/Badge";

export function PendingItem({ item }: { item: PendingProposalView }) {
  return (
    <Link
      href={`/proposals/detail?id=${item.id}`}
      className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3.5 transition-colors hover:bg-[var(--color-surface)] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <JudgmentBadge judgment={item.judgment} />
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {item.relationshipName ?? "관계 미상"}
          </span>
          {item.taskTitle && (
            <span className="text-sm text-[var(--color-text-muted)]">{item.taskTitle}</span>
          )}
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">{item.reasonText}</p>
      </div>
      <span className="shrink-0 text-sm font-medium text-[var(--color-brand-text)]">확인하기 →</span>
    </Link>
  );
}
