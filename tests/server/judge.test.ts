// judge() 순수 함수 단위 테스트 — 구현 계약 3장 / 기획서 15장 수용 시나리오.
import { describe, expect, it } from "vitest";
import { judge, normalizeRelationshipName } from "@/lib/server/judge";
import type { RelationshipRef, TaskSnapshot } from "@/lib/types";
import { RECEIVED_0918, RECEIVED_0918_EARLY, RECEIVED_0919, baseExtracted } from "./helpers";

const A_CHANGHO: RelationshipRef = { id: "rel-a", name: "A창호", contacts: ["김과장"] };

function taskFixture(overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    id: "task-1",
    relationshipId: "rel-a",
    relationshipName: "A창호",
    kind: "remittance",
    title: "송금",
    amount: 3_000_000,
    currency: "KRW",
    dueDate: "2026-09-20",
    status: "open",
    version: 1,
    lastReceivedAt: RECEIVED_0918,
    ...overrides,
  };
}

describe("normalizeRelationshipName", () => {
  it("괄호·회사표기·공백을 지우고 소문자로 비교하면 같은 업체로 본다", () => {
    expect(normalizeRelationshipName("(주)A창호")).toBe(normalizeRelationshipName("A창호 "));
    expect(normalizeRelationshipName("A창호 주식회사")).toBe(normalizeRelationshipName("㈜A창호"));
  });

  it("유사하지만 다른 업체명은 다르게 취급한다", () => {
    expect(normalizeRelationshipName("A창호")).not.toBe(normalizeRelationshipName("A창호건설"));
  });
});

describe("judge — T01 최초 요청", () => {
  it("관계·업무가 없으면 새 관계·새 업무를 제안한다", () => {
    const extracted = baseExtracted({
      senderName: "김과장",
      organization: "A창호",
      kind: "remittance",
      amount: 3_000_000,
      currency: "KRW",
      dueDate: "2026-09-20",
      intent: "new",
    });
    const draft = judge(extracted, RECEIVED_0918, { relationships: [], tasks: [] }, 0);
    expect(draft.action).toBe("create");
    expect(draft.judgment).toBe("confirmed");
    expect(draft.suggestedRelationshipName).toBe("A창호");
    expect(draft.newTask).toEqual({
      kind: "remittance",
      title: "송금",
      amount: 3_000_000,
      currency: "KRW",
      dueDate: "2026-09-20",
    });
  });
});

describe("judge — T02 다른 담당자의 마감 변경", () => {
  it("같은 업체·같은 종류 업무가 하나면 변경안(update)으로 제안한다", () => {
    const task = taskFixture();
    const extracted = baseExtracted({
      senderName: "이대리",
      organization: "A창호",
      kind: "remittance",
      amount: null,
      dueDate: "2026-09-22",
      intent: "change",
    });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.action).toBe("update");
    expect(draft.judgment).toBe("confirmed");
    expect(draft.task?.id).toBe("task-1");
    expect(draft.changes).toEqual([{ field: "dueDate", before: "2026-09-20", after: "2026-09-22" }]);
  });
});

describe("judge — T03/T03b 잠정 변경", () => {
  it("T03: 업체가 확인되면 kind=null·intent=change도 미완료 업무를 후보로 변경 가능성을 제시한다", () => {
    const task = taskFixture({ dueDate: "2026-09-22", version: 2 });
    const extracted = baseExtracted({
      organization: "A창호",
      kind: null,
      dueDate: "2026-09-24",
      dueAmbiguous: false,
      tentative: true,
      intent: "change",
    });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.action).toBe("update");
    expect(draft.judgment).toBe("possible");
    expect(draft.reasonCodes).toContain("tentative_expression");
    expect(draft.task?.dueDate).toBe("2026-09-22"); // 제안일 뿐, 현재 값은 그대로
    expect(draft.changes).toEqual([{ field: "dueDate", before: "2026-09-22", after: "2026-09-24" }]);
  });

  it("T03b: 업체가 확인되지 않으면 needs_check(관계 확인)이며 tentative_expression도 함께 담는다", () => {
    const task = taskFixture({ dueDate: "2026-09-22", version: 2 });
    const extracted = baseExtracted({
      organization: null,
      kind: null,
      dueDate: "2026-09-24",
      tentative: true,
      intent: "change",
    });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("relationship_unknown");
    expect(draft.reasonCodes).toContain("tentative_expression");
    expect(draft.relationship).toBeNull();
    expect(draft.task).toBeNull();
    expect(draft.relationshipCandidates[0]?.name).toBe("A창호"); // 관계가 1개뿐이므로 후보 맨 앞
    expect(draft.action).toBe("update");
    // kind가 null이므로 관계 후보의 "미완료 업무 전체"가 taskCandidates로 넘어온다.
    expect(draft.taskCandidates.map((t) => t.id)).toEqual(["task-1"]);
    // 관계가 미확정이므로 multiple_task_candidates는 붙지 않는다.
    expect(draft.reasonCodes).not.toContain("multiple_task_candidates");
  });
});

