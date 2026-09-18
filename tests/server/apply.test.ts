// apply.ts 통합 테스트 — 실제 테스트 DB에 트랜잭션으로 적용한다. 구현 계약 4/5장 / 기획서 15장.
import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";
import { ApplyError, applyDecision, decidePendingProposal, setTaskStatus, VersionConflictError } from "@/lib/server/apply";
import { getDashboard, getProposalView, getRelationshipDetail, getRelationships } from "@/lib/server/queries";
import type { DecideRequest } from "@/lib/types";
import { RECEIVED_0918, RECEIVED_0918_EARLY, RECEIVED_0919, baseExtracted, setupWorkspace, addWorkspace } from "./helpers";

const opened: Client[] = [];
afterEach(() => {
  for (const c of opened.splice(0)) c.close();
});

async function ws() {
  const s = await setupWorkspace();
  opened.push(s.db);
  return s;
}

describe("apply — T01 최초 요청 저장", () => {
  it("새 관계·새 업무를 만들고 미완료 목록에 반영한다", async () => {
    const { db, workspaceId } = await ws();
    const extracted = baseExtracted({
      senderName: "김과장",
      organization: "A창호",
      kind: "remittance",
      amount: 3_000_000,
      currency: "KRW",
      dueDate: "2026-09-20",
      intent: "new",
    });
    const req: DecideRequest = {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted,
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    };
    const res = await applyDecision(db, workspaceId, req);
    expect(res.decision).toBe("applied");
    expect(res.duplicate).toBe(false);
    expect(res.task?.amount).toBe(3_000_000);
    expect(res.task?.dueDate).toBe("2026-09-20");
    expect(res.task?.status).toBe("open");
    expect(res.task?.version).toBe(1);

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks).toHaveLength(1);
    expect(dash.openTasks[0].amount).toBe(3_000_000);
    expect(dash.doneTasks).toHaveLength(0);
  });
});

describe("apply — T02 다른 담당자의 마감 변경", () => {
  it("같은 업무 한 건이 갱신되고 금액은 유지되며 담당자가 늘어난다", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({
        senderName: "김과장",
        organization: "A창호",
        kind: "remittance",
        amount: 3_000_000,
        currency: "KRW",
        dueDate: "2026-09-20",
        intent: "new",
      }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationshipId = created.task!.relationshipId;
    const taskId = created.task!.id;

    const updated = await applyDecision(db, workspaceId, {
      analysisId: "a2",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "apply",
      extracted: baseExtracted({
        senderName: "이대리",
        organization: "A창호",
        kind: "remittance",
        amount: null,
        dueDate: "2026-09-22",
        intent: "change",
      }),
      target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 1 } },
      confirmations: {},
    });
    expect(updated.decision).toBe("applied");
    expect(updated.task?.dueDate).toBe("2026-09-22");
    expect(updated.task?.amount).toBe(3_000_000); // 금액은 유지
    expect(updated.task?.version).toBe(2);

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks).toHaveLength(1); // 업무 수 유지

    const relationships = await getRelationships(db, workspaceId);
    expect(relationships).toHaveLength(1);
    expect(relationships[0].contacts.sort()).toEqual(["김과장", "이대리"]);

    const detail = await getRelationshipDetail(db, workspaceId, relationshipId);
    expect(detail?.events.some((e) => e.eventType === "task_updated")).toBe(true);
  });
});

