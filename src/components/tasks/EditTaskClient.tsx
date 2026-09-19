"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TaskView, RelationshipSummary } from "@/lib/types";
import { getDashboard, getRelationships, ApiRequestError, updateTaskDirect } from "@/lib/client/api";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { TaskForm, type TaskFormData } from "@/components/tasks/TaskForm";

export function EditTaskClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("id");

  const [task, setTask] = useState<TaskView | null>(null);
  const [relationships, setRelationships] = useState<RelationshipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!taskId) {
      setError("업무 ID가 없어요.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [dashboardRes, relationshipsRes] = await Promise.all([getDashboard(), getRelationships()]);

      // 업무 찾기
      const found = [...dashboardRes.openTasks, ...dashboardRes.doneTasks].find((t) => t.id === taskId);
      if (!found) {
        setError("업무를 찾을 수 없어요.");
        return;
      }

      setTask(found);
      setRelationships(relationshipsRes);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "데이터를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = useCallback(
    async (data: TaskFormData) => {
      if (!task) return;

      setSubmitError(null);
      try {
        await updateTaskDirect(task.id, {
          relationshipName: data.relationshipName,
          kind: data.kind,
          title: data.title,
          amount: data.amount,
          currency: data.currency,
          dueDate: data.dueDate || null,
          expectedVersion: task.version,
        });
        // 성공 후 업무 목록으로 이동
        router.push("/tasks");
      } catch (e) {
        setSubmitError(
          e instanceof ApiRequestError ? e.message : "업무를 수정하지 못했어요. 다시 시도해주세요."
        );
      }
    },
    [task, router]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} label="불러오는 중…" />
      </div>
    );
  }

  if (error) {
    return <ErrorNotice message={error} onRetry={loadData} />;
  }

  if (!task) {
    return <ErrorNotice message="업무를 찾을 수 없어요." onRetry={loadData} />;
  }

  const initialData: TaskFormData = {
    relationshipId: task.relationshipId,
    relationshipName: task.relationshipName,
    title: task.title,
    kind: task.kind,
    amount: task.amount,
    currency: task.currency || "KRW",
    dueDate: task.dueDate || "",
  };

  return (
    <>
      {submitError && <ErrorNotice message={submitError} />}

      <TaskForm
        relationships={relationships}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="수정 저장"
      />
    </>
  );
}
