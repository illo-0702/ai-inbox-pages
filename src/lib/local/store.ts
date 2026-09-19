// GitHub Pages 버전의 도메인 로직. src/lib/server/{judge,apply,queries}.ts와 같은 규칙을
// 브라우저 localStorage 위에서 그대로 구현한다(judge.ts는 순수 함수라 그대로 재사용).
// 여기서 만드는 함수들은 src/lib/client/api.ts가 fetch 대신 호출한다 — 화면 컴포넌트는 그대로다.
import { computeFieldChanges, defaultTitleFor, judge, normalizeRelationshipName } from "@/lib/server/judge";
import { extractDemo } from "@/lib/ai/demo";
import { normalize } from "@/lib/ai/normalize";
import { dueStateOf, nowIso, todayInSeoul } from "@/lib/time";
import type {
  AnalyzeResponse,
  DashboardResponse,
  DecideRequest,
  DecideResponse,
  EventView,
  ExtractedRequest,
  FieldChange,
  IsoDateTime,
  PendingProposalView,
  ProposalDetailResponse,
  RelationshipDetail,
  RelationshipRef,
  RelationshipSummary,
  TaskSnapshot,
  TaskStatus,
  TaskView,
  UserDecision,
} from "@/lib/types";
import { clearData, withData } from "./db";
import type { EventRow, LocalData, ProposalRow, TaskRow } from "./types";

export class LocalStoreError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class LocalVersionConflictError extends Error {
  latest: TaskSnapshot;
  constructor(latest: TaskSnapshot) {
    super("version_conflict");
    this.latest = latest;
  }
}

const MAX_INPUT_CHARS = 2000;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // 구형 브라우저 대비 폴백 (암호학적 안전성 불필요 — 로컬 식별자일 뿐)
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function contactsOf(data: LocalData, relationshipId: string): string[] {
  return data.contacts.filter((c) => c.relationshipId === relationshipId).map((c) => c.displayName);
}

function toRelationshipRef(data: LocalData, r: LocalData["relationships"][number]): RelationshipRef {
  return { id: r.id, name: r.name, contacts: contactsOf(data, r.id) };
}

function toTaskSnapshot(t: TaskRow): TaskSnapshot {
  return {
    id: t.id,
    relationshipId: t.relationshipId,
    relationshipName: "", // 호출부에서 필요 시 채움(judge는 이 필드를 쓰지 않음)
    kind: t.kind,
    title: t.title,
    amount: t.amount,
    currency: t.currency,
    dueDate: t.dueDate,
    status: t.status,
    version: t.version,
    lastReceivedAt: t.lastReceivedAt,
  };
}

function relationshipRefs(data: LocalData): RelationshipRef[] {
  return data.relationships.map((r) => toRelationshipRef(data, r));
}

function taskSnapshots(data: LocalData): TaskSnapshot[] {
  return data.tasks.map((t) => ({ ...toTaskSnapshot(t), relationshipName: relationshipNameOf(data, t.relationshipId) }));
}

function relationshipNameOf(data: LocalData, id: string): string {
  return data.relationships.find((r) => r.id === id)?.name ?? "";
}

// ─────────────────────────────── 분석 ───────────────────────────────

/**
 * 원문 → 구조화 요청. GitHub Pages 버전은 외부 서버가 없어 브라우저에 AI 키를 둘 수 없으므로
 * 규칙 기반 데모 엔진만 쓴다("데모 분석(규칙 기반)"으로 화면에 표시).
 */
export function analyzeLocal(input: {
  text: string;
  receivedAt: IsoDateTime;
  senderHint?: string | null;
  organizationHint?: string | null;
}): AnalyzeResponse {
  const text = input.text ?? "";
  if (text.trim().length === 0) {
    throw new LocalStoreError("empty_input", "내용을 입력해주세요.", 400);
  }
  if (text.length > MAX_INPUT_CHARS) {
    throw new LocalStoreError("input_too_long", `입력은 ${MAX_INPUT_CHARS}자 이하로 작성해주세요.`, 400);
  }

  return withData((data) => {
    const relationships = relationshipRefs(data);
    const tasks = taskSnapshots(data);
    const extractionInput = {
      text,
      receivedAt: input.receivedAt,
      senderHint: input.senderHint ?? null,
      organizationHint: input.organizationHint ?? null,
      knownRelationships: relationships.map((r) => ({ name: r.name, contacts: r.contacts })),
    };
    const requests: ExtractedRequest[] = normalize(extractDemo(text), extractionInput);
    const drafts = requests.map((extracted, index) => judge(extracted, input.receivedAt, { relationships, tasks }, index));

    return {
      analysisId: uuid(),
      receivedAt: input.receivedAt,
      provider: "demo",
      model: null,
      usedFallback: false,
      drafts,
    };
  });
}