describe("apply — T04/T05 잠정 변경의 기존 유지 / 나중에 확인", () => {
  it("keep은 마감을 바꾸지 않고 change_kept 이벤트를 남긴다", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({
        organization: "A창호",
        kind: "remittance",
        amount: 3_000_000,
        currency: "KRW",
        dueDate: "2026-09-22",
        intent: "new",
      }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationshipId = created.task!.relationshipId;
    const taskId = created.task!.id;

    const kept = await applyDecision(db, workspaceId, {
      analysisId: "a2",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "keep",
      extracted: baseExtracted({ organization: "A창호", kind: null, dueDate: "2026-09-24", tentative: true, intent: "change" }),
      target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 1 } },
      confirmations: {},
    });
    expect(kept.decision).toBe("kept");
    expect(kept.task?.dueDate).toBe("2026-09-22");
    expect(kept.task?.version).toBe(1); // 버전도 그대로

    const detail = await getRelationshipDetail(db, workspaceId, relationshipId);
    expect(detail?.events.some((e) => e.eventType === "change_kept")).toBe(true);
    expect(detail?.tasks[0].dueDate).toBe("2026-09-22");
  });

  it("defer는 미결로 저장되고, 나중에 결정하면 그때 반영된다(재결정은 already_decided)", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({
        organization: "A창호",
        kind: "remittance",
        amount: 3_000_000,
        currency: "KRW",
        dueDate: "2026-09-22",
        intent: "new",
      }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationshipId = created.task!.relationshipId;
    const taskId = created.task!.id;

    const tentativeExtracted = baseExtracted({ organization: "A창호", kind: null, dueDate: "2026-09-24", tentative: true, intent: "change" });
    const deferred = await applyDecision(db, workspaceId, {
      analysisId: "a2",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "defer",
      extracted: tentativeExtracted,
      target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 1 } },
      confirmations: {},
    });
    expect(deferred.decision).toBe("pending");
    expect(deferred.task?.dueDate).toBe("2026-09-22"); // 현재 값 유지

    const dashBefore = await getDashboard(db, workspaceId);
    expect(dashBefore.pending).toHaveLength(1);
    expect(dashBefore.openTasks[0].dueDate).toBe("2026-09-22");

    // 저장된 제안 상세 조회 — ProposalDetailResponse
    const view = await getProposalView(db, workspaceId, deferred.proposalId);
    expect(view?.decision).toBe("pending");
    expect(view?.task?.dueDate).toBe("2026-09-22");
    expect(view?.currentChanges).toEqual([{ field: "dueDate", before: "2026-09-22", after: "2026-09-24" }]);

    const decided = await decidePendingProposal(db, workspaceId, deferred.proposalId, {
      decision: "apply",
      target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 1 } },
      confirmations: { tentativeAccepted: true },
    });
    expect(decided.decision).toBe("applied");
    expect(decided.task?.dueDate).toBe("2026-09-24");
    expect(decided.task?.version).toBe(2);

    const dashAfter = await getDashboard(db, workspaceId);
    expect(dashAfter.pending).toHaveLength(0);

    await expect(
      decidePendingProposal(db, workspaceId, deferred.proposalId, {
        decision: "keep",
        target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 2 } },
        confirmations: {},
      }),
    ).rejects.toMatchObject({ code: "already_decided", status: 409 });
  });
});

describe("apply — T06 업체 미상은 관계를 요구한다", () => {
  it("relationship이 없으면 apply는 relationship_required로 거부된다", async () => {
    const { db, workspaceId } = await ws();
    const extracted = baseExtracted({
      senderName: "이영호 대리",
      organization: null,
      kind: "remittance",
      amount: 1_000_000,
      currency: "KRW",
      dueDate: "2026-09-25",
      intent: "new",
    });
    await expect(
      applyDecision(db, workspaceId, {
        analysisId: "a1",
        index: 0,
        receivedAt: RECEIVED_0918,
        decision: "apply",
        extracted,
        target: { relationship: null, task: "new" },
        confirmations: {},
      }),
    ).rejects.toMatchObject({ code: "relationship_required", status: 400 });

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks).toHaveLength(0);
  });
});

