import type { FieldChange } from "@/lib/types";
import { fieldNameLabel, formatFieldValue } from "@/lib/client/format";

/**
 * 변경 비교 — 필드 | 기존 | 제안. 색만으로 구분하지 않고 취소선+화살표를 함께 쓴다.
 * 좁은 화면(375px)에서는 표 대신 필드별 카드로 보여준다.
 */
export function ChangeCompareTable({ changes }: { changes: FieldChange[] }) {
  if (changes.length === 0) return null;

  return (
    <>
      {/* 좁은 화면: 필드별 카드 */}
      <div className="flex flex-col gap-2 sm:hidden">
        {changes.map((c) => (
          <div
            key={c.field}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2"
          >
            <p className="text-xs font-semibold text-[var(--color-text-muted)]">{fieldNameLabel[c.field]}</p>
            <p className="mt-0.5 text-sm tabular-nums">
              <span className="text-[var(--color-text-faint)] line-through decoration-1">
                {formatFieldValue(c.field, c.before)}
              </span>
              <span aria-hidden="true" className="mx-1.5 text-[var(--color-text-faint)]">
                →
              </span>
              <span className="font-semibold text-[var(--color-text)]">{formatFieldValue(c.field, c.after)}</span>
            </p>
          </div>
        ))}
      </div>

      {/* sm 이상: 표 */}
      <div className="hidden overflow-hidden rounded-lg border border-[var(--color-border)] sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-muted)] text-left text-xs font-semibold text-[var(--color-text-muted)]">
              <th className="px-3 py-2">필드</th>
              <th className="px-3 py-2">기존</th>
              <th className="px-3 py-2">제안</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.field} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 font-medium text-[var(--color-text)]">{fieldNameLabel[c.field]}</td>
                <td className="px-3 py-2 tabular-nums text-[var(--color-text-faint)] line-through decoration-1">
                  {formatFieldValue(c.field, c.before)}
                </td>
                <td className="px-3 py-2 tabular-nums font-semibold text-[var(--color-text)]">
                  <span aria-hidden="true" className="mr-1 text-[var(--color-text-faint)]">
                    →
                  </span>
                  {formatFieldValue(c.field, c.after)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
