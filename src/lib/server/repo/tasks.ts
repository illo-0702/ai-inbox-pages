// tasks 테이블 저장소 — 현재 유효한 업무 값. 모든 쿼리에 workspace_id 조건을 건다.
import type { Executor } from "../db";
import type { TaskKind, TaskSnapshot, TaskStatus } from "@/lib/types";

export interface TaskRow {
  id: string;
  workspaceId: string;
  relationshipId: string;
  relationshipName: string;
  kind: TaskKind;
  title: string;
  amount: number | null;
  currency: string | null;
  dueDate: string | null;
  status: TaskStatus;
  version: number;
  lastReceivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

function rowToTask(row: Record<string, unknown>): TaskRow {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    relationshipId: row.relationship_id as string,
    relationshipName: row.relationship_name as string,
    kind: row.kind as TaskKind,
    title: row.title as string,
    amount: (row.amount as number | null) ?? null,
    currency: (row.currency as string | null) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
    status: row.status as TaskStatus,
    version: Number(row.version as number),
    lastReceivedAt: (row.last_received_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

export function toTaskSnapshot(row: TaskRow): TaskSnapshot {
  return {
    id: row.id,
    relationshipId: row.relationshipId,
    relationshipName: row.relationshipName,
    kind: row.kind,
    title: row.title,
    amount: row.amount,
    currency: row.currency,
    dueDate: row.dueDate,
    status: row.status,
    version: row.version,
    lastReceivedAt: row.lastReceivedAt,
  };
}

const SELECT = `SELECT t.id, t.workspace_id, t.relationship_id, r.name AS relationship_name, t.kind, t.title,
  t.amount, t.currency, t.due_date, t.status, t.version, t.last_received_at,
  t.created_at, t.updated_at, t.completed_at
  FROM tasks t JOIN relationships r ON r.id = t.relationship_id`;

export async function listTaskRows(db: Executor, workspaceId: string): Promise<TaskRow[]> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE t.workspace_id = ? ORDER BY t.created_at ASC`,
    args: [workspaceId],
  });
  return rs.rows.map((r) => rowToTask(r as unknown as Record<string, unknown>));
}

export async function listTaskRowsForRelationship(
  db: Executor,
  workspaceId: string,
  relationshipId: string,
): Promise<TaskRow[]> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE t.workspace_id = ? AND t.relationship_id = ? ORDER BY t.created_at ASC`,
    args: [workspaceId, relationshipId],
  });
  return rs.rows.map((r) => rowToTask(r as unknown as Record<string, unknown>));
}

export async function getTaskRow(db: Executor, workspaceId: string, id: string): Promise<TaskRow | null> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE t.workspace_id = ? AND t.id = ?`,
    args: [workspaceId, id],
  });
  return rs.rows.length ? rowToTask(rs.rows[0] as unknown as Record<string, unknown>) : null;
}

export async function countOpenTasksForRelationship(db: Executor, workspaceId: string, relationshipId: string): Promise<number> {
  const rs = await db.execute({
    sql: "SELECT COUNT(*) AS c FROM tasks WHERE workspace_id = ? AND relationship_id = ? AND status = 'open'",
    args: [workspaceId, relationshipId],
  });
  return Number(rs.rows[0]?.c ?? 0);
}

export async function insertTask(
  db: Executor,
  args: {
    id: string;
    workspaceId: string;
    relationshipId: string;
    kind: TaskKind;
    title: string;
    amount: number | null;
    currency: string | null;
    dueDate: string | null;
    lastReceivedAt: string | null;
    createdAt: string;
    updatedAt: string;
  },
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO tasks(id, workspace_id, relationship_id, kind, title, amount, currency, due_date,
          status, version, last_received_at, created_at, updated_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 1, ?, ?, ?, NULL)`,
    args: [
      args.id,
      args.workspaceId,
      args.relationshipId,
      args.kind,
      args.title,
      args.amount,
      args.currency,
      args.dueDate,
      args.lastReceivedAt,
      args.createdAt,
      args.updatedAt,
    ],
  });
}

/** 변경된 필드만 갱신. WHERE에 version을 함께 걸어 동시성 충돌을 서버가 감지한다. 0이면 충돌. */
export async function updateTaskFields(
  db: Executor,
  args: {
    workspaceId: string;
    id: string;
    expectedVersion: number;
    newVersion: number;
    updatedAt: string;
    lastReceivedAt: string;
    fields: { title?: string; amount?: number | null; currency?: string | null; due_date?: string | null };
  },
): Promise<number> {
  const setParts: string[] = ["version = ?", "updated_at = ?", "last_received_at = ?"];
  const values: Array<string | number | null> = [args.newVersion, args.updatedAt, args.lastReceivedAt];
  for (const [col, val] of Object.entries(args.fields)) {
    setParts.push(`${col} = ?`);
    values.push(val as string | number | null);
  }
  values.push(args.workspaceId, args.id, args.expectedVersion);
  const rs = await db.execute({
    sql: `UPDATE tasks SET ${setParts.join(", ")} WHERE workspace_id = ? AND id = ? AND version = ?`,
    args: values,
  });
  return rs.rowsAffected;
}

export async function updateTaskStatus(
  db: Executor,
  args: {
    workspaceId: string;
    id: string;
    expectedVersion: number;
    newVersion: number;
    status: TaskStatus;
    completedAt: string | null;
    updatedAt: string;
  },
): Promise<number> {
  const rs = await db.execute({
    sql: `UPDATE tasks SET status = ?, completed_at = ?, version = ?, updated_at = ?
          WHERE workspace_id = ? AND id = ? AND version = ?`,
    args: [args.status, args.completedAt, args.newVersion, args.updatedAt, args.workspaceId, args.id, args.expectedVersion],
  });
  return rs.rowsAffected;
}