describe("apply — T08/T09 다른 업체·다른 업무 종류", () => {
  it("다른 업체는 별도 관계·업무로, 같은 업체의 다른 종류는 별도 업무로 만든다", async () => {
    const { db, workspaceId } = await ws();
    await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    await applyDecision(db, workspaceId, {
      analysisId: "a2",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "B전자", kind: "remittance", amount: 1_000_000, currency: "KRW", dueDate: "2026-09-25", intent: "new" }),
      target: { relationship: { newName: "B전자" }, task: "new" },
      confirmations: {},
    });
    await applyDecision(db, workspaceId, {
      analysisId: "a3",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "document", title: "견적서 전달", intent: "new" }),
      target: { relationship: { id: (await getRelationships(db, workspaceId)).find((r) => r.name === "A창호")!.id }, task: "new" },
      confirmations: {},
    });

    const relationships = await getRelationships(db, workspaceId);
    expect(relationships).toHaveLength(2);
    const aChangho = relationships.find((r) => r.name === "A창호")!;
    expect(aChangho.openTaskCount).toBe(2);

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks).toHaveLength(3);
  });
});

describe("apply — T10 오래된 메시지는 자동 복원하지 않는다", () => {
  it("과거에 받은 메시지를 뒤늦게 적용해도 last_received_at은 뒤로 가지 않는다", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationshipId = created.task!.relationshipId;
    const taskId = created.task!.id;

    const applied22 = await applyDecision(db, workspaceId, {
      analysisId: "a2",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-22", intent: "change" }),
      target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 1 } },
      confirmations: {},
    });
    expect(applied22.task?.dueDate).toBe("2026-09-22");
    expect(applied22.task?.lastReceivedAt).toBe(RECEIVED_0919);

    // 뒤늦게 도착한 9/18 메시지(20일)를 강제로 적용해도 lastReceivedAt은 더 과거로 가지 않는다.
    const forced = await applyDecision(db, workspaceId, {
      analysisId: "a3",
      index: 0,
      receivedAt: RECEIVED_0918_EARLY,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-20", intent: "change" }),
      target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 2 } },
      confirmations: {},
    });
    expect(forced.task?.lastReceivedAt).toBe(RECEIVED_0919); // 과거로 되돌아가지 않는다
  });
});

describe("apply — T12 금액만 변경", () => {
  it("금액만 바뀌고 마감은 유지된다", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationshipId = created.task!.relationshipId;
    const taskId = created.task!.id;

    const updated = await applyDecision(db, workspaceId, {
      analysisId: "a2",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 4_000_000, currency: "KRW", intent: "change" }),
      target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 1 } },
      confirmations: {},
    });
    expect(updated.task?.amount).toBe(4_000_000);
    expect(updated.task?.dueDate).toBe("2026-09-20");
  });
});

describe("apply — T13 완료 후 되돌리기", () => {
  it("완료하면 완료 목록으로, 되돌리면 미완료로 복구되고 이력은 유지된다", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const taskId = created.task!.id;

    const done = await setTaskStatus(db, workspaceId, taskId, "done", 1);
    expect(done.status).toBe("done");
    expect(done.version).toBe(2);
    let dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks).toHaveLength(0);
    expect(dash.doneTasks).toHaveLength(1);

    const reopened = await setTaskStatus(db, workspaceId, taskId, "open", 2);
    expect(reopened.status).toBe("open");
    expect(reopened.version).toBe(3);
    dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks).toHaveLength(1);
    expect(dash.doneTasks).toHaveLength(0);

    const detail = await getRelationshipDetail(db, workspaceId, created.task!.relationshipId);
    const eventTypes = detail!.events.map((e) => e.eventType);
    expect(eventTypes).toContain("completed");
    expect(eventTypes).toContain("reopened");
  });
});

describe("apply — T14 중복 재전송", () => {
  it("같은 analysisId+index 재전송은 duplicate로만 응답하고 아무것도 바꾸지 않는다", async () => {
    const { db, workspaceId } = await ws();
    const req: DecideRequest = {
      analysisId: "dup-1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    };
    const first = await applyDecision(db, workspaceId, req);
    expect(first.duplicate).toBe(false);
    const second = await applyDecision(db, workspaceId, req);
    expect(second.duplicate).toBe(true);
    expect(second.proposalId).toBe(first.proposalId);
    expect(second.task?.id).toBe(first.task?.id);

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks).toHaveLength(1);
    const detail = await getRelationshipDetail(db, workspaceId, first.task!.relationshipId);
    expect(detail?.events.filter((e) => e.eventType === "task_created")).toHaveLength(1);
  });
});

