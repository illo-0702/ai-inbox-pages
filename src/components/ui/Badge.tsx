import type { Judgment, TaskStatus } from "@/lib/types";
import { judgmentLabel, judgmentShortLabel, taskStatusLabel } from "@/lib/client/format";

/** AI 판단 배지 — 알약형(둥근 모서리 + 점) */
export function JudgmentBadge({
  judgment,
  full = false,
}: {
  judgment: Judgment;
  full?: boolean;
}) {
  const tone =
    judgment === "confirmed"
      ? "text-[var(--color-brand-text)] bg-[var(--color-brand-muted)]"
      : judgment === "possible"
        ? "text-[var(--color-warning)] bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]"
        : "text-[var(--color-warning)] bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
      role="status"
      aria-label={full ? judgmentLabel[judgment] : judgmentShortLabel[judgment]}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {full ? judgmentLabel[judgment] : judgmentShortLabel[judgment]}
    </span>
  );
}

/** 업무 완료 상태 배지 — 각진 사각형 태그 (판단 배지와 모양을 다르게) */
export function StatusBadge({ status }: { status: TaskStatus }) {
  const tone =
    status === "done"
      ? "text-[var(--color-success)] bg-[var(--color-success-bg)] border border-[var(--color-success-border)]"
      : "text-[var(--color-text-muted)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]";
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${tone}`}
      role="status"
      aria-label={`업무 상태: ${taskStatusLabel[status]}`}
    >
      {taskStatusLabel[status]}
    </span>
  );
}

/** 기한 경과/오늘 마감 강조 라벨 */
export function DueStateBadge({ dueState }: { dueState: "overdue" | "today" | "upcoming" | "none" }) {
  if (dueState === "upcoming" || dueState === "none") return null;
  const tone =
    dueState === "overdue"
      ? "text-[var(--color-danger)] bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)]"
      : "text-[var(--color-warning)] bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]";
  const label = dueState === "overdue" ? "기한 지남" : "오늘 마감";
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${tone}`}
      role="alert"
      aria-label={label}
    >
      {label}
    </span>
  );
}

/** 확인 필요 건수 배지 (업무 카드 내 추가 표시) */
export function PendingCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]"
      role="alert"
      aria-label={`변경 확인 필요 ${count}건`}
    >
      변경 확인 필요 {count}건
    </span>
  );
}
