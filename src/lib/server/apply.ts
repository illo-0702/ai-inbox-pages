// 결정 적용 — 구현 계약 4장. 하나의 트랜잭션에서 멱등·소유권·버전 충돌을 모두 검증한다.
import type { Client, Transaction } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { nowIso } from "@/lib/time";
import type {
  Decision,
  DecideRequest,
  DecideResponse,
  ExtractedRequest,
  FieldChange,
  IsoDateTime,
  TaskSnapshot,
  UserDecision,
} from "@/lib/types";
import { computeFieldChanges, defaultTitleFor, judge } from "./judge";
import { upsertContact } from "./repo/contacts";
import { insertEventRow } from "./repo/events";
import {
  findProposalByIdemKey,
  getProposalRow,
  insertProposalRow,
  updateProposalDecision,
} from "./repo/proposals";
import { getRelationshipRow, insertRelationship } from "./repo/relationships";
import { getTaskRow, insertTask, toTaskSnapshot, updateTaskFields, updateTaskStatus } from "./repo/tasks";
import type { TaskRow } from "./repo/tasks";
import { buildRelationshipRefs, buildTaskSnapshots } from "./queries";
import { normalizeRelationshipName } from "./judge";

export class ApplyError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class VersionConflictError extends Error {
  latest: TaskSnapshot;
  constructor(latest: TaskSnapshot) {
    super("version_conflict");
    this.latest = latest;
  }
}

function mapUserDecisionToDecision(d: UserDecision): Decision {
  if (d === "apply") return "applied";
  if (d === "keep") return "kept";
  return "pending";
}

