import type { ReactNode } from "react";
import type { EventView, FieldChange, FieldName } from "@/lib/types";
import { seoulDateOf } from "@/lib/time";
import {
  eventTypeLabel,
  fieldNameLabel,
  formatFieldValue,
  formatDateTime,
  formatShort,
  formatDate,
  formatKRW,
} from "@/lib/client/format";

function fieldAfter(changes: FieldChange[], field: FieldName): string | number | null {
  return changes.find((c) => c.field === field)?.after ?? null;
}

/** task_created — 필드별 diff 나열 대신 한 줄 요약("3,000,000원 / 마감 2026.09.20") */
function summarizeCreated(changes: FieldChange[]): string {
  const amount = fieldAfter(changes, "amount");
  const currency = fieldAfter(changes, "currency");
  const due = fieldAfter(changes, "dueDate");
  const title = fieldAfter(changes, "title");

  const parts: string[] = [];
  if (amount !== null) {
    parts.push(formatKRW(Number(amount), currency !== null ? String(currency) : undefined));
  } else if (title !== null) {
    parts.push(String(title));
  }
  parts.push(`마감 ${due !== null ? formatDate(String(due)) : "미정"}`);
  return parts.join(" / ");
}

function detailLine(event: EventView): ReactNode {
  const changes = event.fieldChanges;
  if (changes.length === 0) return null;

  if (event.eventType === "task_created") {
    return summarizeCreated(changes);
  }

  if (event.eventType === "task_updated") {
    const body = changes
      .map(
        (c) =>
          `${fieldNameLabel[c.field]} ${formatFieldValue(c.field, c.before)} → ${formatFieldValue(c.field, c.after)}`,
      )
      .join(", ");
    return `${body} · 사용자 반영`;
  }

  if (event.eventType === "change_kept") {
    return (
      <>
        제안 거절 ·{" "}
        {changes.map((c, i) => (
          <span key={c.field}>
            {i > 0 && ", "}
            {fieldNameLabel[c.field]}{" "}
            <span className="text-[var(--color-text-faint)] line-through decoration-1">
              {formatFieldValue(c.field, c.after)} 제안
            </span>
            {" → 기존 "}
            {formatFieldValue(c.field, c.before)} 유지
          </span>
        ))}
      </>
    );
  }

  if (event.eventType === "change_deferred") {
    const body = changes
      .map(
        (c) =>
          `${fieldNameLabel[c.field]} ${formatFieldValue(c.field, c.after)} 제안 (현재 ${formatFieldValue(c.field, c.before)} 유지)`,
      )
      .join(", ");
    return `보류 · ${body}`;
  }

  return changes
    .map(
      (c) =>
        `${fieldNameLabel[c.field]} ${formatFieldValue(c.field, c.before)} → ${formatFieldValue(c.field, c.after)}`,
    )
    .join(", ");
}

export function Timeline({ events }: { events: EventView[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">아직 변경 이력이 없어요.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {events.map((event) => {
        // 맨 앞 날짜는 처리 시각이 아니라 "받은 날짜" 기준(없으면 처리 시각으로 대체)
        const leadDate = formatShort(seoulDateOf(event.receivedAt ?? event.appliedAt));
        const detail = detailLine(event);

        return (
          <li key={event.id} className="flex gap-3">
            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)]" aria-hidden="true" />
            <div className="flex flex-col gap-1 border-b border-[var(--color-border)] pb-4">
              <p className="text-sm font-semibold text-[var(--color-text)] tabular-nums">
                {leadDate}
                {event.contactName ? ` ${event.contactName}` : ""} · {eventTypeLabel[event.eventType]}
              </p>

              {detail && <p className="text-sm text-[var(--color-text-muted)] tabular-nums">{detail}</p>}

              <p className="text-xs text-[var(--color-text-faint)] tabular-nums">
                {event.receivedAt ? `받은 시각 ${formatDateTime(event.receivedAt)} · ` : ""}
                처리 시각 {formatDateTime(event.appliedAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
