"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardResponse, TaskView, RelationshipSummary } from "@/lib/types";
import { getDashboard, getRelationships, setTaskStatus, ApiConflictError, ApiRequestError } from "@/lib/client/api";
import { filterAndSort, type FilterType, type SortType, type AdvancedFilterOptions, applyAdvancedFilters } from "@/lib/filters";
import { searchTasks } from "@/lib/search";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { SearchInput } from "@/components/search/SearchInput";
import { FilterChip } from "@/components/filters/FilterChip";
import { AdvancedFilter } from "@/components/filters/AdvancedFilter";

type Tab = "open" | "done";

const STORAGE_KEY_ADVANCED_FILTER = "ai-inbox:advanced-filter";
const STORAGE_KEY_BASIC_FILTER = "ai-inbox:basic-filter";
const STORAGE_KEY_SORT = "ai-inbox:sort";

export default function TasksPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [relationships, setRelationships] = useState<RelationshipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("deadline-asc");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilterOptions>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, relationshipsRes] = await Promise.all([getDashboard(), getRelationships()]);
      setDashboard(dashboardRes);
      setRelationships(relationshipsRes);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "데이터를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, []);

  // localStorage에서 필터 상태 복원
  useEffect(() => {
    try {
      const savedBasicFilter = localStorage.getItem(STORAGE_KEY_BASIC_FILTER);
      const savedSort = localStorage.getItem(STORAGE_KEY_SORT);
      const savedAdvancedFilter = localStorage.getItem(STORAGE_KEY_ADVANCED_FILTER);

      if (savedBasicFilter) setFilter(savedBasicFilter as FilterType);
      if (savedSort) setSort(savedSort as SortType);
      if (savedAdvancedFilter) {
        const parsed = JSON.parse(savedAdvancedFilter);
        setAdvancedFilter(parsed);
      }
    } catch (e) {
      // localStorage 오류 무시
      console.warn("필터 복원 실패:", e);
    }
  }, []);

  // 기본 필터 변경 시 localStorage 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BASIC_FILTER, filter);
    } catch (e) {
      console.warn("필터 저장 실패:", e);
    }
  }, [filter]);

  // 정렬 변경 시 localStorage 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SORT, sort);
    } catch (e) {
      console.warn("정렬 저장 실패:", e);
    }
  }, [sort]);

  // 고급 필터 변경 시 localStorage 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ADVANCED_FILTER, JSON.stringify(advancedFilter));
    } catch (e) {
      console.warn("고급 필터 저장 실패:", e);
    }
  }, [advancedFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(task: TaskView, status: "open" | "done") {
    setBusyTaskId(task.id);
    setActionNotice(null);
    try {
      await setTaskStatus(task.id, status, task.version);
      await load();
    } catch (e) {
      if (e instanceof ApiConflictError) {
        setActionNotice("다른 변경이 먼저 적용됐어요. 최신 상태로 갱신했습니다.");
        await load();
      } else {
        setActionNotice(e instanceof ApiRequestError ? e.message : "처리에 실패했어요. 다시 시도해주세요.");
      }
    } finally {
      setBusyTaskId(null);
    }
  }

  if (loading && !dashboard) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} label="불러오는 중…" />
      </div>
    );
  }

  if (error && !dashboard) {
    return <ErrorNotice message={error} onRetry={load} />;
  }

  if (!dashboard) return null;

  // 필터와 정렬 적용
  const allTasks = tab === "open" ? dashboard.openTasks : dashboard.doneTasks;
  const filteredAndSorted = filterAndSort(allTasks, filter, sort);

  // 고급 필터 적용
  const advancedFiltered = applyAdvancedFilters(filteredAndSorted, advancedFilter);

  // 검색 적용
  let displayedTasks = advancedFiltered;
  if (searchQuery.trim()) {
    const searchResult = searchTasks(searchQuery, advancedFiltered, relationships);
    displayedTasks = searchResult.tasks;
  }

  const isEmpty = displayedTasks.length === 0;

  // 고급 필터 적용 여부 표시
  const hasAdvancedFilter = Object.keys(advancedFilter).length > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* 헤더 */}
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">업무 목록</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            필터와 정렬로 현재 해야 할 일을 효율적으로 관리하세요.
          </p>
        </div>
        <Link href="/tasks/create">
          <Button type="button">+ 업무 추가</Button>
        </Link>
      </section>

      {actionNotice && <ErrorNotice message={actionNotice} />}

      {/* 검색 입력 */}
      <section className="flex flex-col gap-3">
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
      </section>

      {/* 필터 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">필터</h3>
          <button
            type="button"
            onClick={() => setAdvancedFilterOpen(true)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              hasAdvancedFilter
                ? "bg-[var(--color-primary)] text-white shadow-sm"
                : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]"
            }`}
          >
            {hasAdvancedFilter ? "✓ 고급 필터" : "⚙ 고급 필터"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            type="filter"
            value="all"
            isActive={filter === "all"}
            onClick={(val) => setFilter(val as FilterType)}
          />
          <FilterChip
            type="filter"
            value="today"
            isActive={filter === "today"}
            onClick={(val) => setFilter(val as FilterType)}
          />
          <FilterChip
            type="filter"
            value="overdue"
            isActive={filter === "overdue"}
            onClick={(val) => setFilter(val as FilterType)}
          />
          <FilterChip
            type="filter"
            value="this-week"
            isActive={filter === "this-week"}
            onClick={(val) => setFilter(val as FilterType)}
          />
          <FilterChip
            type="filter"
            value="no-deadline"
            isActive={filter === "no-deadline"}
            onClick={(val) => setFilter(val as FilterType)}
          />
          <FilterChip
            type="filter"
            value="include-done"
            isActive={filter === "include-done"}
            onClick={(val) => setFilter(val as FilterType)}
          />
        </div>
      </section>

      {/* 정렬 */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">정렬</h3>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            type="sort"
            value="deadline-asc"
            isActive={sort === "deadline-asc"}
            onClick={(val) => setSort(val as SortType)}
          />
          <FilterChip
            type="sort"
            value="updated-desc"
            isActive={sort === "updated-desc"}
            onClick={(val) => setSort(val as SortType)}
          />
          <FilterChip
            type="sort"
            value="created-desc"
            isActive={sort === "created-desc"}
            onClick={(val) => setSort(val as SortType)}
          />
          <FilterChip
            type="sort"
            value="relationship-asc"
            isActive={sort === "relationship-asc"}
            onClick={(val) => setSort(val as SortType)}
          />
        </div>
      </section>

      {/* 탭 */}
      <section className="flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="업무 목록 탭"
          className="flex w-fit gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "open"}
            onClick={() => setTab("open")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === "open"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            미완료 ({allTasks.filter((t) => t.status === "open").length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "done"}
            onClick={() => setTab("done")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === "done"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            완료 ({allTasks.filter((t) => t.status === "done").length})
          </button>
        </div>

        {/* 업무 목록 */}
        {isEmpty ? (
          <EmptyState title="조건에 맞는 업무가 없어요." />
        ) : (
          <div className="flex flex-col gap-3">
            {displayedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                busy={busyTaskId === task.id}
                onComplete={(t) => handleStatusChange(t, "done")}
                onReopen={(t) => handleStatusChange(t, "open")}
              />
            ))}
          </div>
        )}
      </section>

      {/* 고급 필터 모달 */}
      <AdvancedFilter
        isOpen={advancedFilterOpen}
        options={advancedFilter}
        onChange={setAdvancedFilter}
        onClose={() => setAdvancedFilterOpen(false)}
      />
    </div>
  );
}