// ─────────────────────────────── 결정 적용 ───────────────────────────────

interface ApplyOutcome {
  relationshipId: string | null;
  relationshipName: string | null;
  taskId: string | null;
  changes: FieldChange[];
  task: TaskSnapshot | null;
}

function maxIso(a: string | null, b: string): string {
  if (!a) return b;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

function applyCore(
  data: LocalData,
  params: {
    decision: UserDecision;
    extracted: ExtractedRequest;
    target: DecideRequest["target"];
    confirmations: DecideRequest["confirmations"];
    receivedAt: IsoDateTime;
  },
): ApplyOutcome {
  const { decision, extracted, target, confirmations, receivedAt } = params;
  const now = nowIso();

  let relationshipId: string | null = null;
  let relationshipName: string | null = null;
  if (target.relationship && "id" in target.relationship) {
    const wantedId = target.relationship.id;
    const row = data.relationships.find((r) => r.id === wantedId);
    if (!row) throw new LocalStoreError("not_found", "관계를 찾을 수 없습니다.", 404);
    relationshipId = row.id;
    relationshipName = row.name;
  } else if (target.relationship && "newName" in target.relationship) {
    const newName = target.relationship;
    if (decision === "apply") {
      const name = newName.newName;
      const normalized = normalizeRelationshipName(name);
      const existing = data.relationships.find((r) => r.normalizedName === normalized);
      if (existing) {
        relationshipId = existing.id;
        relationshipName = existing.name;
      } else {
        const id = uuid();
        data.relationships.push({ id, name, normalizedName: normalized, createdAt: now, updatedAt: now });
        relationshipId = id;
        relationshipName = name;
      }
    } else {
      relationshipName = newName.newName;
    }
  }

  let taskRow: TaskRow | null = null;
  if (target.task && target.task !== "new" && "id" in target.task) {
    const wantedTaskId = target.task.id;
    const row = data.tasks.find((t) => t.id === wantedTaskId);
    if (!row) throw new LocalStoreError("not_found", "업무를 찾을 수 없습니다.", 404);
    taskRow = row;
  }

  if (taskRow && relationshipId && taskRow.relationshipId !== relationshipId) {
    throw new LocalStoreError("invalid_request", "선택한 업무가 선택한 관계에 속하지 않아요.", 400);
  }

  const changes = taskRow ? computeFieldChanges(extracted, toTaskSnapshot(taskRow)) : [];

  if (decision === "keep") {
    if (taskRow) {
      data.events.push({
        id: uuid(),
        taskId: taskRow.id,
        relationshipId: taskRow.relationshipId,
        contactName: extracted.senderName,
        eventType: "change_kept",
        fieldChanges: changes,
        receivedAt,
        appliedAt: now,
        actor: "user",
      });
    }
    return { relationshipId, relationshipName, taskId: taskRow?.id ?? null, changes, task: taskRow ? toTaskSnapshot(taskRow) : null };
  }

  if (decision === "defer") {
    if (taskRow) {
      data.events.push({
        id: uuid(),
        taskId: taskRow.id,
        relationshipId: taskRow.relationshipId,
        contactName: extracted.senderName,
        eventType: "change_deferred",
        fieldChanges: changes,
        receivedAt,
        appliedAt: now,
        actor: "user",
      });
    }
    return { relationshipId, relationshipName, taskId: taskRow?.id ?? null, changes, task: taskRow ? toTaskSnapshot(taskRow) : null };
  }

  // decision === "apply"
  if (!relationshipId) throw new LocalStoreError("relationship_required", "관계를 먼저 선택해야 해요.", 400);

  if (extracted.senderName) {
    const relId = relationshipId;
    const already = data.contacts.some((c) => c.relationshipId === relId && c.displayName === extracted.senderName);
    if (!already) {
      data.contacts.push({ id: uuid(), relationshipId: relId, displayName: extracted.senderName, createdAt: now });
    }
  }
  const rel = data.relationships.find((r) => r.id === relationshipId);
  if (rel) rel.updatedAt = now;

  const dueNeedsConfirm = extracted.dueAmbiguous && extracted.dueDate !== null;
  if (dueNeedsConfirm && confirmations.date !== true) {
    throw new LocalStoreError("date_confirmation_required", "마감 날짜 해석을 확인해주세요.", 400);
  }

  const isExistingTaskUpdate = target.task !== null && target.task !== "new";
  if (extracted.tentative && isExistingTaskUpdate && confirmations.tentativeAccepted !== true) {
    throw new LocalStoreError("tentative_confirmation_required", "잠정적인 변경은 확인 후에 반영할 수 있어요.", 400);
  }

  if (target.task === "new") {
    const kind = extracted.kind ?? "other";
    const id = uuid();
    const title = extracted.title ?? defaultTitleFor(kind);
    const created: TaskRow = {
      id,
      relationshipId,
      kind,
      title,
      amount: extracted.amount,
      currency: extracted.currency,
      dueDate: extracted.dueDate,
      status: "open",
      version: 1,
      lastReceivedAt: receivedAt,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    data.tasks.push(created);
    const initChanges: FieldChange[] = [{ field: "title", before: null, after: title }];
    if (extracted.amount !== null) initChanges.push({ field: "amount", before: null, after: extracted.amount });
    if (extracted.currency !== null) initChanges.push({ field: "currency", before: null, after: extracted.currency });
    if (extracted.dueDate !== null) initChanges.push({ field: "dueDate", before: null, after: extracted.dueDate });
    data.events.push({
      id: uuid(),
      taskId: id,
      relationshipId,
      contactName: extracted.senderName,
      eventType: "task_created",
      fieldChanges: initChanges,
      receivedAt,
      appliedAt: now,
      actor: "user",
    });
    return { relationshipId, relationshipName, taskId: id, changes: initChanges, task: toTaskSnapshot(created) };
  }

  if (target.task && "id" in target.task) {
    if (!taskRow) throw new LocalStoreError("not_found", "업무를 찾을 수 없습니다.", 404);
    if (taskRow.version !== target.task.expectedVersion) throw new LocalVersionConflictError(toTaskSnapshot(taskRow));
    if (changes.length === 0) {
      return { relationshipId, relationshipName, taskId: taskRow.id, changes: [], task: toTaskSnapshot(taskRow) };
    }
    for (const c of changes) {
      if (c.field === "dueDate") taskRow.dueDate = c.after as string | null;
      if (c.field === "amount") taskRow.amount = c.after as number | null;
      if (c.field === "currency") taskRow.currency = c.after as string | null;
    }
    taskRow.version += 1;
    taskRow.updatedAt = now;
    taskRow.lastReceivedAt = maxIso(taskRow.lastReceivedAt, receivedAt);
    data.events.push({
      id: uuid(),
      taskId: taskRow.id,
      relationshipId: taskRow.relationshipId,
      contactName: extracted.senderName,
      eventType: "task_updated",
      fieldChanges: changes,
      receivedAt,
      appliedAt: now,
      actor: "user",
    });
    return { relationshipId, relationshipName, taskId: taskRow.id, changes, task: toTaskSnapshot(taskRow) };
  }

  throw new LocalStoreError("task_required", "업무를 먼저 선택해야 해요.", 400);
}

function mapDecision(d: UserDecision): "applied" | "kept" | "pending" {
  if (d === "apply") return "applied";
  if (d === "keep") return "kept";
  return "pending";
}

export function decideLocal(request: DecideRequest): DecideResponse {
  return withData((data) => {
    const existing = data.proposals.find((p) => p.analysisId === request.analysisId && p.itemIndex === request.index);
    if (existing) {
      const task = existing.taskId ? data.tasks.find((t) => t.id === existing.taskId) ?? null : null;
      return { decision: existing.decision, proposalId: existing.id, task: task ? toTaskSnapshot(task) : null, duplicate: true };
    }

    const relationships = relationshipRefs(data);
    const tasks = taskSnapshots(data);
    const draft = judge(request.extracted, request.receivedAt, { relationships, tasks }, request.index);

    const outcome = applyCore(data, {
      decision: request.decision,
      extracted: request.extracted,
      target: request.target,
      confirmations: request.confirmations,
      receivedAt: request.receivedAt,
    });

    const proposalId = uuid();
    const now = nowIso();
    const decision = mapDecision(request.decision);
    data.proposals.push({
      id: proposalId,
      analysisId: request.analysisId,
      itemIndex: request.index,
      createdAt: now,
      receivedAt: request.receivedAt,
      senderName: request.extracted.senderName,
      relationshipId: outcome.relationshipId,
      relationshipName: outcome.relationshipName,
      taskId: outcome.taskId,
      judgment: draft.judgment,
      reasonCodes: draft.reasonCodes,
      reasonText: draft.reasonText,
      changes: outcome.changes,
      extracted: { ...request.extracted, dueText: null },
      decision,
      decidedAt: now,
    });

    return { decision, proposalId, task: outcome.task, duplicate: false };
  });
}

export function decidePendingLocal(
  proposalId: string,
  body: { decision: UserDecision; target: DecideRequest["target"]; confirmations: DecideRequest["confirmations"]; extracted?: ExtractedRequest },
): DecideResponse {
  return withData((data) => {
    const existing = data.proposals.find((p) => p.id === proposalId);
    if (!existing) throw new LocalStoreError("not_found", "제안을 찾을 수 없습니다.", 404);
    if (existing.decision !== "pending") throw new LocalStoreError("already_decided", "이미 처리된 제안이에요.", 409);

    const extracted = body.extracted ?? existing.extracted;
    const outcome = applyCore(data, {
      decision: body.decision,
      extracted,
      target: body.target,
      confirmations: body.confirmations,
      receivedAt: existing.receivedAt,
    });

    const now = nowIso();
    const decision = mapDecision(body.decision);
    existing.decision = decision;
    existing.decidedAt = now;
    existing.relationshipId = outcome.relationshipId;
    existing.relationshipName = outcome.relationshipName;
    existing.taskId = outcome.taskId;
    existing.changes = outcome.changes;
    existing.extracted = { ...extracted, dueText: null };

    return { decision, proposalId, task: outcome.task, duplicate: false };
  });
}

export function setTaskStatusLocal(taskId: string, status: TaskStatus, expectedVersion: number): TaskSnapshot {
  return withData((data) => {
    const row = data.tasks.find((t) => t.id === taskId);
    if (!row) throw new LocalStoreError("not_found", "업무를 찾을 수 없습니다.", 404);
    if (row.version !== expectedVersion) throw new LocalVersionConflictError(toTaskSnapshot(row));

    const now = nowIso();
    row.version += 1;
    row.status = status;
    row.completedAt = status === "done" ? now : null;
    row.updatedAt = now;

    data.events.push({
      id: uuid(),
      taskId,
      relationshipId: row.relationshipId,
      contactName: null,
      eventType: status === "done" ? "completed" : "reopened",
      fieldChanges: [],
      receivedAt: null,
      appliedAt: now,
      actor: "user",
    });
    const rel = data.relationships.find((r) => r.id === row.relationshipId);
    if (rel) rel.updatedAt = now;

    return toTaskSnapshot(row);
  });
}

// ─────────────────────────────── 조회 ───────────────────────────────

function toPendingProposalView(data: LocalData, row: ProposalRow): PendingProposalView {
  return {
    id: row.id,
    createdAt: row.createdAt,
    receivedAt: row.receivedAt,
    judgment: row.judgment,
    reasonCodes: row.reasonCodes,
    reasonText: row.reasonText,
    senderName: row.senderName,
    relationshipId: row.relationshipId,
    relationshipName: row.relationshipName,
    taskId: row.taskId,
    taskTitle: row.taskId ? data.tasks.find((t) => t.id === row.taskId)?.title ?? null : null,
    changes: row.changes,
    extracted: row.extracted,
  };
}

function toEventView(row: EventRow, data: LocalData): EventView {
  return {
    id: row.id,
    taskId: row.taskId,
    taskTitle: row.taskId ? data.tasks.find((t) => t.id === row.taskId)?.title ?? null : null,
    relationshipId: row.relationshipId,
    eventType: row.eventType,
    contactName: row.contactName,
    fieldChanges: row.fieldChanges,
    receivedAt: row.receivedAt,
    appliedAt: row.appliedAt,
    actor: row.actor,
  };
}

function countPendingForTask(data: LocalData, taskId: string): number {
  return data.proposals.filter((p) => p.taskId === taskId && p.decision === "pending").length;
}

function buildTaskView(data: LocalData, row: TaskRow, today: string): TaskView {
  const lastEvent = [...data.events]
    .filter((e) => e.taskId === row.id && e.eventType === "task_updated")
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))[0];
  return {
    ...toTaskSnapshot(row),
    relationshipName: relationshipNameOf(data, row.relationshipId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    lastChange: lastEvent ? { changes: lastEvent.fieldChanges, appliedAt: lastEvent.appliedAt, contactName: lastEvent.contactName } : null,
    pendingProposalCount: countPendingForTask(data, row.id),
    dueState: dueStateOf(row.dueDate, today),
  };
}

const DUE_STATE_RANK: Record<TaskView["dueState"], number> = { overdue: 0, today: 1, upcoming: 2, none: 3 };

function compareOpenTasks(a: TaskView, b: TaskView): number {
  const ra = DUE_STATE_RANK[a.dueState];
  const rb = DUE_STATE_RANK[b.dueState];
  if (ra !== rb) return ra - rb;
  if (a.dueState === "upcoming") return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
  if (a.dueState === "none") return a.createdAt.localeCompare(b.createdAt);
  return 0;
}

export function getDashboardLocal(): DashboardResponse {
  return withData((data) => {
    const today = todayInSeoul();
    const openTasks: TaskView[] = [];
    const doneTasks: TaskView[] = [];
    for (const row of data.tasks) {
      const view = buildTaskView(data, row, today);
      if (row.status === "open") openTasks.push(view);
      else doneTasks.push(view);
    }
    openTasks.sort(compareOpenTasks);
    doneTasks.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    const pending = data.proposals.filter((p) => p.decision === "pending");

    return {
      today,
      openTasks,
      doneTasks,
      pending: pending.map((p) => toPendingProposalView(data, p)),
      sessionExpiresAt: today, // 저장 기간 개념 없음(브라우저에 계속 남음) — 화면에는 별도 안내 문구를 쓴다
    };
  });
}

export function getRelationshipsLocal(): RelationshipSummary[] {
  return withData((data) =>
    data.relationships.map((r) => ({
      id: r.id,
      name: r.name,
      contacts: contactsOf(data, r.id),
      openTaskCount: data.tasks.filter((t) => t.relationshipId === r.id && t.status === "open").length,
      pendingCount: data.proposals.filter((p) => p.relationshipId === r.id && p.decision === "pending").length,
      updatedAt: r.updatedAt,
    })),
  );
}

export function getRelationshipDetailLocal(id: string): RelationshipDetail | null {
  return withData((data) => {
    const row = data.relationships.find((r) => r.id === id);
    if (!row) return null;
    const today = todayInSeoul();
    const tasks = data.tasks.filter((t) => t.relationshipId === id).map((t) => buildTaskView(data, t, today));
    const pending = data.proposals.filter((p) => p.relationshipId === id && p.decision === "pending");
    const events = data.events
      .filter((e) => e.relationshipId === id)
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
      .map((e) => toEventView(e, data));

    return {
      id: row.id,
      name: row.name,
      contacts: contactsOf(data, id),
      openTaskCount: tasks.filter((t) => t.status === "open").length,
      pendingCount: pending.length,
      updatedAt: row.updatedAt,
      tasks,
      pending: pending.map((p) => toPendingProposalView(data, p)),
      events,
    };
  });
}

export function getProposalViewLocal(id: string): ProposalDetailResponse | null {
  return withData((data) => {
    const row = data.proposals.find((p) => p.id === id);
    if (!row) return null;
    const relationships = relationshipRefs(data);
    const tasks = taskSnapshots(data);
    const draft = judge(row.extracted, row.receivedAt, { relationships, tasks }, row.itemIndex);

    let relationship: RelationshipRef | null = draft.relationship;
    if (row.relationshipId) {
      const relRow = data.relationships.find((r) => r.id === row.relationshipId);
      relationship = relRow ? toRelationshipRef(data, relRow) : null;
    }

    let task: TaskSnapshot | null = draft.task;
    if (row.taskId) {
      const taskRow = data.tasks.find((t) => t.id === row.taskId);
      task = taskRow ? toTaskSnapshot(taskRow) : null;
    }

    const currentChanges = task ? computeFieldChanges(row.extracted, task) : [];

    return {
      ...toPendingProposalView(data, row),
      decision: row.decision,
      action: draft.action,
      relationship,
      relationshipCandidates: draft.relationshipCandidates,
      suggestedRelationshipName: draft.suggestedRelationshipName,
      task,
      taskCandidates: draft.taskCandidates,
      currentChanges,
    };
  });
}

export function deleteAllLocal(): void {
  clearData();
}
