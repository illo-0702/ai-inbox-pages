import type { FieldChange } from "@/lib/types";
import { fieldNameLabel, formatFieldValue } from "@/lib/client/format";

/** 변경 비교 표 — 필드 | 기존 | 제안. 색만으로 구분하지 않고 취소선+화살표를 함께 쓴다. */
export function ChangeCompareTable({ changes }: { changes: FieldChange[] }) {
  if (changes.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
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
  );
}
