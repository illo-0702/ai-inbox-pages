"use client";

import { useCallback, useEffect, useState } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { RelationshipDetail, TaskView } from "@/lib/types";
import { getRelationshipDetail, setTaskStatus, ApiConflictError, ApiRequestError } from "@/lib/client/api";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { PendingItem } from "@/components/dashboard/PendingItem";
import { Timeline } from "@/components/relationships/Timeline";

function RelationshipDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";

  const [data, setData] = useState<RelationshipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRelationshipDetail(id);
      setData(res);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 404) {
        setNotFound(true);
      } else {
        setError(e instanceof ApiRequestError ? e.message : "관계 정보를 불러오지 못했어요.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  if (notFound) {
    return <EmptyState title="관계를 찾을 수 없어요." description="삭제되었거나 잘못된 주소일 수 있어요." />;
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

  const openTasks = data.tasks.filter((t) => t.status === "open");
  const doneTasks = data.tasks.filter((t) => t.status === "done");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">{data.name}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {data.contacts.length > 0 ? data.contacts.join(" / ") : "담당자 미확인"}
        </p>
      </div>

      {actionNotice && <ErrorNotice message={actionNotice} />}

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

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-text)]">현재 할 일</h2>
        {openTasks.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">미완료 업무가 없어요.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {openTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                busy={busyTaskId === task.id}
                onComplete={(t) => handleStatusChange(t, "done")}
              />
            ))}
          </div>
        )}
        {doneTasks.length > 0 && (
          <details className="mt-1">
            <summary className="cursor-pointer text-sm font-medium text-[var(--color-text-muted)]">
              완료한 업무 ({doneTasks.length})
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {doneTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  busy={busyTaskId === task.id}
                  onReopen={(t) => handleStatusChange(t, "open")}
                />
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-text)]">변경 이력</h2>
        <Timeline events={data.events} />
      </section>
    </div>
  );
}

export default function RelationshipDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner size={28} label="불러오는 중…" /></div>}>
      <RelationshipDetailInner />
    </Suspense>
  );
}
