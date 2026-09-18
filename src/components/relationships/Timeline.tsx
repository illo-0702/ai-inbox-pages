import type { EventView } from "@/lib/types";
import { seoulDateOf } from "@/lib/time";
import { eventTypeLabel, fieldNameLabel, formatFieldValue, formatDateTime, formatShort } from "@/lib/client/format";

const APPLIED_EVENTS = new Set(["task_created", "task_updated"]);

export function Timeline({ events }: { events: EventView[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">아직 변경 이력이 없어요.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)]" aria-hidden="true" />
          <div className="flex flex-col gap-1 border-b border-[var(--color-border)] pb-4">
            <p className="text-sm font-semibold text-[var(--color-text)] tabular-nums">
              {formatShort(seoulDateOf(event.appliedAt))}
              {event.contactName ? ` · ${event.contactName}` : ""} · {eventTypeLabel[event.eventType]}
            </p>

            {event.fieldChanges.length > 0 && (
              <p className="text-sm text-[var(--color-text-muted)] tabular-nums">
                {event.fieldChanges
                  .map(
                    (c) =>
                      `${fieldNameLabel[c.field]} ${formatFieldValue(c.field, c.before)} → ${formatFieldValue(c.field, c.after)}`,
                  )
                  .join(", ")}
                {APPLIED_EVENTS.has(event.eventType) ? " · 사용자 반영" : ""}
              </p>
            )}

            <p className="text-xs text-[var(--color-text-faint)] tabular-nums">
              {event.receivedAt ? `받은 시각 ${formatDateTime(event.receivedAt)} · ` : ""}
              처리 시각 {formatDateTime(event.appliedAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
