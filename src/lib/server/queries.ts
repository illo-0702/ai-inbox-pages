// 조회 전용 함수 — 대시보드, 관계 목록/상세, 제안 상세.
import { dueStateOf, todayInSeoul } from "@/lib/time";
import type {
  DashboardResponse,
  EventView,
  PendingProposalView,
  ProposalDetailResponse,
  RelationshipDetail,
  RelationshipRef,
  RelationshipSummary,
  TaskSnapshot,
  TaskView,
} from "@/lib/types";
import type { Executor } from "./db";
import { computeFieldChanges, judge } from "./judge";
import { listContactNames } from "./repo/contacts";
import type { EventRow } from "./repo/events";
import { getLatestTaskUpdatedEvent, listEventsForRelationship } from "./repo/events";
import { countPendingForTask, getProposalRow, listProposalsPending, listProposalsPendingForRelationship } from "./repo/proposals";
import type { ProposalRow } from "./repo/proposals";
import { getRelationshipRow, listRelationshipRows } from "./repo/relationships";
import { countOpenTasksForRelationship, getTaskRow, listTaskRows, listTaskRowsForRelationship, toTaskSnapshot } from "./repo/tasks";
import type { TaskRow } from "./repo/tasks";
import { getWorkspaceRow } from "./repo/workspaces";

export async function buildRelationshipRefs(db: Executor, workspaceId: string): Promise<RelationshipRef[]> {
  const rows = await listRelationshipRows(db, workspaceId);
  const refs: RelationshipRef[] = [];
  for (const r of rows) {
    const contacts = await listContactNames(db, workspaceId, r.id);
    refs.push({ id: r.id, name: r.name, contacts });
  }
  return refs;
}

export async function buildTaskSnapshots(db: Executor, workspaceId: string): Promise<TaskSnapshot[]> {
  const rows = await listTaskRows(db, workspaceId);
  return rows.map(toTaskSnapshot);
}

function toPendingProposalView(row: ProposalRow): PendingProposalView {
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
    taskTitle: row.taskTitle,
    changes: row.changes,
    extracted: row.extracted,
  };
}

function toEventView(row: EventRow): EventView {
  return {
    id: row.id,
    taskId: row.taskId,
    taskTitle: row.taskTitle,
    relationshipId: row.relationshipId,
    eventType: row.eventType,
    contactName: row.contactName,
    fieldChanges: row.fieldChanges,
    receivedAt: row.receivedAt,
    appliedAt: row.appliedAt,
    actor: row.actor,
  };
}

async function buildTaskView(db: Executor, workspaceId: string, row: TaskRow, today: string): Promise<TaskView> {
  const lastEvent = await getLatestTaskUpdatedEvent(db, workspaceId, row.id);
  const pendingProposalCount = await countPendingForTask(db, workspaceId, row.id);
  return {
    ...toTaskSnapshot(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    lastChange: lastEvent
      ? { changes: lastEvent.fieldChanges, appliedAt: lastEvent.appliedAt, contactName: lastEvent.contactName }
      : null,
    pendingProposalCount,
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

export async function getDashboard(db: Executor, workspaceId: string): Promise<DashboardResponse> {
  const wsRow = await getWorkspaceRow(db, workspaceId);
  const today = todayInSeoul();
  const taskRows = await listTaskRows(db, workspaceId);
  const pendingRows = await listProposalsPending(db, workspaceId);

  const openTasks: TaskView[] = [];
  const doneTasks: TaskView[] = [];
  for (const row of taskRows) {
    const view = await buildTaskView(db, workspaceId, row, today);
    if (row.status === "open") openTasks.push(view);
    else doneTasks.push(view);
  }
  openTasks.sort(compareOpenTasks);
  doneTasks.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return {
    today,
    openTasks,
    doneTasks,
    pending: pendingRows.map(toPendingProposalView),
    sessionExpiresAt: wsRow?.expiresAt ?? today,
  };
}

export async function getRelationships(db: Executor, workspaceId: string): Promise<RelationshipSummary[]> {
  const rows = await listRelationshipRows(db, workspaceId);
  const result: RelationshipSummary[] = [];
  for (const r of rows) {
    const contacts = await listContactNames(db, workspaceId, r.id);
    const openTaskCount = await countOpenTasksForRelationship(db, workspaceId, r.id);
    const pending = await listProposalsPendingForRelationship(db, workspaceId, r.id);
    result.push({
      id: r.id,
      name: r.name,
      contacts,
      openTaskCount,
      pendingCount: pending.length,
      updatedAt: r.updatedAt,
    });
  }
  return result;
}

export async function getRelationshipDetail(db: Executor, workspaceId: string, id: string): Promise<RelationshipDetail | null> {
  const row = await getRelationshipRow(db, workspaceId, id);
  if (!row) return null;
  const today = todayInSeoul();
  const contacts = await listContactNames(db, workspaceId, id);
  const taskRows = await listTaskRowsForRelationship(db, workspaceId, id);
  const tasks: TaskView[] = [];
  for (const t of taskRows) tasks.push(await buildTaskView(db, workspaceId, t, today));
  const pendingRows = await listProposalsPendingForRelationship(db, workspaceId, id);
  const eventRows = await listEventsForRelationship(db, workspaceId, id);
  const openTaskCount = tasks.filter((t) => t.status === "open").length;

  return {
    id: row.id,
    name: row.name,
    contacts,
    openTaskCount,
    pendingCount: pendingRows.length,
    updatedAt: row.updatedAt,
    tasks,
    pending: pendingRows.map(toPendingProposalView),
    events: eventRows.map(toEventView),
  };
}

/**
 * 저장된 제안 상세. relationship/task/후보/currentChanges는 조회 시점 기준으로 다시 계산한다.
 * 저장된 relationship_id/task_id가 있으면 그것을 우선 매칭으로 쓰고(삭제됐으면 null),
 * 없으면 방금 재계산한 judge 결과의 후보를 그대로 쓴다.
 */
export async function getProposalView(db: Executor, workspaceId: string, id: string): Promise<ProposalDetailResponse | null> {
  const row = await getProposalRow(db, workspaceId, id);
  if (!row) return null;
  const relationships = await buildRelationshipRefs(db, workspaceId);
  const tasks = await buildTaskSnapshots(db, workspaceId);
  const draft = judge(row.extracted, row.receivedAt, { relationships, tasks }, row.itemIndex);

  let relationship: RelationshipRef | null = draft.relationship;
  if (row.relationshipId) {
    const relRow = await getRelationshipRow(db, workspaceId, row.relationshipId);
    relationship = relRow ? { id: relRow.id, name: relRow.name, contacts: await listContactNames(db, workspaceId, relRow.id) } : null;
  }

  let task: TaskSnapshot | null = draft.task;
  if (row.taskId) {
    const taskRow = await getTaskRow(db, workspaceId, row.taskId);
    task = taskRow ? toTaskSnapshot(taskRow) : null;
  }

  const currentChanges = task ? computeFieldChanges(row.extracted, task) : [];

  return {
    ...toPendingProposalView(row),
    decision: row.decision,
    action: draft.action,
    relationship,
    relationshipCandidates: draft.relationshipCandidates,
    suggestedRelationshipName: draft.suggestedRelationshipName,
    task,
    taskCandidates: draft.taskCandidates,
    currentChanges,
  };
}

export async function getTaskView(db: Executor, workspaceId: string, id: string): Promise<TaskView | null> {
  const row = await getTaskRow(db, workspaceId, id);
  if (!row) return null;
  const today = todayInSeoul();
  return buildTaskView(db, workspaceId, row, today);
}