describe("judge — T04 기존 유지 / T05 나중에 확인은 판단에 영향 없음", () => {
  it("judge 자체는 순수 함수라 여러 번 호출해도 같은 결과를 낸다(부작용 없음)", () => {
    const task = taskFixture();
    const extracted = baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-22", intent: "change" });
    const d1 = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    const d2 = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(d1).toEqual(d2);
  });
});

describe("judge — T06 업체 미상", () => {
  it("업체가 없고 새 요청이면 관계를 자동 병합하지 않고 create로 두되 관계 선택을 요구한다", () => {
    const extracted = baseExtracted({
      senderName: "이영호 대리",
      organization: null,
      kind: "remittance",
      amount: 1_000_000,
      dueDate: "2026-09-25",
      intent: "new",
    });
    const draft = judge(extracted, RECEIVED_0918, { relationships: [A_CHANGHO], tasks: [] }, 0);
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("relationship_unknown");
    expect(draft.relationship).toBeNull();
    expect(draft.action).toBe("create");
    expect(draft.relationshipCandidates.map((r) => r.name)).toEqual(["A창호"]);
    // intent가 new이므로 관계별 업무 후보를 만들지 않는다.
    expect(draft.taskCandidates).toEqual([]);
  });
});

describe("judge — T07 같은 업체 복수 후보", () => {
  it("금액 없이는 여러 후보 중 선택을 요구하고, 금액을 명시하면 하나로 좁힌다", () => {
    const taskA = taskFixture({ id: "task-a", amount: 3_000_000, dueDate: "2026-09-20" });
    const taskB = taskFixture({ id: "task-b", amount: 5_000_000, dueDate: "2026-09-21" });
    const extractedNoAmount = baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-22", intent: "change" });
    const draft1 = judge(extractedNoAmount, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [taskA, taskB] }, 0);
    expect(draft1.judgment).toBe("needs_check");
    expect(draft1.reasonCodes).toContain("multiple_task_candidates");
    expect(draft1.taskCandidates.map((t) => t.id).sort()).toEqual(["task-a", "task-b"]);
    expect(draft1.task).toBeNull();

    const extractedWithAmount = baseExtracted({
      organization: "A창호",
      kind: "remittance",
      amount: 5_000_000,
      currency: "KRW",
      dueDate: "2026-09-22",
      intent: "change",
    });
    const draft2 = judge(extractedWithAmount, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [taskA, taskB] }, 0);
    expect(draft2.action).toBe("update");
    expect(draft2.task?.id).toBe("task-b");
    expect(draft2.judgment).toBe("confirmed");
  });
});

describe("judge — T08 다른 업체", () => {
  it("업체명이 다르면 새 관계로 제안한다(정확 일치만 병합)", () => {
    const extracted = baseExtracted({
      organization: "B전자",
      kind: "remittance",
      amount: 1_000_000,
      currency: "KRW",
      dueDate: "2026-09-25",
      intent: "new",
    });
    const draft = judge(extracted, RECEIVED_0918, { relationships: [A_CHANGHO], tasks: [] }, 0);
    expect(draft.relationship).toBeNull();
    expect(draft.suggestedRelationshipName).toBe("B전자");
    expect(draft.reasonCodes).toContain("relationship_new");
    expect(draft.judgment).toBe("confirmed");
    expect(draft.action).toBe("create");
  });
});

