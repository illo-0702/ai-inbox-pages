"use client";

import { useCallback } from "react";
import { getFilterLabel, getSortLabel, type FilterType, type SortType } from "@/lib/filters";

interface FilterChipProps {
  type: "filter" | "sort";
  value: FilterType | SortType;
  isActive: boolean;
  onClick: (value: FilterType | SortType) => void;
  disabled?: boolean;
}

export function FilterChip({ type, value, isActive, onClick, disabled = false }: FilterChipProps) {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick(value);
    }
  }, [value, onClick, disabled]);

  const label = type === "filter" ? getFilterLabel(value as FilterType) : getSortLabel(value as SortType);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-[var(--color-primary)] text-white shadow-sm"
          : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      {label}
    </button>
  );
}