describe("apply — T15 저장 오류는 기존 업무를 바꾸지 않는다", () => {
  it("존재하지 않는 업무 id는 not_found로 거부된다", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationshipId = created.task!.relationshipId;

    await expect(
      applyDecision(db, workspaceId, {
        analysisId: "a2",
        index: 0,
        receivedAt: RECEIVED_0919,
        decision: "apply",
        extracted: baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-22", intent: "change" }),
        target: { relationship: { id: relationshipId }, task: { id: "no-such-task", expectedVersion: 1 } },
        confirmations: {},
      }),
    ).rejects.toBeInstanceOf(ApplyError);

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks[0].dueDate).toBe("2026-09-20"); // 무변경
  });

  it("버전 충돌이면 409에 해당하는 오류로 거부되고 기존 값은 유지된다", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationshipId = created.task!.relationshipId;
    const taskId = created.task!.id;

    await expect(
      applyDecision(db, workspaceId, {
        analysisId: "a2",
        index: 0,
        receivedAt: RECEIVED_0919,
        decision: "apply",
        extracted: baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-22", intent: "change" }),
        target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 99 } },
        confirmations: {},
      }),
    ).rejects.toBeInstanceOf(VersionConflictError);

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks[0].dueDate).toBe("2026-09-20");
    expect(dash.openTasks[0].version).toBe(1);
  });

  it("날짜 해석이 불분명한데 확인하지 않으면 date_confirmation_required로 거부된다", async () => {
    const { db, workspaceId } = await ws();
    await expect(
      applyDecision(db, workspaceId, {
        analysisId: "a1",
        index: 0,
        receivedAt: RECEIVED_0918,
        decision: "apply",
        extracted: baseExtracted({
          organization: "A창호",
          kind: "remittance",
          amount: 3_000_000,
          currency: "KRW",
          dueDate: "2026-10-01",
          dueAmbiguous: true,
          intent: "new",
        }),
        target: { relationship: { newName: "A창호" }, task: "new" },
        confirmations: {},
      }),
    ).rejects.toMatchObject({ code: "date_confirmation_required", status: 400 });

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks).toHaveLength(0);
  });
});

