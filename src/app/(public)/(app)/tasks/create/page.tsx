"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RelationshipSummary } from "@/lib/types";
import { getRelationships, ApiRequestError, createTaskDirect } from "@/lib/client/api";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { TaskForm, type TaskFormData } from "@/components/tasks/TaskForm";

export default function CreateTaskPage() {
  const router = useRouter();
  const [relationships, setRelationships] = useState<RelationshipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadRelationships = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRelationships();
      setRelationships(res);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "관계 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  const handleSubmit = useCallback(
    async (data: TaskFormData) => {
      setSubmitError(null);
      try {
        await createTaskDirect({
          relationshipName: data.relationshipName,
          kind: data.kind,
          title: data.title,
          amount: data.amount,
          currency: data.currency,
          dueDate: data.dueDate || null,
        });
        // 성공 후 업무 목록으로 이동
        router.push("/tasks");
      } catch (e) {
        setSubmitError(
          e instanceof ApiRequestError ? e.message : "업무를 생성하지 못했어요. 다시 시도해주세요."
        );
      }
    },
    [router]
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
    return <ErrorNotice message={error} onRetry={loadRelationships} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <section className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">새 업무 추가</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          AI 분석 없이 직접 업무를 만들 수 있습니다. 필수 항목을 입력하고 저장하세요.
        </p>
      </section>

      {submitError && <ErrorNotice message={submitError} />}

      <TaskForm
        relationships={relationships}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="업무 생성"
      />
    </div>
  );
}
