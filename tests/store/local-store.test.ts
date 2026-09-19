// GitHub Pages 버전 로컬 저장소(local/store.ts)의 대표 시나리오·격리·영속성 테스트.
import { beforeEach, describe, expect, it } from "vitest";
import { installLocalStorageShim } from "./local-storage-shim";

installLocalStorageShim();

import {
  analyzeLocal,
  decideLocal,
  decidePendingLocal,
  deleteAllLocal,
  getDashboardLocal,
  getProposalViewLocal,
  getRelationshipDetailLocal,
  getRelationshipsLocal,
  LocalStoreError,
  LocalVersionConflictError,
  setTaskStatusLocal,
} from "@/lib/local/store";
import type { AnalyzeResponse, ProposalDraft } from "@/lib/types";

beforeEach(() => {
  deleteAllLocal();
});

function autoTarget(d: ProposalDraft) {
  return {
    relationship: d.relationship ? { id: d.relationship.id } : d.suggestedRelationshipName ? { newName: d.suggestedRelationshipName } : null,
    task: d.action === "create" ? ("new" as const) : d.task ? { id: d.task.id, expectedVersion: d.task.version } : null,
  };
}

function applyFirstDraft(res: AnalyzeResponse, opts: { decision?: "apply" | "keep" | "defer"; confirmations?: object } = {}) {
  const d = res.drafts[0];
  return decideLocal({
    analysisId: res.analysisId,
    index: d.index,
    receivedAt: res.receivedAt,
    decision: opts.decision ?? "apply",
    extracted: d.extracted,
    target: autoTarget(d),
    confirmations: opts.confirmations ?? {},
  });
}

