// 조회 함수 테스트 — 대시보드 정렬, 업체명 정규화 병합, 저장된 제안 상세 재계산.
import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";
import { applyDecision } from "@/lib/server/apply";
import { getDashboard, getProposalView, getRelationships } from "@/lib/server/queries";
import { addDays, todayInSeoul } from "@/lib/time";
import type { DecideRequest } from "@/lib/types";
import { RECEIVED_0918, RECEIVED_0919, baseExtracted, setupWorkspace } from "./helpers";

const opened: Client[] = [];
afterEach(() => {
  for (const c of opened.splice(0)) c.close();
});

async function ws() {
  const s = await setupWorkspace();
  opened.push(s.db);
  return s;
}

function newTaskRequest(org: string, dueDate: string | null, analysisId: string): DecideRequest {
  return {
    analysisId,
    index: 0,
    receivedAt: RECEIVED_0918,
    decision: "apply",
    extracted: baseExtracted({ organization: org, kind: "remittance", amount: 1_000_000, currency: "KRW", dueDate, intent: "new" }),
    target: { relationship: { newName: org }, task: "new" },
    confirmations: {},
  };
}

describe("getDashboard — 정렬 규칙", () => {
  it("기한 경과 → 오늘 → 이후 날짜순 → 마감 미정 순서로 정렬한다", async () => {
    const { db, workspaceId } = await ws();
    const today = todayInSeoul();
    const overdue = addDays(today, -1);
    const soon = addDays(today, 2);
    const later = addDays(today, 5);

    await applyDecision(db, workspaceId, newTaskRequest("업체-미정", null, "n1"));
    await applyDecision(db, workspaceId, newTaskRequest("업체-이후늦음", later, "n2"));
    await applyDecision(db, workspaceId, newTaskRequest("업체-경과", overdue, "n3"));
    await applyDecision(db, workspaceId, newTaskRequest("업체-오늘", today, "n4"));
    await applyDecision(db, workspaceId, newTaskRequest("업체-이후빠름", soon, "n5"));

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks.map((t) => t.relationshipName)).toEqual([
      "업체-경과",
      "업체-오늘",
      "업체-이후빠름",
      "업체-이후늦음",
      "업체-미정",
    ]);
    expect(dash.openTasks[0].dueState).toBe("overdue");
    expect(dash.openTasks[1].dueState).toBe("today");
    expect(dash.openTasks[4].dueState).toBe("none");
  });
});

describe("이름 정규화 — 같은 업체는 하나의 관계로 병합된다", () => {
  it("(주)A창호 / A창호 (trailing space)는 같은 관계로 연결된다", async () => {
    const { db, workspaceId } = await ws();
    await applyDecision(db, workspaceId, newTaskRequest("(주)A창호", "2026-09-20", "n1"));

    // 두 번째 메시지: 정규화하면 같은 이름 → 기존 관계 매칭 (judge 단계에서 관계를 찾아 넘겨준다고 가정)
    const relationships = await getRelationships(db, workspaceId);
    expect(relationships).toHaveLength(1);

    await applyDecision(db, workspaceId, {
      analysisId: "n2",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호 ", kind: "document", title: "서류 전달", intent: "new" }),
      target: { relationship: { id: relationships[0].id }, task: "new" },
      confirmations: {},
    });

    const after = await getRelationships(db, workspaceId);
    expect(after).toHaveLength(1);
    expect(after[0].openTaskCount).toBe(2);
  });
});

describe("getProposalView — 저장된 제안 상세(ProposalDetailResponse)", () => {
  it("관계가 아직 미상인 defer 제안은 relationshipCandidates와 taskCandidates를 다시 계산해 보여준다", async () => {
    const { db, workspaceId } = await ws();
    await applyDecision(db, workspaceId, newTaskRequest("A창호", "2026-09-22", "n1"));

    // 업체 미상 + kind null + tentative 상태의 제안을 target 미확정으로 defer한다.
    const deferred = await applyDecision(db, workspaceId, {
      analysisId: "n2",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "defer",
      extracted: baseExtracted({ organization: null, kind: null, dueDate: "2026-09-24", tentative: true, intent: "change" }),
      target: { relationship: null, task: null },
      confirmations: {},
    });
    expect(deferred.decision).toBe("pending");
    expect(deferred.task).toBeNull();

    const view = await getProposalView(db, workspaceId, deferred.proposalId);
    expect(view).not.toBeNull();
    expect(view!.decision).toBe("pending");
    expect(view!.action).toBe("update");
    expect(view!.relationship).toBeNull();
    expect(view!.task).toBeNull();
    expect(view!.relationshipCandidates.map((r) => r.name)).toEqual(["A창호"]);
    expect(view!.taskCandidates).toHaveLength(1);
    expect(view!.taskCandidates[0].relationshipName).toBe("A창호");
    expect(view!.currentChanges).toEqual([]); // task가 없으므로 비교 대상 없음
  });

  it("이미 결정된 제안도 조회는 되며 decision 필드로 구분된다", async () => {
    const { db, workspaceId } = await ws();
    const applied = await applyDecision(db, workspaceId, newTaskRequest("A창호", "2026-09-22", "n1"));
    const view = await getProposalView(db, workspaceId, applied.proposalId);
    expect(view?.decision).toBe("applied");
  });
});