describe("apply — T16 작업공간 격리", () => {
  it("다른 작업공간의 id로는 조회·수정할 수 없고 원래 작업공간 데이터는 그대로다", async () => {
    const { db, workspaceId: wsA } = await ws();
    const wsB = await addWorkspace(db);

    const created = await applyDecision(db, wsA, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationshipId = created.task!.relationshipId;
    const taskId = created.task!.id;

    expect(await getRelationshipDetail(db, wsB, relationshipId)).toBeNull();
    await expect(setTaskStatus(db, wsB, taskId, "done", 1)).rejects.toMatchObject({ code: "not_found" });

    const dashA = await getDashboard(db, wsA);
    expect(dashA.openTasks).toHaveLength(1);
    expect(dashA.openTasks[0].status).toBe("open");
    const dashB = await getDashboard(db, wsB);
    expect(dashB.openTasks).toHaveLength(0);
  });
});

describe("apply — T18 작업공간 삭제", () => {
  it("작업공간을 지우면 관계·담당자·업무·제안·이력이 모두 사라진다", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({
        senderName: "김과장",
        organization: "A창호",
        kind: "remittance",
        amount: 3_000_000,
        currency: "KRW",
        dueDate: "2026-09-20",
        intent: "new",
      }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    await applyDecision(db, workspaceId, {
      analysisId: "a2",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "defer",
      extracted: baseExtracted({ organization: "A창호", kind: null, dueDate: "2026-09-24", tentative: true, intent: "change" }),
      target: { relationship: { id: created.task!.relationshipId }, task: { id: created.task!.id, expectedVersion: 1 } },
      confirmations: {},
    });

    const { deleteWorkspaceCascade } = await import("@/lib/server/repo/workspaces");
    await deleteWorkspaceCascade(db, workspaceId);

    const tables = ["relationships", "contacts", "tasks", "proposals", "events", "workspaces"] as const;
    for (const t of tables) {
      const rs = await db.execute({ sql: `SELECT COUNT(*) AS c FROM ${t} WHERE ${t === "workspaces" ? "id" : "workspace_id"} = ?`, args: [workspaceId] });
      expect(Number(rs.rows[0]!.c)).toBe(0);
    }
  });
});

describe("apply — T19 완료 업무 후속 변경", () => {
  it("완료된 업무를 강제로 apply해도 status는 done을 유지한다", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationshipId = created.task!.relationshipId;
    const taskId = created.task!.id;

    const done = await setTaskStatus(db, workspaceId, taskId, "done", 1);
    expect(done.status).toBe("done");

    const applied = await applyDecision(db, workspaceId, {
      analysisId: "a2",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_500_000, currency: "KRW", intent: "change" }),
      target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 2 } },
      confirmations: {},
    });
    expect(applied.task?.amount).toBe(3_500_000);
    expect(applied.task?.status).toBe("done"); // 자동 재오픈 없음
  });
});

describe("apply — target.task='new'는 draft의 action과 무관하게 항상 새 업무를 만든다", () => {
  it("kind가 null이면 'other'로, title이 없으면 기본 제목으로 새 업무를 만든다", async () => {
    const { db, workspaceId } = await ws();
    const res = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: null, title: null, intent: "change" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    expect(res.decision).toBe("applied");
    expect(res.task?.kind).toBe("other");
    expect(res.task?.title).toBe("업무");
    expect(res.task?.status).toBe("open");
  });
});

describe("apply — 선택한 업무가 선택한 관계 소속이 아니면 거부한다", () => {
  it("relationship과 task 소속이 다르면 invalid_request로 거부된다", async () => {
    const { db, workspaceId } = await ws();
    const a = await applyDecision(db, workspaceId, {
      analysisId: "a1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const b = await applyDecision(db, workspaceId, {
      analysisId: "a2",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "B전자", kind: "remittance", amount: 1_000_000, currency: "KRW", dueDate: "2026-09-25", intent: "new" }),
      target: { relationship: { newName: "B전자" }, task: "new" },
      confirmations: {},
    });

    await expect(
      applyDecision(db, workspaceId, {
        analysisId: "a3",
        index: 0,
        receivedAt: RECEIVED_0919,
        decision: "apply",
        extracted: baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-22", intent: "change" }),
        target: { relationship: { id: a.task!.relationshipId }, task: { id: b.task!.id, expectedVersion: 1 } },
        confirmations: {},
      }),
    ).rejects.toMatchObject({ code: "invalid_request", status: 400 });
  });
});

