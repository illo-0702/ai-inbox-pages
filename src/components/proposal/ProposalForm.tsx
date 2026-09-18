"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DateString,
  DecideRequest,
  ExtractedRequest,
  FieldChange,
  Judgment,
  ReasonCode,
  RelationshipRef,
  TaskSnapshot,
  UserDecision,
} from "@/lib/types";
import { formatDate, formatDueLabel, formatKRW, taskKindLabel } from "@/lib/client/format";
import { JudgmentBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChangeCompareTable } from "./ChangeCompareTable";

type RelationshipChoice = { type: "existing"; id: string } | { type: "new"; name: string };

export interface ProposalDecidePayload {
  decision: UserDecision;
  extracted: ExtractedRequest;
  target: DecideRequest["target"];
  confirmations: DecideRequest["confirmations"];
}

interface ProposalFormProps {
  judgment: Judgment;
  reasonCodes: ReasonCode[];
  reasonText: string;
  action: "create" | "update" | "none";
  initialExtracted: ExtractedRequest;
  relationship: RelationshipRef | null;
  relationshipCandidates: RelationshipRef[];
  suggestedRelationshipName: string | null;
  task: TaskSnapshot | null;
  taskCandidates: TaskSnapshot[];
  /** 서버가 현재 업무 값 기준으로 다시 계산한 변경(있으면 최초 표시에 사용) */
  initialChanges?: FieldChange[];
  receivedAtDate: DateString;
  submitting: boolean;
  onDecide: (payload: ProposalDecidePayload) => void;
}

function describeTask(t: TaskSnapshot): string {
  const amountPart = t.amount !== null ? `${formatKRW(t.amount, t.currency)} ` : "";
  const duePart = t.dueDate ? `(${formatDate(t.dueDate)})` : "(마감 미정)";
  return `${amountPart}${t.title}${duePart}`;
}

function computeChanges(
  extracted: ExtractedRequest,
  base: { title: string; amount: number | null; dueDate: DateString | null } | null,
): FieldChange[] {
  if (!base) return [];
  const changes: FieldChange[] = [];
  if (extracted.dueDate !== null && extracted.dueDate !== base.dueDate) {
    changes.push({ field: "dueDate", before: base.dueDate, after: extracted.dueDate });
  }
  if (extracted.amount !== null && extracted.amount !== base.amount) {
    changes.push({ field: "amount", before: base.amount, after: extracted.amount });
  }
  // 제목은 후속 메시지로 자동 변경하지 않는다 (서버 규칙과 동일: 마감·금액·통화만 비교)
  return changes;
}

