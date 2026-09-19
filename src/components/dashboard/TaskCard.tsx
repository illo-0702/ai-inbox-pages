"use client";

import Link from "next/link";
import type { TaskView } from "@/lib/types";
import { formatDueLabel, formatFieldValue, formatKRW, fieldNameLabel } from "@/lib/client/format";
import { DueStateBadge, PendingCountBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function TaskCard({
  task,
  busy,
  onComplete,
  onReopen,
}: {
  task: TaskView;
  busy?: boolean;
  onComplete?: (task: TaskView) => void;
  onReopen?: (task: TaskView) => void;
}) {
  const todo = task.amount !== null ? `${formatKRW(task.amount, task.currency)} ${task.title}` : task.title;

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] sm:p-5"
      data-testid={`task-card-${task.id}`}
      aria-label={`${task.relationshipName}: ${todo}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/relationships/detail?id=${task.relationshipId}`}
          className="text-sm font-semibold text-[var(--color-brand-text)] hover:underline hover:outline-offset-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] rounded"
          aria-label={`${task.relationshipName} 관계 상세 보기`}
        >
          <span className="break-words">{task.relationshipName}</span>
        </Link>
        <div className="flex items-center gap-2" role="group" aria-label="업무 상태">
          <DueStateBadge dueState={task.dueState} />
          <StatusBadge status={task.status} />
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-[var(--color-text)] tabular-nums break-words">
          {todo}
        </h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)] tabular-nums">
          <span className="sr-only">마감 날짜: </span>
          {formatDueLabel(task.dueDate)}
        </p>
      </div>

      {task.lastChange && task.lastChange.changes.length > 0 && (
        <div className="text-xs text-[var(--color-text-muted)] tabular-nums">
          <span className="font-semibold">최근 적용된 변경</span>
          <p className="mt-1" role="log" aria-label="변경 이력">
            {task.lastChange.changes
              .map(
                (c) =>
                  `${fieldNameLabel[c.field]} ${formatFieldValue(c.field, c.before)} → ${formatFieldValue(c.field, c.after)}`,
              )
              .join(", ")}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {task.pendingProposalCount > 0 ? (
          <PendingCountBadge count={task.pendingProposalCount} />
        ) : (
          <span aria-hidden="true" />
        )}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href={`/relationships/detail?id=${task.relationshipId}`} className="sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              aria-label={`${task.relationshipName} 상세 보기`}
            >
              상세 보기
            </Button>
          </Link>
          {task.status === "open" && onComplete && (
            <Button
              type="button"
              variant="primary"
              loading={busy}
              onClick={() => onComplete(task)}
              aria-label={`${task.relationshipName} 업무 완료 처리`}
            >
              완료
            </Button>
          )}
          {task.status === "done" && onReopen && (
            <Button
              type="button"
              variant="secondary"
              loading={busy}
              onClick={() => onReopen(task)}
              aria-label={`${task.relationshipName} 업무 미완료로 복구`}
            >
              미완료로 되돌리기
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