describe("apply — 동시 요청 처리 (쓰기 트랜잭션 직렬화)", () => {
  it("analysisId가 다른 두 요청을 동시에 보내면 둘 다 성공한다", async () => {
    const { db, workspaceId } = await ws();
    const reqA: DecideRequest = {
      analysisId: "c1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    };
    const reqB: DecideRequest = {
      analysisId: "c2",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "B전자", kind: "remittance", amount: 1_000_000, currency: "KRW", dueDate: "2026-09-25", intent: "new" }),
      target: { relationship: { newName: "B전자" }, task: "new" },
      confirmations: {},
    };

    const [resA, resB] = await Promise.all([applyDecision(db, workspaceId, reqA), applyDecision(db, workspaceId, reqB)]);
    expect(resA.decision).toBe("applied");
    expect(resB.decision).toBe("applied");
    expect(resA.duplicate).toBe(false);
    expect(resB.duplicate).toBe(false);

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks).toHaveLength(2);
  });

  it("같은 analysisId+index를 동시에 보내면 하나만 적용되고 나머지는 duplicate다", async () => {
    const { db, workspaceId } = await ws();
    const req: DecideRequest = {
      analysisId: "c3",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    };

    const [res1, res2] = await Promise.all([applyDecision(db, workspaceId, req), applyDecision(db, workspaceId, req)]);
    const results = [res1, res2];
    expect(results.filter((r) => r.duplicate)).toHaveLength(1);
    expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
    expect(res1.proposalId).toBe(res2.proposalId);
    expect(res1.task?.id).toBe(res2.task?.id);

    const dash = await getDashboard(db, workspaceId);
    expect(dash.openTasks).toHaveLength(1);
    const detail = await getRelationshipDetail(db, workspaceId, res1.task!.relationshipId);
    expect(detail?.events.filter((e) => e.eventType === "task_created")).toHaveLength(1);
  });
});

describe("apply — 같은 이름의 새 관계는 중복 생성하지 않는다", () => {
  it("서로 다른 analysisId로 같은 newName을 두 번 적용해도 관계는 하나다", async () => {
    const { db, workspaceId } = await ws();
    await applyDecision(db, workspaceId, {
      analysisId: "d1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    await applyDecision(db, workspaceId, {
      analysisId: "d2",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "document", title: "서류", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationships = await getRelationships(db, workspaceId);
    expect(relationships).toHaveLength(1);
    expect(relationships[0].openTaskCount).toBe(2);
  });
});

describe("apply — 잠정 변경은 확인 없이 반영되지 않는다 (정책 결정)", () => {
  it("tentative=true인 기존 업무 변경은 tentativeAccepted 없이는 거부되고, 있으면 반영된다", async () => {
    const { db, workspaceId } = await ws();
    const created = await applyDecision(db, workspaceId, {
      analysisId: "e1",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, currency: "KRW", dueDate: "2026-09-20", intent: "new" }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    const relationshipId = created.task!.relationshipId;
    const taskId = created.task!.id;

    await expect(
      applyDecision(db, workspaceId, {
        analysisId: "e2",
        index: 0,
        receivedAt: RECEIVED_0919,
        decision: "apply",
        extracted: baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-24", tentative: true, intent: "change" }),
        target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 1 } },
        confirmations: {},
      }),
    ).rejects.toMatchObject({ code: "tentative_confirmation_required", status: 400 });

    const dashBefore = await getDashboard(db, workspaceId);
    expect(dashBefore.openTasks[0].dueDate).toBe("2026-09-20"); // 무변경

    const applied = await applyDecision(db, workspaceId, {
      analysisId: "e3",
      index: 0,
      receivedAt: RECEIVED_0919,
      decision: "apply",
      extracted: baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-24", tentative: true, intent: "change" }),
      target: { relationship: { id: relationshipId }, task: { id: taskId, expectedVersion: 1 } },
      confirmations: { tentativeAccepted: true },
    });
    expect(applied.task?.dueDate).toBe("2026-09-24");
  });

  it("잠정 표현이 있어도 새 업무 생성(target.task='new')은 막지 않는다", async () => {
    const { db, workspaceId } = await ws();
    const res = await applyDecision(db, workspaceId, {
      analysisId: "e4",
      index: 0,
      receivedAt: RECEIVED_0918,
      decision: "apply",
      extracted: baseExtracted({
        organization: "A창호",
        kind: "remittance",
        amount: 1_000_000,
        currency: "KRW",
        dueDate: "2026-09-20",
        tentative: true,
        intent: "new",
      }),
      target: { relationship: { newName: "A창호" }, task: "new" },
      confirmations: {},
    });
    expect(res.decision).toBe("applied");
  });
});
