"use client";

import { useCallback, useState, useEffect } from "react";
import type { AdvancedFilterOptions } from "@/lib/filters";
import { Button } from "@/components/ui/Button";

const CURRENCIES = ["KRW", "USD", "EUR", "JPY", "기타"];
const STATUSES = [
  { value: "open", label: "미완료" },
  { value: "done", label: "완료" },
  { value: "all", label: "모두" },
];

interface AdvancedFilterProps {
  isOpen: boolean;
  options: AdvancedFilterOptions;
  onChange: (options: AdvancedFilterOptions) => void;
  onClose: () => void;
}

export function AdvancedFilter({ isOpen, options, onChange, onClose }: AdvancedFilterProps) {
  const [dateStart, setDateStart] = useState(options.dateStart || "");
  const [dateEnd, setDateEnd] = useState(options.dateEnd || "");
  const [amountMin, setAmountMin] = useState(options.amountMin?.toString() || "");
  const [amountMax, setAmountMax] = useState(options.amountMax?.toString() || "");
  const [currency, setCurrency] = useState(options.currency || "");
  const [status, setStatus] = useState<"open" | "done" | "all">(options.status || "open");

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setDateStart(options.dateStart || "");
      setDateEnd(options.dateEnd || "");
      setAmountMin(options.amountMin?.toString() || "");
      setAmountMax(options.amountMax?.toString() || "");
      setCurrency(options.currency || "");
      setStatus(options.status || "open");
    }
  }, [isOpen, options]);

  const handleApply = useCallback(() => {
    const newOptions: AdvancedFilterOptions = {
      status,
    };

    if (dateStart) newOptions.dateStart = dateStart;
    if (dateEnd) newOptions.dateEnd = dateEnd;
    if (amountMin) newOptions.amountMin = Number(amountMin);
    if (amountMax) newOptions.amountMax = Number(amountMax);
    if (currency) newOptions.currency = currency;

    onChange(newOptions);
    onClose();
  }, [dateStart, dateEnd, amountMin, amountMax, currency, status, onChange, onClose]);

  const handleReset = useCallback(() => {
    setDateStart("");
    setDateEnd("");
    setAmountMin("");
    setAmountMax("");
    setCurrency("");
    setStatus("open");
    onChange({});
    onClose();
  }, [onChange, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 모달 */}
      <div className="fixed inset-x-4 top-1/2 z-50 w-auto -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg sm:left-1/2 sm:right-auto sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2">
        <div className="flex flex-col gap-6 p-6">
          {/* 헤더 */}
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">고급 필터</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              여러 조건을 조합해서 업무를 필터링하세요.
            </p>
          </div>

          {/* 필터 항목들 */}
          <div className="flex flex-col gap-4">
            {/* 기간 필터 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text)]">
                기간
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  placeholder="시작일"
                />
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  placeholder="종료일"
                />
              </div>
            </div>

            {/* 금액 범위 필터 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text)]">
                금액 범위 (KRW)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  placeholder="최소금액"
                  min="0"
                  step="10000"
                />
                <input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  placeholder="최대금액"
                  min="0"
                  step="10000"
                />
              </div>
            </div>

            {/* 통화 필터 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text)]">
                통화
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                <option value="">모든 통화</option>
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>

            {/* 상태 필터 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--color-text)]">
                상태
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "open" | "done" | "all")}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 버튼 그룹 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              초기화
            </button>
            <Button type="button" onClick={handleApply} className="flex-1">
              필터 적용
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