describe("judge — T09 같은 업체 다른 업무 종류", () => {
  it("같은 업체라도 kind가 다르면 별도 업무로 제안한다", () => {
    const task = taskFixture(); // remittance
    const extracted = baseExtracted({ organization: "A창호", kind: "document", title: "견적서 전달", intent: "new" });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.action).toBe("create");
    expect(draft.newTask?.kind).toBe("document");
  });
});

describe("judge — T10 오래된 메시지", () => {
  it("기존 적용 메시지보다 과거에 받은 메시지는 older_message로 확인을 요구한다", () => {
    const task = taskFixture({ dueDate: "2026-09-22", lastReceivedAt: RECEIVED_0919, version: 2 });
    const extracted = baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-20", intent: "change" });
    const draft = judge(extracted, RECEIVED_0918_EARLY, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("older_message");
    expect(draft.task?.dueDate).toBe("2026-09-22"); // 제안일 뿐 현재 값은 그대로
  });
});

describe("judge — T12 금액만 변경", () => {
  it("금액만 바뀌면 changes에 amount만 담긴다", () => {
    const task = taskFixture();
    const extracted = baseExtracted({ organization: "A창호", kind: "remittance", amount: 4_000_000, intent: "change" });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.changes).toEqual([{ field: "amount", before: 3_000_000, after: 4_000_000 }]);
  });
});

describe("judge — T19 완료 업무 후속 변경", () => {
  it("완료된 업무가 후보면 task_completed로 확인을 요구한다", () => {
    const task = taskFixture({ status: "done" });
    const extracted = baseExtracted({ organization: "A창호", kind: "remittance", dueDate: "2026-09-25", intent: "change" });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("task_completed");
  });

  it("금액으로 완료 업무를 가리키면 금액이 다른 미완료 업무에 연결하지 않는다 (잘못된 병합 방지)", () => {
    const doneTask = taskFixture({ id: "task-done", amount: 3_500_000, dueDate: "2026-09-22", status: "done" });
    const openTask = taskFixture({ id: "task-open", amount: 5_000_000, dueDate: "2026-09-30" });
    const extracted = baseExtracted({
      organization: "A창호",
      kind: "remittance",
      amount: 3_500_000,
      dueDate: "2026-09-29",
      intent: "change",
    });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [doneTask, openTask] }, 0);
    expect(draft.task?.id).toBe("task-done");
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("task_completed");
  });
});

describe("judge — 기획서 6.2 보강 (intent 오분류 방어)", () => {
  it("AI가 intent를 new로 잘못 추정해도 후보가 하나뿐이면 변경안(update)으로 본다", () => {
    const task = taskFixture(); // amount 3,000,000 / dueDate 2026-09-20 / open
    const extracted = baseExtracted({
      senderName: "이대리",
      organization: "A창호",
      kind: "remittance",
      amount: null,
      dueDate: "2026-09-22",
      intent: "new", // AI 오분류
    });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.action).toBe("update");
    expect(draft.task?.id).toBe("task-1");
    expect(draft.judgment).toBe("confirmed");
    expect(draft.changes).toEqual([{ field: "dueDate", before: "2026-09-20", after: "2026-09-22" }]);
  });

  it("intent=new + 같은 금액의 기존 후보가 있는데 마감 등이 다르면 intent_unclear로 확인을 요구한다", () => {
    const task = taskFixture(); // amount 3,000,000 / dueDate 2026-09-20
    const extracted = baseExtracted({
      organization: "A창호",
      kind: "remittance",
      amount: 3_000_000,
      dueDate: "2026-09-25",
      intent: "new",
    });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.action).toBe("update");
    expect(draft.task?.id).toBe("task-1");
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("intent_unclear");
  });

  it("intent=new + 같은 금액 후보가 없으면 새 업무로 만든다", () => {
    const task = taskFixture(); // amount 3,000,000
    const extracted = baseExtracted({
      organization: "A창호",
      kind: "remittance",
      amount: 5_000_000,
      dueDate: "2026-09-25",
      intent: "new",
    });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.action).toBe("create");
    expect(draft.newTask?.amount).toBe(5_000_000);
  });
});

