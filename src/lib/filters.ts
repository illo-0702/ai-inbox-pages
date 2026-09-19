// 필터 및 정렬 로직
import type { TaskView, TaskKind } from "@/lib/types";
import { todayInSeoul } from "@/lib/time";

export type FilterType =
  | "all" // 전체
  | "today" // 오늘
  | "overdue" // 기한지남
  | "this-week" // 이번주
  | "no-deadline" // 마감없음
  | "needs-check" // 확인필요
  | "include-done" // 완료포함
  | "by-relationship" // 관계별
  | "by-kind"; // 유형별

export type SortType =
  | "deadline-asc" // 마감빠른순
  | "updated-desc" // 최근변경순
  | "created-desc" // 최근등록순
  | "relationship-asc"; // 관계명순

/**
 * 필터 적용 — 조건을 만족하는 업무만 반환
 */
export function applyFilters(
  tasks: TaskView[],
  filter: FilterType,
  relationshipId?: string,
  kind?: TaskKind
): TaskView[] {
  let filtered = tasks;

  switch (filter) {
    case "overdue":
      filtered = tasks.filter((t) => t.dueState === "overdue" && t.status === "open");
      break;
    case "today":
      filtered = tasks.filter((t) => t.dueState === "today" && t.status === "open");
      break;
    case "this-week": {
      const today = todayInSeoul();
      // "2026-09-18" 형식에서 연도와 월일을 파싱
      const [y, m, d] = today.split("-").map(Number);
      const todayDate = new Date(y, m - 1, d);
      const weekEnd = new Date(todayDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;

      filtered = tasks.filter(
        (t) =>
          t.status === "open" &&
          t.dueDate &&
          t.dueDate >= today &&
          t.dueDate <= weekEndStr &&
          t.dueState === "upcoming"
      );
      break;
    }
    case "no-deadline":
      filtered = tasks.filter((t) => t.dueState === "none" && t.status === "open");
      break;
    case "include-done":
      // 모든 업무 포함
      filtered = tasks;
      break;
    case "all":
    default:
      filtered = tasks.filter((t) => t.status === "open");
      break;
  }

  // 관계별 필터
  if (relationshipId) {
    filtered = filtered.filter((t) => t.relationshipId === relationshipId);
  }

  // 유형별 필터
  if (kind) {
    filtered = filtered.filter((t) => t.kind === kind);
  }

  return filtered;
}

/**
 * 정렬 적용
 */
export function applySorting(tasks: TaskView[], sortType: SortType): TaskView[] {
  const sorted = [...tasks];

  switch (sortType) {
    case "deadline-asc":
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });

    case "updated-desc":
      return sorted.sort((a, b) => {
        const aDate = a.lastChange?.appliedAt || a.updatedAt;
        const bDate = b.lastChange?.appliedAt || b.updatedAt;
        return bDate.localeCompare(aDate);
      });

    case "created-desc":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    case "relationship-asc":
      return sorted.sort((a, b) => a.relationshipName.localeCompare(b.relationshipName));

    default:
      return sorted;
  }
}

/**
 * 기본 정렬: 대시보드에서 사용하는 정렬 규칙
 * overdue → today → upcoming(날짜순) → none
 */
export function applyDefaultSort(tasks: TaskView[]): TaskView[] {
  return [...tasks].sort((a, b) => {
    const dueOrder = { overdue: 0, today: 1, upcoming: 2, none: 3 };
    const aOrder = dueOrder[a.dueState];
    const bOrder = dueOrder[b.dueState];

    if (aOrder !== bOrder) return aOrder - bOrder;

    // 같은 카테고리 내에서는 날짜순
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    // 날짜가 없으면 최신순
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/**
 * 필터와 정렬을 모두 적용
 */
export function filterAndSort(
  tasks: TaskView[],
  filter: FilterType,
  sort: SortType,
  relationshipId?: string,
  kind?: TaskKind
): TaskView[] {
  const filtered = applyFilters(tasks, filter, relationshipId, kind);
  return applySorting(filtered, sort);
}

/**
 * 고급 필터 옵션 타입
 */
export interface AdvancedFilterOptions {
  dateStart?: string; // "YYYY-MM-DD"
  dateEnd?: string; // "YYYY-MM-DD"
  amountMin?: number; // 최소금액 (원)
  amountMax?: number; // 최대금액 (원)
  status?: "open" | "done" | "all"; // 상태
  currency?: string; // "KRW", "USD", "EUR", "JPY", "기타" 등
}

/**
 * 고급 필터 적용
 */
export function applyAdvancedFilters(
  tasks: TaskView[],
  options: AdvancedFilterOptions
): TaskView[] {
  let filtered = tasks;

  // 기간 필터
  if (options.dateStart || options.dateEnd) {
    filtered = filtered.filter((t) => {
      if (!t.dueDate) return !options.dateStart && !options.dateEnd; // 마감 없음
      if (options.dateStart && t.dueDate < options.dateStart) return false;
      if (options.dateEnd && t.dueDate > options.dateEnd) return false;
      return true;
    });
  }

  // 금액 범위 필터
  if (options.amountMin !== undefined || options.amountMax !== undefined) {
    filtered = filtered.filter((t) => {
      if (t.amount === null) return false; // 금액 없으면 제외
      if (options.amountMin !== undefined && t.amount < options.amountMin) return false;
      if (options.amountMax !== undefined && t.amount > options.amountMax) return false;
      return true;
    });
  }

  // 상태 필터
  if (options.status && options.status !== "all") {
    filtered = filtered.filter((t) => t.status === options.status);
  }

  // 통화 필터
  if (options.currency && options.currency !== "all") {
    if (options.currency === "기타") {
      // "기타"는 KRW, USD, EUR, JPY가 아닌 것들
      filtered = filtered.filter((t) => !["KRW", "USD", "EUR", "JPY"].includes(t.currency || ""));
    } else {
      filtered = filtered.filter((t) => t.currency === options.currency);
    }
  }

  return filtered;
}

/**
 * 필터 표시명
 */
export function getFilterLabel(filter: FilterType): string {
  const labels: Record<FilterType, string> = {
    all: "전체",
    today: "오늘",
    overdue: "기한지남",
    "this-week": "이번주",
    "no-deadline": "마감없음",
    "needs-check": "확인필요",
    "include-done": "완료포함",
    "by-relationship": "관계별",
    "by-kind": "유형별",
  };
  return labels[filter];
}

/**
 * 정렬 표시명
 */
export function getSortLabel(sort: SortType): string {
  const labels: Record<SortType, string> = {
    "deadline-asc": "마감빠른순",
    "updated-desc": "최근변경순",
    "created-desc": "최근등록순",
    "relationship-asc": "관계명순",
  };
  return labels[sort];
}
