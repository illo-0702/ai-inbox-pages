"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardResponse, TaskView } from "@/lib/types";
import { getDashboard, setTaskStatus, ApiConflictError, ApiRequestError } from "@/lib/client/api";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { PendingItem } from "@/components/dashboard/PendingItem";

type Tab = "open" | "done";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("open");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboard();
      setData(res);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "대시보드를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} label="불러오는 중…" />
      </div>
    );
  }

  if (error && !data) {
    return <ErrorNotice message={error} onRetry={load} />;
  }

  if (!data) return null;

  const isEmpty = data.openTasks.length === 0 && data.doneTasks.length === 0 && data.pending.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">현재 할 일</h1>
      <section>
        <p className="text-sm text-[var(--color-text-muted)]">
          여러 곳에서 받은 요청을 관계별로 연결하고, 지금 유효한 조건과 변경 이력을 함께 보여드려요.
        </p>
      </section>

      {actionNotice && <ErrorNotice message={actionNotice} />}

      {isEmpty ? (
        <EmptyState
          title="받은 요청을 붙여넣으면 지금 해야 할 일을 정리해드려요."
          description={'예시: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다."'}
          action={
            <Link href="/input">
              <Button type="button">정보 추가</Button>
            </Link>
          }
        />
      ) : (
        <>
          {data.pending.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-[var(--color-text)]">
                확인 필요 <span className="text-[var(--color-warning)]">{data.pending.length}건</span>
              </h2>
              <div className="flex flex-col gap-2">
                {data.pending.map((item) => (
                  <PendingItem key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

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
                className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] ${
                  tab === "open"
                    ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)]"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                미완료 ({data.openTasks.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "done"}
                onClick={() => setTab("done")}
                className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] ${
                  tab === "done"
                    ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)]"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                완료 ({data.doneTasks.length})
              </button>
            </div>

            {tab === "open" ? (
              data.openTasks.length === 0 ? (
                <EmptyState title="미완료 업무가 없어요." />
              ) : (
                <div className="flex flex-col gap-3">
                  {data.openTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      busy={busyTaskId === task.id}
                      onComplete={(t) => handleStatusChange(t, "done")}
                    />
                  ))}
                </div>
              )
            ) : data.doneTasks.length === 0 ? (
              <EmptyState title="완료한 업무가 없어요." />
            ) : (
              <div className="flex flex-col gap-3">
                {data.doneTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    busy={busyTaskId === task.id}
                    onReopen={(t) => handleStatusChange(t, "open")}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