export function ProposalForm({
  judgment,
  reasonCodes,
  reasonText,
  action,
  initialExtracted,
  relationship,
  relationshipCandidates,
  suggestedRelationshipName,
  task,
  taskCandidates,
  initialChanges,
  receivedAtDate,
  submitting,
  onDecide,
}: ProposalFormProps) {
  const [extracted, setExtracted] = useState<ExtractedRequest>(initialExtracted);
  const [fieldsTouched, setFieldsTouched] = useState(false);
  const [relationshipChoice, setRelationshipChoice] = useState<RelationshipChoice | null>(null);
  const [newRelationshipName, setNewRelationshipName] = useState(suggestedRelationshipName ?? "");
  /** 기존 업무 후보의 id, 사용자가 "새 업무로 등록"을 고르면 "new", 아직 없으면 null */
  const [taskChoiceId, setTaskChoiceId] = useState<string | "new" | null>(null);
  const [dateConfirmed, setDateConfirmed] = useState(false);

  function editExtracted(updater: (v: ExtractedRequest) => ExtractedRequest) {
    setFieldsTouched(true);
    setExtracted(updater);
  }

  const dateAmbiguous = reasonCodes.includes("date_ambiguous");
  const needsRelationshipChoice = !relationship && relationshipCandidates.length > 0;
  // 관계가 이미 하나로 확정되어 업무도 1건 자동 매칭됐지만, 새 요청인지 후속 변경인지
  // 자체가 불확실하거나(intent_unclear) 값이 기존과 같아 중복 의심(no_changes)이면
  // "기존 업무에 반영 / 새 업무로 등록"을 사용자가 직접 고르게 한다.
  const needsIntentGate =
    action === "update" &&
    !!task &&
    (reasonCodes.includes("intent_unclear") || reasonCodes.includes("no_changes"));

  // 업무 선택 라디오에 올릴 후보 목록.
  // - needsIntentGate: 자동 매칭된 그 업무 한 건만 (사용자가 "새 업무로 등록"과 비교해 고르게)
  // - 관계 미상: 서버가 여러 관계의 후보를 섞어 보내므로 선택된 관계로 좁힌다
  // - 그 외 업데이트: 서버가 이미 관계로 좁혀 보낸 taskCandidates 그대로
  const filteredTaskCandidates = useMemo<TaskSnapshot[]>(() => {
    if (action !== "update") return [];
    if (needsIntentGate) return task ? [task] : [];
    if (task) return []; // 확정 매칭 + 게이트 불필요 → 고정 표시, 라디오 없음
    if (!needsRelationshipChoice) return taskCandidates;
    if (!relationshipChoice || relationshipChoice.type === "new") return [];
    const relId = relationshipChoice.id;
    return taskCandidates.filter((t) => t.relationshipId === relId);
  }, [action, needsIntentGate, task, needsRelationshipChoice, relationshipChoice, taskCandidates]);

  // 후보가 정확히 1건이면 자동 선택(게이트 상황 제외), 후보 목록이 바뀌면(관계 변경 등) 선택 초기화
  useEffect(() => {
    if (!needsIntentGate && filteredTaskCandidates.length === 1) {
      setTaskChoiceId(filteredTaskCandidates[0].id);
    } else {
      setTaskChoiceId(null);
    }
  }, [filteredTaskCandidates, needsIntentGate]);

  const wantsNewTask = taskChoiceId === "new";
  const resolvedTask: TaskSnapshot | null =
    task && !needsIntentGate
      ? task
      : (filteredTaskCandidates.find((t) => t.id === taskChoiceId) ?? null);

  const changes = useMemo(() => {
    if (action !== "update" || wantsNewTask) return [];
    if (resolvedTask === task && task !== null && !fieldsTouched && initialChanges) {
      return initialChanges;
    }
    return computeChanges(extracted, resolvedTask);
  }, [action, wantsNewTask, resolvedTask, task, fieldsTouched, initialChanges, extracted]);

  const tentativeDueChange = changes.find((c) => c.field === "dueDate");

  const relationshipOk = relationship
    ? true
    : needsRelationshipChoice
      ? relationshipChoice !== null &&
        (relationshipChoice.type !== "new" || relationshipChoice.name.trim() !== "")
      : suggestedRelationshipName !== null
        ? true
        : newRelationshipName.trim() !== "";

  const taskOk = action === "update" ? wantsNewTask || resolvedTask !== null : true;
  const dateOk = dateAmbiguous ? dateConfirmed : true;
  const canApply = relationshipOk && taskOk && dateOk;

  function buildRelationshipTarget(): DecideRequest["target"]["relationship"] {
    if (relationship) return { id: relationship.id };
    if (needsRelationshipChoice && relationshipChoice) {
      return relationshipChoice.type === "existing"
        ? { id: relationshipChoice.id }
        : { newName: relationshipChoice.name.trim() };
    }
    if (suggestedRelationshipName) return { newName: suggestedRelationshipName };
    if (newRelationshipName.trim()) return { newName: newRelationshipName.trim() };
    return null;
  }

  function buildTaskTarget(): DecideRequest["target"]["task"] {
    if (action === "create" || wantsNewTask) return "new";
    if (resolvedTask) return { id: resolvedTask.id, expectedVersion: resolvedTask.version };
    return null;
  }

  function submit(decision: UserDecision) {
    onDecide({
      decision,
      extracted,
      target: {
        relationship: buildRelationshipTarget(),
        task: buildTaskTarget(),
      },
      confirmations: {
        date: dateAmbiguous ? dateConfirmed : undefined,
        tentativeAccepted: extracted.tentative ? true : undefined,
      },
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <JudgmentBadge judgment={judgment} full />
        {extracted.kind && (
          <span className="text-xs font-medium text-[var(--color-text-faint)]">
            {taskKindLabel[extracted.kind]}
          </span>
        )}
      </div>

      {/* 추출 결과 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-faint)]">발신자</span>
          <span className="text-sm text-[var(--color-text)]">{extracted.senderName ?? "미상"}</span>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-faint)]">요청 내용</span>
          <input
            type="text"
            value={extracted.title ?? ""}
            onChange={(e) => editExtracted((v) => ({ ...v, title: e.target.value }))}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-faint)]">마감</span>
          <input
            type="date"
            value={extracted.dueDate ?? ""}
            onChange={(e) => editExtracted((v) => ({ ...v, dueDate: e.target.value || null }))}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] tabular-nums"
          />
          {extracted.dueDate && (
            <span className="text-xs text-[var(--color-text-faint)]">
              받은 날짜 {formatDate(receivedAtDate)} 기준 해석 · {formatDueLabel(extracted.dueDate)}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-faint)]">금액</span>
          <input
            type="number"
            inputMode="numeric"
            value={extracted.amount ?? ""}
            onChange={(e) =>
              editExtracted((v) => ({
                ...v,
                amount: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] tabular-nums"
          />
          {extracted.amount !== null && (
            <span className="text-xs text-[var(--color-text-faint)] tabular-nums">
              {formatKRW(extracted.amount, extracted.currency)}
            </span>
          )}
        </label>
      </div>

      {/* 연결 결과 */}
      <div className="flex flex-col gap-3 rounded-lg bg-[var(--color-surface-muted)] p-3.5">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-faint)]">관계</p>
          {relationship ? (
            <p className="text-sm font-medium text-[var(--color-text)]">기존 관계 {relationship.name}</p>
          ) : needsRelationshipChoice ? (
            <fieldset className="mt-1 flex flex-col gap-1.5">
              <legend className="sr-only">이 담당자는 어느 관계에 속하나요?</legend>
              {relationshipCandidates.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                  <input
                    type="radio"
                    name="relationship-choice"
                    checked={relationshipChoice?.type === "existing" && relationshipChoice.id === c.id}
                    onChange={() => setRelationshipChoice({ type: "existing", id: c.id })}
                  />
                  기존 관계 {c.name}
                  {c.contacts.length > 0 && (
                    <span className="text-xs text-[var(--color-text-faint)]">({c.contacts.join(", ")})</span>
                  )}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <input
                  type="radio"
                  name="relationship-choice"
                  checked={relationshipChoice?.type === "new"}
                  onChange={() => setRelationshipChoice({ type: "new", name: newRelationshipName })}
                />
                새 관계 만들기
              </label>
              {relationshipChoice?.type === "new" && (
                <input
                  type="text"
                  value={newRelationshipName}
                  onChange={(e) => {
                    setNewRelationshipName(e.target.value);
                    setRelationshipChoice({ type: "new", name: e.target.value });
                  }}
                  placeholder="새 관계 이름"
                  className="ml-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)]"
                />
              )}
            </fieldset>
          ) : suggestedRelationshipName ? (
            <p className="text-sm font-medium text-[var(--color-text)]">
              새 관계 만들기: {suggestedRelationshipName}
            </p>
          ) : (
            <input
              type="text"
              value={newRelationshipName}
              onChange={(e) => setNewRelationshipName(e.target.value)}
              placeholder="새 관계 이름"
              className="mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)]"
            />
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--color-text-faint)]">업무</p>
          {action === "create" ? (
            <p className="text-sm font-medium text-[var(--color-text)]">새 업무</p>
          ) : task && !needsIntentGate ? (
            <p className="text-sm font-medium text-[var(--color-text)]">기존 업무: {describeTask(task)}</p>
          ) : needsRelationshipChoice && !relationshipChoice ? (
            <p className="text-sm text-[var(--color-text-muted)]">관계를 먼저 선택해주세요.</p>
          ) : needsRelationshipChoice && relationshipChoice?.type === "new" ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              새 관계에는 연결할 기존 업무가 없어요. 새 업무로 등록해주세요.
            </p>
          ) : filteredTaskCandidates.length > 0 ? (
            <fieldset className="mt-1 flex flex-col gap-1.5">
              <legend className="sr-only">어느 업무에 대한 내용인가요?</legend>
              {filteredTaskCandidates.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                  <input
                    type="radio"
                    name="task-choice"
                    checked={taskChoiceId === c.id}
                    onChange={() => setTaskChoiceId(c.id)}
                  />
                  {needsIntentGate ? `기존 업무에 반영: ${describeTask(c)}` : describeTask(c)}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <input
                  type="radio"
                  name="task-choice"
                  checked={taskChoiceId === "new"}
                  onChange={() => setTaskChoiceId("new")}
                />
                새 업무로 등록
              </label>
            </fieldset>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">이 관계에는 연결할 업무가 없어요.</p>
          )}
        </div>
      </div>

      {/* 판단 이유 */}
      <p className="text-sm text-[var(--color-text-muted)]">{reasonText}</p>

      {/* 변경 비교 / 새 업무 안내 */}
      {action === "update" && wantsNewTask && (
        <p className="text-sm font-medium text-[var(--color-text)]">새 업무로 저장됩니다.</p>
      )}
      {action === "update" && !wantsNewTask && changes.length > 0 && <ChangeCompareTable changes={changes} />}

      {/* 확인 질문: 날짜 불명 */}
      {dateAmbiguous && extracted.dueDate && (
        <label className="flex items-start gap-2 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-text)]">
          <input
            type="checkbox"
            checked={dateConfirmed}
            onChange={(e) => setDateConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          <span>받은 날짜를 기준으로 {formatDate(extracted.dueDate)}로 해석했어요. 맞나요?</span>
        </label>
      )}

      {/* 확인 질문: 잠정 변경 */}
      {extracted.tentative && (
        <p className="rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-text)]">
          {tentativeDueChange
            ? `${formatDate(String(tentativeDueChange.after))}로 변경될 가능성이 있습니다. 현재 마감은 ${
                tentativeDueChange.before ? formatDate(String(tentativeDueChange.before)) : "미정"
              }입니다.`
            : "이 내용은 아직 확정되지 않은 잠정 변경으로 보여요."}
        </p>
      )}

      {/* 동작 버튼 */}
      {action !== "none" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {action === "create" ? (
            <Button type="button" onClick={() => submit("apply")} loading={submitting} disabled={!canApply}>
              저장
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => submit("defer")}
                loading={submitting}
              >
                나중에 확인
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => submit("keep")}
                loading={submitting}
              >
                기존 유지
              </Button>
              <Button
                type="button"
                onClick={() => submit("apply")}
                loading={submitting}
                disabled={!canApply}
              >
                {wantsNewTask ? "저장" : "변경 반영"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