describe("judge — 종류 불일치 대비 (실제 모델 오분류 대응)", () => {
  it("change 의도인데 같은 kind 후보가 없고 다른 kind의 미완료 업무가 하나면 intent_unclear로 확인을 요구한다", () => {
    // 예: "기존 일정 확인해볼게요"를 AI가 kind=schedule로 잘못 뽑았지만 실제 미완료 업무는 remittance뿐인 경우.
    const task = taskFixture({ kind: "remittance" });
    const extracted = baseExtracted({ organization: "A창호", kind: "schedule", dueDate: "2026-09-25", intent: "change" });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.action).toBe("update");
    expect(draft.task?.id).toBe("task-1");
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("intent_unclear");
  });

  it("change 의도인데 같은 kind 후보가 없고 다른 kind의 미완료 업무가 여럿이면 multiple_task_candidates다", () => {
    const taskA = taskFixture({ id: "task-a", kind: "remittance" });
    const taskB = taskFixture({ id: "task-b", kind: "document", amount: null, currency: null });
    const extracted = baseExtracted({ organization: "A창호", kind: "schedule", dueDate: "2026-09-25", intent: "unclear" });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [taskA, taskB] }, 0);
    expect(draft.action).toBe("update");
    expect(draft.task).toBeNull();
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("multiple_task_candidates");
    expect(draft.taskCandidates.map((t) => t.id).sort()).toEqual(["task-a", "task-b"]);
  });

  it("intent=new이면 종류 불일치 폴백을 적용하지 않고 그대로 새 업무를 만든다", () => {
    const task = taskFixture({ kind: "remittance" });
    const extracted = baseExtracted({ organization: "A창호", kind: "schedule", dueDate: "2026-09-25", intent: "new" });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.action).toBe("create");
    expect(draft.newTask?.kind).toBe("schedule");
  });
});

describe("judge — 추가 규칙", () => {
  it("실행 요청 없음(kind=null, intent=none)은 action none이다", () => {
    const extracted = baseExtracted({ intent: "none" });
    const draft = judge(extracted, RECEIVED_0918, { relationships: [], tasks: [] }, 0);
    expect(draft.action).toBe("none");
    expect(draft.reasonCodes).toEqual(["no_actionable_request"]);
  });

  it("kind=null, intent=unclear도 실행 요청 없음으로 본다", () => {
    const extracted = baseExtracted({ intent: "unclear" });
    const draft = judge(extracted, RECEIVED_0918, { relationships: [], tasks: [] }, 0);
    expect(draft.action).toBe("none");
  });

  it("변경 의도인데 값이 모두 같으면 no_changes로 확인을 요구한다", () => {
    const task = taskFixture();
    const extracted = baseExtracted({ organization: "A창호", kind: "remittance", amount: 3_000_000, dueDate: "2026-09-20", intent: "change" });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("no_changes");
    expect(draft.changes).toEqual([]);
  });

  it("취소·철회 표현은 자동 삭제하지 않고 확인을 요구한다", () => {
    const task = taskFixture();
    const extracted = baseExtracted({ organization: "A창호", kind: "remittance", cancellation: true, intent: "change", dueDate: "2026-09-25" });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("cancellation_or_removal");
  });

  it("금액은 있는데 통화가 없으면 currency_unclear로 확인을 요구한다", () => {
    const extracted = baseExtracted({ organization: "A창호", kind: "remittance", amount: 50_000, currency: null, intent: "new" });
    const draft = judge(extracted, RECEIVED_0918, { relationships: [A_CHANGHO], tasks: [] }, 0);
    expect(draft.reasonCodes).toContain("currency_unclear");
  });

  it("동일 kind·금액·마감의 미완료 업무가 있는 새 요청은 중복 가능성으로 확인을 요구한다", () => {
    const task = taskFixture();
    const extracted = baseExtracted({
      organization: "A창호",
      kind: "remittance",
      amount: 3_000_000,
      dueDate: "2026-09-20",
      intent: "new",
    });
    const draft = judge(extracted, RECEIVED_0919, { relationships: [A_CHANGHO], tasks: [task] }, 0);
    expect(draft.judgment).toBe("needs_check");
    expect(draft.reasonCodes).toContain("no_changes");
    expect(draft.task?.id).toBe("task-1");
  });
});
