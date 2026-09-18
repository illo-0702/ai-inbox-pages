// events 테이블 저장소 — 구조화된 사건 이력. 원문은 절대 저장하지 않는다.
import type { Executor } from "../db";
import type { EventType, FieldChange } from "@/lib/types";

export interface EventRow {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  relationshipId: string | null;
  contactName: string | null;
  eventType: EventType;
  fieldChanges: FieldChange[];
  receivedAt: string | null;
  appliedAt: string;
  actor: "user";
}

function rowToEvent(row: Record<string, unknown>): EventRow {
  return {
    id: row.id as string,
    taskId: (row.task_id as string | null) ?? null,
    taskTitle: (row.task_title as string | null) ?? null,
    relationshipId: (row.relationship_id as string | null) ?? null,
    contactName: (row.contact_name as string | null) ?? null,
    eventType: row.event_type as EventType,
    fieldChanges: JSON.parse(row.field_changes as string) as FieldChange[],
    receivedAt: (row.received_at as string | null) ?? null,
    appliedAt: row.applied_at as string,
    actor: "user",
  };
}

const SELECT = `SELECT e.id, e.task_id, t.title AS task_title, e.relationship_id, e.contact_name,
  e.event_type, e.field_changes, e.received_at, e.applied_at
  FROM events e LEFT JOIN tasks t ON t.id = e.task_id`;

export async function insertEventRow(
  db: Executor,
  args: {
    id: string;
    workspaceId: string;
    taskId: string | null;
    relationshipId: string | null;
    contactName: string | null;
    eventType: EventType;
    fieldChanges: FieldChange[];
    receivedAt: string | null;
    appliedAt: string;
  },
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO events(id, workspace_id, task_id, relationship_id, contact_name, event_type,
          field_changes, received_at, applied_at, actor)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')`,
    args: [
      args.id,
      args.workspaceId,
      args.taskId,
      args.relationshipId,
      args.contactName,
      args.eventType,
      JSON.stringify(args.fieldChanges),
      args.receivedAt,
      args.appliedAt,
    ],
  });
}

export async function getLatestTaskUpdatedEvent(db: Executor, workspaceId: string, taskId: string): Promise<EventRow | null> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE e.workspace_id = ? AND e.task_id = ? AND e.event_type = 'task_updated'
          ORDER BY e.applied_at DESC LIMIT 1`,
    args: [workspaceId, taskId],
  });
  return rs.rows.length ? rowToEvent(rs.rows[0] as unknown as Record<string, unknown>) : null;
}

export async function listEventsForRelationship(db: Executor, workspaceId: string, relationshipId: string): Promise<EventRow[]> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE e.workspace_id = ? AND e.relationship_id = ? ORDER BY e.applied_at DESC`,
    args: [workspaceId, relationshipId],
  });
  return rs.rows.map((r) => rowToEvent(r as unknown as Record<string, unknown>));
}
