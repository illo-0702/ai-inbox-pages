"use client";

import { useCallback, useEffect, useState } from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { TaskSnapshot, UserDecision } from "@/lib/types";
import { seoulDateOf } from "@/lib/time";
import {
  getProposal,
  decideProposal,
  ApiConflictError,
  ApiRequestError,
  type ProposalDetailResponse,
} from "@/lib/client/api";
import { decisionLabel, formatDate, formatKRW } from "@/lib/client/format";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { EmptyState } from "@/components/ui/EmptyState";
import { JudgmentBadge } from "@/components/ui/Badge";
import { ChangeCompareTable } from "@/components/proposal/ChangeCompareTable";
import { ProposalForm, type ProposalDecidePayload } from "@/components/proposal/ProposalForm";
import { ProposalResultSummary } from "@/components/proposal/ProposalResultSummary";

type ViewState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done"; message: string }
  | { status: "conflict" }
  | { status: "already_decided" }
  | { status: "error"; message: string };

function ProposalDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();

  const [data, setData] = useState<ProposalDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<ViewState>({ status: "idle" });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getProposal(id);
      setData(res);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(e instanceof ApiRequestError ? e.message : "항목을 불러오지 못했어요.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDecide(payload: ProposalDecidePayload) {
    if (!data) return;
    setView({ status: "submitting" });
    try {
      const res = await decideProposal(id, {
        decision: payload.decision,
        extracted: payload.extracted,
        target: payload.target,
        confirmations: payload.confirmations,
      });
      const relName = res.task?.relationshipName ?? data.relationshipName ?? data.relationship?.name ?? "관계";
      const message = buildSummary(payload.decision, relName, res.task);
      setView({ status: "done", message });
    } catch (e) {
      if (e instanceof ApiConflictError) {
        setView({ status: "conflict" });
      } else if (e instanceof ApiRequestError && e.code === "already_decided") {
        setView({ status: "already_decided" });
      } else {
        setView({
          status: "error",
          message: e instanceof ApiRequestError ? e.message : "저장에 실패했어요. 다시 시도해주세요.",
        });
      }
    }
  }

  if (notFound) {
    return (
      <EmptyState
        title="이미 처리되었거나 존재하지 않는 항목이에요."
        description="대시보드의 확인 필요 목록에서 최신 항목을 확인해주세요."
      />
    );
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} label="불러오는 중…" />
      </div>
    );
  }

  if (loadError && !data) {
    return <ErrorNotice message={loadError} onRetry={load} />;
  }

  if (!data) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)]">확인 필요 항목</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          원문은 저장하지 않아 구조화된 내용만 보여드려요.
        </p>
      </div>

      {view.status === "done" ? (
        <ProposalResultSummary message={view.message} />
      ) : data.decision !== "pending" ? (
        <DecidedView data={data} />
      ) : (
        <>
          {view.status === "conflict" && (
            <ErrorNotice message="다른 변경이 먼저 적용됐어요. 최신 상태를 확인하세요." onRetry={load} />
          )}
          {view.status === "already_decided" && (
            <ErrorNotice message="이미 처리된 항목이에요. 최신 상태를 다시 불러올게요." onRetry={load} />
          )}
          {view.status === "error" && <ErrorNotice message={view.message} />}

          <ProposalForm
            judgment={data.judgment}
            reasonCodes={data.reasonCodes}
            reasonText={data.reasonText}
            action={data.action}
            initialExtracted={data.extracted}
            relationship={data.relationship}
            relationshipCandidates={data.relationshipCandidates}
            suggestedRelationshipName={data.suggestedRelationshipName}
            task={data.task}
            taskCandidates={data.taskCandidates}
            initialChanges={data.currentChanges}
            receivedAtDate={seoulDateOf(data.receivedAt)}
            submitting={view.status === "submitting"}
            onDecide={handleDecide}
            deferAction={{ label: "목록으로", onClick: () => router.push("/") }}
          />
        </>
      )}
    </div>
  );
}

/** 이미 처리된(pending이 아닌) 저장된 제안 — 구조화 정보만 읽기 전용으로 보여준다 */
function DecidedView({ data }: { data: ProposalDetailResponse }) {
  const relName = data.relationship?.name ?? data.relationshipName ?? "관계 미정";
  const taskName = data.task?.title ?? data.taskTitle ?? null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <JudgmentBadge judgment={data.judgment} full />
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
          이미 처리된 항목 · {decisionLabel[data.decision]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-faint)]">발신자</span>
          <span className="text-sm text-[var(--color-text)]">{data.senderName ?? data.extracted.senderName ?? "미상"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-faint)]">관계</span>
          <span className="text-sm text-[var(--color-text)]">{relName}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-faint)]">업무</span>
          <span className="text-sm text-[var(--color-text)]">{taskName ?? "-"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-faint)]">금액</span>
          <span className="text-sm text-[var(--color-text)] tabular-nums">
            {data.extracted.amount !== null ? formatKRW(data.extracted.amount, data.extracted.currency) : "-"}
          </span>
        </div>
      </div>

      {data.currentChanges.length > 0 && <ChangeCompareTable changes={data.currentChanges} />}

      <p className="text-sm text-[var(--color-text-muted)]">{data.reasonText}</p>
    </div>
  );
}

function buildSummary(decision: UserDecision, relName: string, task: TaskSnapshot | null): string {
  if (decision === "keep") return `${relName}의 기존 조건을 유지했어요.`;
  if (decision === "defer") return `${relName} 항목을 확인 필요로 계속 남겨뒀어요.`;
  if (task) return `${relName} ${task.title} ${formatKRW(task.amount, task.currency)} · 마감 ${formatDate(task.dueDate)}로 반영했어요.`;
  return `${relName} 변경을 반영했어요.`;
}

export default function ProposalDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner size={28} label="불러오는 중…" /></div>}>
      <ProposalDetailInner />
    </Suspense>
  );
}
