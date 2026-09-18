// 서버 판단 규칙 — 순수 함수. 기획서 9장 / 구현 계약 3장.
// DB에 접근하지 않는다. 관계·업무 스냅샷은 호출자가 조회해 context로 넘긴다.
import type {
  ExtractedRequest,
  FieldChange,
  IsoDateTime,
  Judgment,
  ProposalDraft,
  ReasonCode,
  RelationshipRef,
  TaskKind,
  TaskSnapshot,
} from "@/lib/types";

export interface JudgeContext {
  relationships: RelationshipRef[];
  tasks: TaskSnapshot[];
}

const NEEDS_CHECK_CODES = new Set<ReasonCode>([
  "relationship_unknown",
  "multiple_task_candidates",
  "date_ambiguous",
  "older_message",
  "task_completed",
  "no_changes",
  "intent_unclear",
  "currency_unclear",
  "cancellation_or_removal",
]);

/** 업체명 정규화: 공백 제거·소문자화·(주)/주식회사/㈜ 제거. 유사명 자동 병합에는 쓰지 않는다(정확 일치만). */
export function normalizeRelationshipName(name: string): string {
  return name
    .replace(/\(주\)/g, "")
    .replace(/주식회사/g, "")
    .replace(/㈜/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

const KIND_LABEL: Record<TaskKind, string> = {
  remittance: "송금",
  document: "자료 전달",
  schedule: "일정",
  other: "업무",
};

export function kindLabelOf(kind: TaskKind | null): string {
  return kind ? KIND_LABEL[kind] : "요청";
}

export function defaultTitleFor(kind: TaskKind): string {
  return KIND_LABEL[kind];
}

/**
 * extracted와 기존 업무를 비교해 실제로 바뀐 필드만 뽑는다. null 값은 "변경 없음"으로 취급한다.
 * title은 비교 대상에서 제외한다 — AI가 매번 다른 표현으로 제목을 뽑아 오탐을 만들기 때문에,
 * 후속 메시지로 자동 비교·변경하는 필드는 dueDate·amount·currency로 한정한다.
 */
export function computeFieldChanges(extracted: ExtractedRequest, task: TaskSnapshot): FieldChange[] {
  const changes: FieldChange[] = [];
  if (extracted.dueDate !== null && extracted.dueDate !== task.dueDate) {
    changes.push({ field: "dueDate", before: task.dueDate, after: extracted.dueDate });
  }
  if (extracted.amount !== null && extracted.amount !== task.amount) {
    changes.push({ field: "amount", before: task.amount, after: extracted.amount });
  }
  if (extracted.currency !== null && extracted.currency !== task.currency) {
    changes.push({ field: "currency", before: task.currency, after: extracted.currency });
  }
  return changes;
}

function buildNewTask(extracted: ExtractedRequest): ProposalDraft["newTask"] {
  const kind = extracted.kind as TaskKind;
  return {
    kind,
    title: extracted.title ?? defaultTitleFor(kind),
    amount: extracted.amount,
    currency: extracted.currency,
    dueDate: extracted.dueDate,
  };
}

function isOlderMessage(receivedAt: IsoDateTime, task: TaskSnapshot): boolean {
  if (!task.lastReceivedAt) return false;
  const a = Date.parse(receivedAt);
  const b = Date.parse(task.lastReceivedAt);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return a < b;
}

function buildReasonText(params: {
  action: ProposalDraft["action"];
  reasonCodes: ReasonCode[];
  extracted: ExtractedRequest;
  relationshipStatus: "matched" | "new" | "unknown";
}): string {
  const { action, reasonCodes, extracted, relationshipStatus } = params;
  const has = (c: ReasonCode) => reasonCodes.includes(c);
  const kindLabel = kindLabelOf(extracted.kind);
  const parts: string[] = [];

  if (has("no_actionable_request")) {
    return "실행할 요청을 찾지 못해 업무를 만들지 않습니다.";
  }
  if (has("relationship_unknown")) {
    parts.push("업체가 확인되지 않아 연결할 관계를 선택해야 해요.");
  } else if (has("multiple_task_candidates")) {
    parts.push(`같은 업체에 ${kindLabel} 후보 업무가 여러 건이라 선택이 필요해요.`);
  } else if (has("task_completed")) {
    parts.push("이미 완료된 업무에 대한 요청이라 확인이 필요해요.");
  } else if (has("older_message")) {
    parts.push("이미 반영된 내용보다 이전에 받은 메시지라 확인이 필요해요.");
  } else if (has("cancellation_or_removal")) {
    parts.push("취소·철회로 보이는 표현이라 자동으로 반영하지 않고 확인이 필요해요.");
  } else if (has("date_ambiguous")) {
    parts.push("마감 날짜 해석이 분명하지 않아 확인이 필요해요.");
  } else if (has("currency_unclear")) {
    parts.push("통화가 분명하지 않아 확인이 필요해요.");
  } else if (has("no_changes")) {
    parts.push("기존 값과 같아 중복 요청일 수 있어 확인이 필요해요.");
  } else if (has("intent_unclear")) {
    parts.push("새 요청인지 기존 업무의 변경인지 확인이 필요해요.");
  } else if (action === "create") {
    parts.push(
      relationshipStatus === "new"
        ? `새로운 업체의 ${kindLabel} 요청이라 관계를 새로 만듭니다.`
        : `같은 업체의 ${kindLabel} 요청이며, 새 업무로 등록합니다.`,
    );
  } else if (action === "update") {
    parts.push(`같은 업체의 ${kindLabel} 요청이며, 기존 후보가 한 건입니다.`);
  } else {
    parts.push("실행할 요청을 찾지 못했습니다.");
  }

  if (extracted.tentative) {
    parts.push("잠정적인 표현이 있어 현재 마감을 유지합니다.");
  }
  return parts.join(" ");
}

/** 요청 하나에 대한 제안 초안을 만든다. DB 접근 없는 순수 함수. */
export function judge(
  extracted: ExtractedRequest,
  receivedAt: IsoDateTime,
  context: JudgeContext,
  index: number,
): ProposalDraft {
  const reasonCodes: ReasonCode[] = [];

  // 1. 실행 요청 없음: kind=null & intent(new/unclear/none), 또는 intent === "none"
  const isNoAction = extracted.intent === "none" || (extracted.kind === null && extracted.intent !== "change");
  if (isNoAction) {
    return {
      index,
      extracted,
      action: "none",
      judgment: "confirmed",
      reasonCodes: ["no_actionable_request"],
      reasonText: buildReasonText({ action: "none", reasonCodes: ["no_actionable_request"], extracted, relationshipStatus: "unknown" }),
      relationship: null,
      relationshipCandidates: [],
      suggestedRelationshipName: null,
      task: null,
      taskCandidates: [],
      changes: [],
      newTask: null,
    };
  }

  // 2. 관계 결정
  let relationship: RelationshipRef | null = null;
  let relationshipCandidates: RelationshipRef[] = [];
  let suggestedRelationshipName: string | null = null;
  let relationshipStatus: "matched" | "new" | "unknown";

  if (extracted.organization) {
    const norm = normalizeRelationshipName(extracted.organization);
    const matches = context.relationships.filter((r) => normalizeRelationshipName(r.name) === norm);
    if (matches.length === 1) {
      relationship = matches[0];
      relationshipStatus = "matched";
    } else if (matches.length === 0) {
      relationshipStatus = "new";
      suggestedRelationshipName = extracted.organization;
      reasonCodes.push("relationship_new");
    } else {
      relationshipStatus = "unknown";
      relationshipCandidates = matches;
      reasonCodes.push("relationship_unknown");
    }
  } else {
    relationshipStatus = "unknown";
    reasonCodes.push("relationship_unknown");
    const bySender = extracted.senderName
      ? context.relationships.filter((r) => r.contacts.includes(extracted.senderName as string))
      : [];
    const bySenderIds = new Set(bySender.map((r) => r.id));
    const rest = context.relationships.filter((r) => !bySenderIds.has(r.id));
    if (bySender.length > 0) {
      relationshipCandidates = [...bySender, ...rest];
    } else {
      // 데모 편의: 작업공간에 관계가 정확히 1개뿐이면 자동 연결하지 않되 후보 맨 앞에 둔다.
      relationshipCandidates = [...context.relationships];
    }
  }

  // 3. 업무 결정
  const wantsCreate = extracted.intent === "new";
  let action: ProposalDraft["action"];
  let task: TaskSnapshot | null = null;
  let taskCandidates: TaskSnapshot[] = [];
  let changes: FieldChange[] = [];
  let newTask: ProposalDraft["newTask"] = null;

  if (relationshipStatus === "matched" && relationship) {
    const rel = relationship;
    // 후보 C: 같은 관계 + 같은 kind(널이면 kind 무관). 미완료가 있으면 미완료만(완료는 T19용으로 폴백).
    const kindMatches = (t: TaskSnapshot) => (extracted.kind !== null ? t.kind === extracted.kind : true);
    let candidates = context.tasks.filter((t) => t.relationshipId === rel.id && kindMatches(t));
    const openCandidates = candidates.filter((t) => t.status === "open");
    if (openCandidates.length > 0) candidates = openCandidates;

    // 종류 불일치 대비: change/unclear인데 같은 kind 후보가 없고, 같은 관계에 다른 kind의
    // 미완료 업무가 있으면 그것을 후보로 삼는다(자동 적용 없음, intent_unclear로 확인 요구).
    let kindMismatchFallback = false;
    if (!wantsCreate && extracted.kind !== null && candidates.length === 0) {
      const otherKindOpen = context.tasks.filter((t) => t.relationshipId === rel.id && t.status === "open");
      if (otherKindOpen.length > 0) {
        candidates = otherKindOpen;
        kindMismatchFallback = true;
      }
    }

    const sameAmountCandidates = extracted.amount !== null ? candidates.filter((t) => t.amount === extracted.amount) : [];

    if (wantsCreate) {
      if (extracted.amount === null) {
        // 기획서 6.2: AI가 new로 추정해도 후보가 하나뿐이면 변경안으로 본다.
        if (candidates.length === 0) {
          action = "create";
          newTask = buildNewTask(extracted);
        } else if (candidates.length === 1) {
          action = "update";
          task = candidates[0];
          changes = computeFieldChanges(extracted, task);
          if (changes.length === 0) reasonCodes.push("no_changes");
        } else {
          action = "update";
          taskCandidates = candidates;
          reasonCodes.push("multiple_task_candidates");
        }
      } else if (sameAmountCandidates.length === 0) {
        action = "create";
        newTask = buildNewTask(extracted);
      } else if (sameAmountCandidates.length === 1) {
        const cand = sameAmountCandidates[0];
        const diff = computeFieldChanges(extracted, cand);
        action = "update";
        task = cand;
        changes = diff;
        if (diff.length === 0) {
          reasonCodes.push("no_changes");
        } else {
          reasonCodes.push("intent_unclear");
        }
      } else {
        action = "update";
        taskCandidates = sameAmountCandidates;
        reasonCodes.push("multiple_task_candidates");
      }
    } else {
      // change / unclear
      const finalCandidates = extracted.amount !== null && sameAmountCandidates.length > 0 ? sameAmountCandidates : candidates;
      if (finalCandidates.length === 0) {
        action = "create";
        newTask = buildNewTask(extracted);
      } else if (finalCandidates.length === 1) {
        action = "update";
        task = finalCandidates[0];
        changes = computeFieldChanges(extracted, task);
        if (changes.length === 0) reasonCodes.push("no_changes");
        if (kindMismatchFallback) reasonCodes.push("intent_unclear");
      } else {
        action = "update";
        taskCandidates = finalCandidates;
        reasonCodes.push("multiple_task_candidates");
      }
    }
  } else if (relationshipStatus === "new") {
    // 처음 보는 업체 — 기존 업무가 있을 수 없다.
    if (extracted.kind !== null) {
      action = "create";
      newTask = buildNewTask(extracted);
    } else {
      action = "update";
      reasonCodes.push("no_changes");
    }
  } else {
    // 관계 미상 — 자동 연결은 하지 않되, 후보 관계별 업무 후보를 모아 보여준다.
    if (wantsCreate) {
      action = "create";
      newTask = buildNewTask(extracted);
      taskCandidates = [];
    } else {
      action = "update";
      taskCandidates = [];
      for (const relRef of relationshipCandidates) {
        let relCandidates = context.tasks.filter(
          (t) => t.relationshipId === relRef.id && (extracted.kind !== null ? t.kind === extracted.kind : t.status === "open"),
        );
        if (extracted.amount !== null) {
          const sameAmount = relCandidates.filter((t) => t.amount === extracted.amount);
          if (sameAmount.length > 0) relCandidates = sameAmount;
        }
        taskCandidates.push(...relCandidates);
      }
    }
    // relationship과 task는 사용자가 관계를 고르기 전까지 미확정으로 둔다.
  }

  // 추가 needs_check 사유
  if (extracted.dueAmbiguous) reasonCodes.push("date_ambiguous");
  if (extracted.amount !== null && extracted.currency === null) reasonCodes.push("currency_unclear");
  if (extracted.cancellation) reasonCodes.push("cancellation_or_removal");
  if (task) {
    if (task.status === "done") reasonCodes.push("task_completed");
    if (isOlderMessage(receivedAt, task)) reasonCodes.push("older_message");
  }

  // 5. 판단 상태
  const hasNeedsCheck = reasonCodes.some((c) => NEEDS_CHECK_CODES.has(c));
  let judgment: Judgment;
  if (hasNeedsCheck) judgment = "needs_check";
  else if (extracted.tentative) judgment = "possible";
  else judgment = "confirmed";
  if (extracted.tentative && !reasonCodes.includes("tentative_expression")) {
    reasonCodes.push("tentative_expression");
  }

  const reasonText = buildReasonText({ action, reasonCodes, extracted, relationshipStatus });

  return {
    index,
    extracted,
    action,
    judgment,
    reasonCodes,
    reasonText,
    relationship,
    relationshipCandidates,
    suggestedRelationshipName,
    task,
    taskCandidates,
    changes,
    newTask,
  };
}