describe("로컬 저장소 — 대표 시나리오", () => {
  it("T01: 김과장 첫 요청 → 미완료 업무 1건", () => {
    const an = analyzeLocal({ text: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.", receivedAt: "2026-09-18T09:00:00+09:00" });
    expect(an.provider).toBe("demo");
    const dec = applyFirstDraft(an);
    expect(dec.decision).toBe("applied");
    expect(dec.task).toMatchObject({ amount: 3000000, dueDate: "2026-09-20" });

    const dash = getDashboardLocal();
    expect(dash.openTasks).toHaveLength(1);
    expect(dash.openTasks[0].amount).toBe(3000000);
  });

  it("T02: 이대리 마감 변경 → 같은 업무 1건 유지, 마감만 변경", () => {
    const a1 = analyzeLocal({ text: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.", receivedAt: "2026-09-18T09:00:00+09:00" });
    applyFirstDraft(a1);

    const a2 = analyzeLocal({ text: "A창호 이대리입니다. 송금은 22일까지 부탁드립니다.", receivedAt: "2026-09-19T10:00:00+09:00" });
    const dec2 = applyFirstDraft(a2);
    expect(dec2.decision).toBe("applied");

    const dash = getDashboardLocal();
    expect(dash.openTasks).toHaveLength(1);
    expect(dash.openTasks[0].dueDate).toBe("2026-09-22");
    expect(dash.openTasks[0].amount).toBe(3000000); // 금액 유지

    const rels = getRelationshipsLocal();
    expect(rels).toHaveLength(1);
    expect(rels[0].contacts.sort()).toEqual(["김과장", "이대리"].sort());
  });

  it("T03/T05: 잠정 변경은 확인 없이 반영되지 않고, 나중에 확인으로 보류할 수 있다", () => {
    const a1 = analyzeLocal({ text: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.", receivedAt: "2026-09-18T09:00:00+09:00" });
    applyFirstDraft(a1);
    const a2 = analyzeLocal({ text: "A창호 이대리입니다. 송금은 22일까지 부탁드립니다.", receivedAt: "2026-09-19T10:00:00+09:00" });
    applyFirstDraft(a2);

    const a3 = analyzeLocal({
      text: "24일까지 해주셔도 될 것 같긴 한데 기존 일정 한번 확인해볼게요.",
      receivedAt: "2026-09-19T15:00:00+09:00",
      organizationHint: "A창호",
    });
    const d3 = a3.drafts[0];
    expect(d3.reasonCodes).toContain("tentative_expression");

    // 확인 없이 apply하면 거부된다
    expect(() =>
      decideLocal({
        analysisId: a3.analysisId,
        index: 0,
        receivedAt: a3.receivedAt,
        decision: "apply",
        extracted: d3.extracted,
        target: autoTarget(d3),
        confirmations: {},
      }),
    ).toThrow(LocalStoreError);

    const dash1 = getDashboardLocal();
    expect(dash1.openTasks[0].dueDate).toBe("2026-09-22"); // 변경 없음

    // 나중에 확인으로 보류
    const deferred = decideLocal({
      analysisId: a3.analysisId,
      index: 0,
      receivedAt: a3.receivedAt,
      decision: "defer",
      extracted: d3.extracted,
      target: autoTarget(d3),
      confirmations: {},
    });
    expect(deferred.decision).toBe("pending");
    const dash2 = getDashboardLocal();
    expect(dash2.pending).toHaveLength(1);
    expect(dash2.openTasks[0].dueDate).toBe("2026-09-22"); // 여전히 변경 없음
  });

  it("T06: 업체 미상 메시지는 자동으로 관계에 연결되지 않는다", () => {
    const a1 = analyzeLocal({ text: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.", receivedAt: "2026-09-18T09:00:00+09:00" });
    applyFirstDraft(a1);

    const a2 = analyzeLocal({ text: "이영호 대리입니다. 송금은 25일까지 부탁드립니다.", receivedAt: "2026-09-19T09:00:00+09:00" });
    const d2 = a2.drafts[0];
    expect(d2.reasonCodes).toContain("relationship_unknown");
    expect(d2.relationship).toBeNull();
    expect(getRelationshipsLocal()).toHaveLength(1); // 병합되지 않음
  });

  it("T13: 완료 후 되돌리기 — 이력은 유지된다", () => {
    const a1 = analyzeLocal({ text: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.", receivedAt: "2026-09-18T09:00:00+09:00" });
    const dec = applyFirstDraft(a1);
    const taskId = dec.task!.id;
    const relId = dec.task!.relationshipId;

    setTaskStatusLocal(taskId, "done", 1);
    setTaskStatusLocal(taskId, "open", 2);

    const detail = getRelationshipDetailLocal(relId)!;
    expect(detail.events.filter((e) => e.eventType === "completed" || e.eventType === "reopened")).toHaveLength(2);
    expect(getDashboardLocal().openTasks[0].status).toBe("open");
  });

  it("T14: 같은 분석 결과 재전송은 중복 반영되지 않는다", () => {
    const a1 = analyzeLocal({ text: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.", receivedAt: "2026-09-18T09:00:00+09:00" });
    const d = a1.drafts[0];
    const body = { analysisId: a1.analysisId, index: 0, receivedAt: a1.receivedAt, decision: "apply" as const, extracted: d.extracted, target: autoTarget(d), confirmations: {} };
    decideLocal(body);
    const again = decideLocal(body);
    expect(again.duplicate).toBe(true);
    expect(getDashboardLocal().openTasks).toHaveLength(1);
  });

  it("버전 충돌: 오래된 버전으로 완료 처리하면 거부된다", () => {
    const a1 = analyzeLocal({ text: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.", receivedAt: "2026-09-18T09:00:00+09:00" });
    const dec = applyFirstDraft(a1);
    expect(() => setTaskStatusLocal(dec.task!.id, "done", 99)).toThrow(LocalVersionConflictError);
  });

  it("저장된 확인 필요 항목: 이미 처리된 항목을 다시 결정하면 거부된다", () => {
    const a1 = analyzeLocal({ text: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.", receivedAt: "2026-09-18T09:00:00+09:00" });
    applyFirstDraft(a1);
    const a3 = analyzeLocal({
      text: "24일까지 해주셔도 될 것 같긴 한데 기존 일정 한번 확인해볼게요.",
      receivedAt: "2026-09-19T15:00:00+09:00",
      organizationHint: "A창호",
    });
    const deferred = decideLocal({
      analysisId: a3.analysisId,
      index: 0,
      receivedAt: a3.receivedAt,
      decision: "defer",
      extracted: a3.drafts[0].extracted,
      target: autoTarget(a3.drafts[0]),
      confirmations: {},
    });
    const view = getProposalViewLocal(deferred.proposalId)!;
    expect(view.task?.dueDate).toBe("2026-09-20".replace("20", "20")); // 현재 업무 스냅샷 확인용(마감은 아직 20일 그대로일 수 있음)

    decidePendingLocal(deferred.proposalId, { decision: "keep", target: { relationship: view.relationship ? { id: view.relationship.id } : null, task: view.task ? { id: view.task.id, expectedVersion: view.task.version } : null }, confirmations: {} });
    expect(() =>
      decidePendingLocal(deferred.proposalId, { decision: "keep", target: { relationship: null, task: null }, confirmations: {} }),
    ).toThrow(LocalStoreError);
  });

  it("빈 입력·과다 입력은 거부한다", () => {
    expect(() => analyzeLocal({ text: "   ", receivedAt: "2026-09-18T09:00:00+09:00" })).toThrow("내용을 입력해주세요.");
    expect(() => analyzeLocal({ text: "가".repeat(2001), receivedAt: "2026-09-18T09:00:00+09:00" })).toThrow();
  });

  it("데모 데이터 삭제 후에는 모든 화면이 빈 상태다", () => {
    const a1 = analyzeLocal({ text: "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.", receivedAt: "2026-09-18T09:00:00+09:00" });
    applyFirstDraft(a1);
    deleteAllLocal();
    const dash = getDashboardLocal();
    expect(dash.openTasks).toHaveLength(0);
    expect(getRelationshipsLocal()).toHaveLength(0);
  });
});
