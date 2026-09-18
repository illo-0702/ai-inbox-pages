"use client";

import { useEffect, useState } from "react";
import type { AnalyzeResponse, ProposalDraft, TaskSnapshot, UserDecision } from "@/lib/types";
import { seoulDateOf, seoulLocalToIso } from "@/lib/time";
import {
  analyze,
  decide as decideApi,
  extractFile,
  getCapabilities,
  ApiConflictError,
  ApiRequestError,
} from "@/lib/client/api";
import { formatDate, formatKRW, josa } from "@/lib/client/format";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { ProposalForm, type ProposalDecidePayload } from "@/components/proposal/ProposalForm";
import { ProposalResultSummary } from "@/components/proposal/ProposalResultSummary";
import { SourceTabs, type SourceTab } from "@/components/input/SourceTabs";
import { FileDropzone } from "@/components/input/FileDropzone";

const MAX_INPUT_CHARS = 2000;

const DEMO_CHIPS = [
  {
    label: "① 김과장 첫 요청",
    text: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.",
    receivedAt: "2026-09-18T09:00",
    organizationHint: "",
  },
  {
    label: "② 이대리 마감 변경",
    text: "A창호 이대리입니다. 송금은 22일까지 부탁드립니다.",
    receivedAt: "2026-09-19T10:00",
    organizationHint: "",
  },
  {
    label: "③ 잠정 변경",
    text: "24일까지 해주셔도 될 것 같긴 한데 기존 일정 한번 확인해볼게요.",
    receivedAt: "2026-09-19T15:00",
    organizationHint: "A창호",
  },
];

function defaultReceivedAtLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** 마운트되는 즉시 부드럽게 스크롤하고 포커스를 옮긴다(요소는 tabIndex=-1로 스크립트 포커스만 허용). */
function scrollAndFocus(el: HTMLElement | null) {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

type DraftState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done"; message: string }
  | { status: "conflict"; latest: TaskSnapshot }
  | { status: "error"; message: string };

export default function InputPage() {
  const [text, setText] = useState("");
  const [receivedAtLocal, setReceivedAtLocal] = useState(defaultReceivedAtLocal());
  const [showOptional, setShowOptional] = useState(false);
  const [senderHint, setSenderHint] = useState("");
  const [organizationHint, setOrganizationHint] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DraftState>>({});
  const [originalCleared, setOriginalCleared] = useState(false);

  // 파일 입력(P1) — 탭 상태와 imageInput 가용성은 서버(/api/capabilities)가 결정한다.
  const [sourceTab, setSourceTab] = useState<SourceTab>("text");
  const [imageEnabled, setImageEnabled] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileNotice, setFileNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCapabilities()
      .then((caps) => {
        if (!cancelled) setImageEnabled(caps.imageInput);
      })
      .catch(() => {
        // 확인하지 못하면 미구현처럼 안전하게 숨긴다(사용 가능한 기능처럼 보이지 않게).
        if (!cancelled) setImageEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const overLimit = text.length > MAX_INPUT_CHARS;
  const canAnalyze = text.trim().length > 0 && !overLimit && !analyzing;

  async function handleFileSelected(file: File) {
    if (fileUploading) return; // 중복 업로드 방지
    setFileUploading(true);
    setFileError(null);
    try {
      const res = await extractFile(file);
      setText(res.text);
      setOriginalCleared(false);
      const guide = "파일에서 가져온 내용이에요. 확인 후 [AI로 정리하기]를 눌러주세요";
      setFileNotice(res.notice ? `${guide} ${res.notice}` : guide);
      setSourceTab("text");
    } catch (e) {
      setFileError(
        e instanceof ApiRequestError ? e.message : "파일을 처리하지 못했어요. 다시 시도해주세요.",
      );
    } finally {
      setFileUploading(false);
    }
  }

  function applyChip(chip: (typeof DEMO_CHIPS)[number]) {
    setText(chip.text);
    setReceivedAtLocal(chip.receivedAt);
    if (chip.organizationHint) {
      setOrganizationHint(chip.organizationHint);
      setShowOptional(true);
    }
  }

  async function handleAnalyze() {
    if (!canAnalyze) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const receivedAtIso = seoulLocalToIso(receivedAtLocal);
      const res = await analyze({
        text,
        receivedAt: receivedAtIso,
        senderHint: senderHint.trim() || null,
        organizationHint: organizationHint.trim() || null,
      });
      setResult(res);
      setDrafts({});
      setOriginalCleared(false);
    } catch (e) {
      setAnalyzeError(e instanceof ApiRequestError ? e.message : "분석에 실패했어요. 다시 시도해주세요.");
    } finally {
      setAnalyzing(false);
    }
  }

  function relationshipNameOf(draft: ProposalDraft, fallback: string | null): string {
    return draft.relationship?.name ?? draft.suggestedRelationshipName ?? fallback ?? "관계";
  }

  function buildSummary(draft: ProposalDraft, decision: UserDecision, task: TaskSnapshot | null): string {
    const relName = task?.relationshipName ?? relationshipNameOf(draft, null);
    if (decision === "keep") return `${relName}의 기존 조건을 유지했어요.`;
    if (decision === "defer") return `${relName} 항목을 확인 필요로 남겨뒀어요. 관계 상세에서 다시 확인할 수 있어요.`;
    if (draft.action === "create" && task) {
      const todo = `${formatKRW(task.amount, task.currency)} ${task.title}`;
      return `${relName} ${josa(todo, "을/를")} 새 업무로 등록했어요.`;
    }
    if (task) {
      return `${relName} ${task.title} 마감을 ${formatDate(task.dueDate)}로 바꿨어요.`;
    }
    return `${relName} 요청을 반영했어요.`;
  }

  async function handleDecide(draft: ProposalDraft, payload: ProposalDecidePayload) {
    if (!result) return;
    setDrafts((d) => ({ ...d, [draft.index]: { status: "submitting" } }));
    try {
      const res = await decideApi({
        analysisId: result.analysisId,
        index: draft.index,
        receivedAt: result.receivedAt,
        decision: payload.decision,
        extracted: payload.extracted,
        target: payload.target,
        confirmations: payload.confirmations,
      });
      setDrafts((d) => ({
        ...d,
        [draft.index]: { status: "done", message: buildSummary(draft, payload.decision, res.task) },
      }));
    } catch (e) {
      if (e instanceof ApiConflictError) {
        setDrafts((d) => ({ ...d, [draft.index]: { status: "conflict", latest: e.latest } }));
      } else {
        setDrafts((d) => ({
          ...d,
          [draft.index]: {
            status: "error",
            message: e instanceof ApiRequestError ? e.message : "저장에 실패했어요. 다시 시도해주세요.",
          },
        }));
      }
    }
  }

  function resetAll() {
    setText("");
    setSenderHint("");
    setOrganizationHint("");
    setShowOptional(false);
    setReceivedAtLocal(defaultReceivedAtLocal());
    setResult(null);
    setDrafts({});
    setAnalyzeError(null);
    setOriginalCleared(false);
    setSourceTab("text");
    setFileError(null);
    setFileNotice(null);
  }

  const allProcessed =
    result !== null &&
    result.drafts.every((d) => d.action === "none" || drafts[d.index]?.status === "done");

  useEffect(() => {
    if (allProcessed && result && result.drafts.length > 0 && !originalCleared) {
      // 모든 초안 처리 완료 → 원문 상태를 비운다 (13.1)
      setOriginalCleared(true);
      setText("");
    }
  }, [allProcessed, result, originalCleared]);

  const receivedDate = result
    ? seoulDateOf(result.receivedAt)
    : seoulDateOf(seoulLocalToIso(receivedAtLocal));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)]">정보 추가</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          받은 요청을 붙여넣으면 관계·업무로 연결하고 변경 이력을 정리해드려요.
        </p>
      </div>

      {/* 입력 단계 */}
      <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <SourceTabs active={sourceTab} onChange={setSourceTab} imageEnabled={imageEnabled} locked={fileUploading} />

        {sourceTab === "text" && (
          <>
            {fileNotice && (
              <p className="rounded-lg border border-[var(--color-brand-muted)] bg-[var(--color-brand-muted)] px-3 py-2 text-xs text-[var(--color-brand-text)]">
                {fileNotice}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {DEMO_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => applyChip(chip)}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand-text)]"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--color-text)]">받은 요청 원문</span>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setOriginalCleared(false);
                  setFileNotice(null);
                }}
                rows={6}
                placeholder='예: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다."'
                className="resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)]"
              />
              <div className="flex items-center justify-between text-xs">
                <span className={overLimit ? "text-[var(--color-danger)]" : "text-[var(--color-text-faint)]"}>
                  {text.length} / {MAX_INPUT_CHARS}자
                </span>
                {overLimit && <span className="text-[var(--color-danger)]">입력이 너무 길어요. 줄여주세요.</span>}
              </div>
            </label>
          </>
        )}

        {sourceTab !== "text" && (
          <div className="flex flex-col gap-3">
            <FileDropzone
              accept={sourceTab === "pdf" ? "application/pdf,.pdf" : "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"}
              helpText={
                sourceTab === "pdf"
                  ? "PDF · 최대 4MB · 10페이지까지 지원해요."
                  : "PNG, JPG, WEBP · 최대 4MB"
              }
              uploading={fileUploading}
              onFile={handleFileSelected}
            />
            {fileError && (
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <ErrorNotice message={fileError} />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFileError(null);
                    setSourceTab("text");
                  }}
                >
                  텍스트로 붙여넣기
                </Button>
              </div>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1.5 sm:max-w-xs">
          <span className="text-sm font-medium text-[var(--color-text)]">받은 날짜·시간</span>
          <input
            type="datetime-local"
            value={receivedAtLocal}
            onChange={(e) => setReceivedAtLocal(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] tabular-nums"
          />
          <span className="text-xs text-[var(--color-text-faint)]">원래 받은 날짜를 확인해주세요.</span>
        </label>

        <div>
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="text-sm font-medium text-[var(--color-brand-text)]"
            aria-expanded={showOptional}
          >
            {showOptional ? "선택 입력 접기 ▲" : "발신자·업체 보완 입력 ▼"}
          </button>
          {showOptional && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--color-text-faint)]">발신자</span>
                <input
                  type="text"
                  value={senderHint}
                  onChange={(e) => setSenderHint(e.target.value)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--color-text-faint)]">업체</span>
                <input
                  type="text"
                  value={organizationHint}
                  onChange={(e) => setOrganizationHint(e.target.value)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                />
              </label>
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--color-text-faint)]">
          원문은 분석과 결과 확인에만 사용하며, 저장 시 필요한 구조화 정보만 남깁니다.
        </p>

        {analyzeError && <ErrorNotice message={analyzeError} onRetry={handleAnalyze} />}

        <div>
          <Button type="button" onClick={handleAnalyze} loading={analyzing} disabled={!canAnalyze}>
            AI로 정리하기
          </Button>
        </div>
      </section>

      {/* 결과 단계 */}
      {result && (
        <section className="flex flex-col gap-4">
          <h2
            ref={scrollAndFocus}
            tabIndex={-1}
            className="text-base font-semibold text-[var(--color-text)] outline-none"
          >
            분석 결과
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {result.provider === "demo" ? (
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                데모 분석(규칙 기반)
              </span>
            ) : (
              <span className="rounded-full border border-[var(--color-brand-muted)] bg-[var(--color-brand-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-text)]">
                AI 분석
              </span>
            )}
            {result.usedFallback && (
              <span className="text-xs text-[var(--color-text-faint)]">
                일부 제공자 연결에 실패해 대체 엔진을 사용했어요.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">받은 원문</h2>
              {originalCleared ? (
                <p className="text-sm text-[var(--color-text-faint)]">
                  모든 요청을 처리해 원문을 화면에서 지웠어요.
                </p>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{text}</p>
              )}
              <p className="mt-2 text-xs text-[var(--color-text-faint)] tabular-nums">
                받은 날짜 {formatDate(receivedDate)} 기준으로 해석했어요.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {result.drafts.length === 0 ? (
                <ErrorNotice message="등록할 할 일을 찾지 못했어요." />
              ) : (
                result.drafts.map((draft) => {
                  const state = drafts[draft.index] ?? { status: "idle" as const };
                  return (
                    <div key={draft.index} className="flex flex-col gap-2">
                      {state.status === "done" ? (
                        <div ref={scrollAndFocus} tabIndex={-1} className="outline-none">
                          <ProposalResultSummary message={state.message} onAddAnother={resetAll} />
                        </div>
                      ) : (
                        <>
                          {state.status === "conflict" && (
                            <ErrorNotice
                              message="다른 변경이 먼저 적용됐어요. 최신 상태를 확인하세요."
                              onRetry={handleAnalyze}
                            />
                          )}
                          {state.status === "error" && <ErrorNotice message={state.message} />}
                          <ProposalForm
                            judgment={draft.judgment}
                            reasonCodes={draft.reasonCodes}
                            reasonText={draft.reasonText}
                            action={draft.action}
                            initialExtracted={draft.extracted}
                            relationship={draft.relationship}
                            relationshipCandidates={draft.relationshipCandidates}
                            suggestedRelationshipName={draft.suggestedRelationshipName}
                            task={draft.task}
                            taskCandidates={draft.taskCandidates}
                            initialChanges={draft.changes}
                            receivedAtDate={receivedDate}
                            submitting={state.status === "submitting"}
                            onDecide={(payload) => handleDecide(draft, payload)}
                          />
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      )}

      {analyzing && !result && (
        <div className="flex justify-center py-10">
          <Spinner size={28} label="분석하는 중…" />
        </div>
      )}
    </div>
  );
}