function maxIso(a: string | null, b: string): string {
  if (!a) return b;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

async function safeRollback(tx: Transaction): Promise<void> {
  try {
    if (!tx.closed) await tx.rollback();
  } catch {
    // 이미 종료된 트랜잭션이면 무시
  }
}

interface ApplyCoreResult {
  relationshipId: string | null;
  relationshipName: string | null;
  taskId: string | null;
  changes: FieldChange[];
  task: TaskSnapshot | null;
}

/** target을 검증하고 실제 관계/업무 상태를 바꾼다. proposals 테이블은 건드리지 않는다. */
async function applyCore(
  tx: Transaction,
  workspaceId: string,
  params: {
    decision: UserDecision;
    extracted: ExtractedRequest;
    target: DecideRequest["target"];
    confirmations: DecideRequest["confirmations"];
    receivedAt: IsoDateTime;
  },
): Promise<ApplyCoreResult> {
  const { decision, extracted, target, confirmations, receivedAt } = params;
  const now = nowIso();

  // 관계 검증/해석 (이 작업공간 소유 여부 확인)
  let relationshipId: string | null = null;
  let relationshipName: string | null = null;
  if (target.relationship && "id" in target.relationship) {
    const row = await getRelationshipRow(tx, workspaceId, target.relationship.id);
    if (!row) throw new ApplyError("not_found", "관계를 찾을 수 없습니다.", 404);
    relationshipId = row.id;
    relationshipName = row.name;
  } else if (target.relationship && "newName" in target.relationship) {
    if (decision === "apply") {
      const id = randomUUID();
      const name = target.relationship.newName;
      await insertRelationship(tx, { id, workspaceId, name, normalizedName: normalizeRelationshipName(name), createdAt: now });
      relationshipId = id;
      relationshipName = name;
    } else {
      relationshipName = target.relationship.newName;
    }
  }

  // 업무 검증(기존 업무를 가리키는 경우만 조회)
  let taskRow: TaskRow | null = null;
  if (target.task && target.task !== "new" && "id" in target.task) {
    const row = await getTaskRow(tx, workspaceId, target.task.id);
    if (!row) throw new ApplyError("not_found", "업무를 찾을 수 없습니다.", 404);
    taskRow = row;
  }

  // 선택한 업무가 선택한 관계 소속인지 확인(둘 다 정해진 경우만)
  if (taskRow && relationshipId && taskRow.relationshipId !== relationshipId) {
    throw new ApplyError("invalid_request", "선택한 업무가 선택한 관계에 속하지 않아요.", 400);
  }

  const changes = taskRow ? computeFieldChanges(extracted, toTaskSnapshot(taskRow)) : [];

  if (decision === "keep") {
    if (taskRow) {
      await insertEventRow(tx, {
        id: randomUUID(),
        workspaceId,
        taskId: taskRow.id,
        relationshipId: taskRow.relationshipId,
        contactName: extracted.senderName,
        eventType: "change_kept",
        fieldChanges: changes,
        receivedAt,
        appliedAt: now,
      });
    }
    return {
      relationshipId,
      relationshipName,
      taskId: taskRow?.id ?? null,
      changes,
      task: taskRow ? toTaskSnapshot(taskRow) : null,
    };
  }

  if (decision === "defer") {
    if (taskRow) {
      await insertEventRow(tx, {
        id: randomUUID(),
        workspaceId,
        taskId: taskRow.id,
        relationshipId: taskRow.relationshipId,
        contactName: extracted.senderName,
        eventType: "change_deferred",
        fieldChanges: changes,
        receivedAt,
        appliedAt: now,
      });
    }
    return {
      relationshipId,
      relationshipName,
      taskId: taskRow?.id ?? null,
      changes,
      task: taskRow ? toTaskSnapshot(taskRow) : null,
    };
  }

  // decision === "apply"
  if (!relationshipId) throw new ApplyError("relationship_required", "관계를 먼저 선택해야 해요.", 400);

  if (extracted.senderName) {
    await upsertContact(tx, {
      id: randomUUID(),
      workspaceId,
      relationshipId,
      displayName: extracted.senderName,
      createdAt: now,
    });
  }

  const dueNeedsConfirm = extracted.dueAmbiguous && extracted.dueDate !== null;
  if (dueNeedsConfirm && confirmations.date !== true) {
    throw new ApplyError("date_confirmation_required", "마감 날짜 해석을 확인해주세요.", 400);
  }

  if (target.task === "new") {
    // UI는 업무 선택에 항상 "새 업무로 등록"을 둘 수 있다. kind가 없으면 "other"로 만든다.
    const kind = extracted.kind ?? "other";
    const id = randomUUID();
    const title = extracted.title ?? defaultTitleFor(kind);
    await insertTask(tx, {
      id,
      workspaceId,
      relationshipId,
      kind,
      title,
      amount: extracted.amount,
      currency: extracted.currency,
      dueDate: extracted.dueDate,
      lastReceivedAt: receivedAt,
      createdAt: now,
      updatedAt: now,
    });
    const initChanges: FieldChange[] = [{ field: "title", before: null, after: title }];
    if (extracted.amount !== null) initChanges.push({ field: "amount", before: null, after: extracted.amount });
    if (extracted.currency !== null) initChanges.push({ field: "currency", before: null, after: extracted.currency });
    if (extracted.dueDate !== null) initChanges.push({ field: "dueDate", before: null, after: extracted.dueDate });
    await insertEventRow(tx, {
      id: randomUUID(),
      workspaceId,
      taskId: id,
      relationshipId,
      contactName: extracted.senderName,
      eventType: "task_created",
      fieldChanges: initChanges,
      receivedAt,
      appliedAt: now,
    });
    const created = await getTaskRow(tx, workspaceId, id);
    return {
      relationshipId,
      relationshipName,
      taskId: id,
      changes: initChanges,
      task: created ? toTaskSnapshot(created) : null,
    };
  }

  if (target.task && "id" in target.task) {
    if (!taskRow) throw new ApplyError("not_found", "업무를 찾을 수 없습니다.", 404);
    if (taskRow.version !== target.task.expectedVersion) {
      throw new VersionConflictError(toTaskSnapshot(taskRow));
    }
    if (changes.length === 0) {
      return { relationshipId, relationshipName, taskId: taskRow.id, changes: [], task: toTaskSnapshot(taskRow) };
    }
    const newVersion = taskRow.version + 1;
    const newLastReceivedAt = maxIso(taskRow.lastReceivedAt, receivedAt);
    const fields: { title?: string; amount?: number | null; currency?: string | null; due_date?: string | null } = {};
    for (const c of changes) {
      if (c.field === "dueDate") fields.due_date = c.after as string | null;
      if (c.field === "amount") fields.amount = c.after as number | null;
      if (c.field === "currency") fields.currency = c.after as string | null;
      if (c.field === "title") fields.title = c.after as string;
    }
    const affected = await updateTaskFields(tx, {
      workspaceId,
      id: taskRow.id,
      expectedVersion: taskRow.version,
      newVersion,
      updatedAt: now,
      lastReceivedAt: newLastReceivedAt,
      fields,
    });
    if (affected === 0) {
      const latest = await getTaskRow(tx, workspaceId, taskRow.id);
      throw new VersionConflictError(latest ? toTaskSnapshot(latest) : toTaskSnapshot(taskRow));
    }
    await insertEventRow(tx, {
      id: randomUUID(),
      workspaceId,
      taskId: taskRow.id,
      relationshipId: taskRow.relationshipId,
      contactName: extracted.senderName,
      eventType: "task_updated",
      fieldChanges: changes,
      receivedAt,
      appliedAt: now,
    });
    const updated = await getTaskRow(tx, workspaceId, taskRow.id);
    return { relationshipId, relationshipName, taskId: taskRow.id, changes, task: updated ? toTaskSnapshot(updated) : null };
  }

  throw new ApplyError("task_required", "업무를 먼저 선택해야 해요.", 400);
}

/** POST /api/decisions — 새 분석 결과에 대한 결정. 멱등 키: (workspace, analysisId, index). */
export async function applyDecision(client: Client, workspaceId: string, request: DecideRequest): Promise<DecideResponse> {
  const tx = await client.transaction("write");
  try {
    const existing = await findProposalByIdemKey(tx, workspaceId, request.analysisId, request.index);
    if (existing) {
      let task: TaskSnapshot | null = null;
      if (existing.taskId) {
        const row = await getTaskRow(tx, workspaceId, existing.taskId);
        if (row) task = toTaskSnapshot(row);
      }
      await tx.commit();
      return { decision: existing.decision, proposalId: existing.id, task, duplicate: true };
    }

    const relationships = await buildRelationshipRefs(tx, workspaceId);
    const tasks = await buildTaskSnapshots(tx, workspaceId);
    const draft = judge(request.extracted, request.receivedAt, { relationships, tasks }, request.index);

    const outcome = await applyCore(tx, workspaceId, {
      decision: request.decision,
      extracted: request.extracted,
      target: request.target,
      confirmations: request.confirmations,
      receivedAt: request.receivedAt,
    });

    const proposalId = randomUUID();
    const now = nowIso();
    const decision = mapUserDecisionToDecision(request.decision);
    await insertProposalRow(tx, {
      id: proposalId,
      workspaceId,
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

    await tx.commit();
    return { decision, proposalId, task: outcome.task, duplicate: false };
  } catch (err) {
    await safeRollback(tx);
    throw err;
  } finally {
    tx.close();
  }
}

/** POST /api/proposals/:id/decide — 저장된 pending 제안을 처리한다. */
export async function decidePendingProposal(
  client: Client,
  workspaceId: string,
  proposalId: string,
  body: {
    decision: UserDecision;
    target: DecideRequest["target"];
    confirmations: DecideRequest["confirmations"];
    extracted?: ExtractedRequest;
  },
): Promise<DecideResponse> {
  const tx = await client.transaction("write");
  try {
    const existing = await getProposalRow(tx, workspaceId, proposalId);
    if (!existing) throw new ApplyError("not_found", "제안을 찾을 수 없습니다.", 404);
    if (existing.decision !== "pending") {
      throw new ApplyError("already_decided", "이미 처리된 제안이에요.", 409);
    }

    const extracted = body.extracted ?? existing.extracted;
    const outcome = await applyCore(tx, workspaceId, {
      decision: body.decision,
      extracted,
      target: body.target,
      confirmations: body.confirmations,
      receivedAt: existing.receivedAt,
    });

    const now = nowIso();
    const decision = mapUserDecisionToDecision(body.decision);
    await updateProposalDecision(tx, workspaceId, proposalId, {
      decision,
      decidedAt: now,
      relationshipId: outcome.relationshipId,
      relationshipName: outcome.relationshipName,
      taskId: outcome.taskId,
      changes: outcome.changes,
      extracted: { ...extracted, dueText: null },
    });

    await tx.commit();
    return { decision, proposalId, task: outcome.task, duplicate: false };
  } catch (err) {
    await safeRollback(tx);
    throw err;
  } finally {
    tx.close();
  }
}

/** POST /api/tasks/:id/status — 완료/되돌리기. */
export async function setTaskStatus(
  client: Client,
  workspaceId: string,
  taskId: string,
  status: "open" | "done",
  expectedVersion: number,
): Promise<TaskSnapshot> {
  const tx = await client.transaction("write");
  try {
    const row = await getTaskRow(tx, workspaceId, taskId);
    if (!row) throw new ApplyError("not_found", "업무를 찾을 수 없습니다.", 404);
    if (row.version !== expectedVersion) throw new VersionConflictError(toTaskSnapshot(row));

    const now = nowIso();
    const newVersion = row.version + 1;
    const completedAt = status === "done" ? now : null;
    const affected = await updateTaskStatus(tx, {
      workspaceId,
      id: taskId,
      expectedVersion,
      newVersion,
      status,
      completedAt,
      updatedAt: now,
    });
    if (affected === 0) {
      const latest = await getTaskRow(tx, workspaceId, taskId);
      throw new VersionConflictError(latest ? toTaskSnapshot(latest) : toTaskSnapshot(row));
    }

    await insertEventRow(tx, {
      id: randomUUID(),
      workspaceId,
      taskId,
      relationshipId: row.relationshipId,
      contactName: null,
      eventType: status === "done" ? "completed" : "reopened",
      fieldChanges: [],
      receivedAt: null,
      appliedAt: now,
    });

    const updated = await getTaskRow(tx, workspaceId, taskId);
    await tx.commit();
    return toTaskSnapshot(updated as TaskRow);
  } catch (err) {
    await safeRollback(tx);
    throw err;
  } finally {
    tx.close();
  }
}
