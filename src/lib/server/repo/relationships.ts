// relationships 테이블 저장소 — 모든 쿼리에 workspace_id 조건을 건다.
import type { Executor } from "../db";

export interface RelationshipRow {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
}

function rowToRelationship(row: Record<string, unknown>): RelationshipRow {
  return {
    id: row.id as string,
    name: row.name as string,
    normalizedName: row.normalized_name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const SELECT = "SELECT id, name, normalized_name, created_at, updated_at FROM relationships";

export async function listRelationshipRows(db: Executor, workspaceId: string): Promise<RelationshipRow[]> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE workspace_id = ? ORDER BY created_at ASC`,
    args: [workspaceId],
  });
  return rs.rows.map((r) => rowToRelationship(r as unknown as Record<string, unknown>));
}

export async function getRelationshipRow(db: Executor, workspaceId: string, id: string): Promise<RelationshipRow | null> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE workspace_id = ? AND id = ?`,
    args: [workspaceId, id],
  });
  return rs.rows.length ? rowToRelationship(rs.rows[0] as unknown as Record<string, unknown>) : null;
}

export async function findRelationshipsByNormalizedName(
  db: Executor,
  workspaceId: string,
  normalizedName: string,
): Promise<RelationshipRow[]> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE workspace_id = ? AND normalized_name = ?`,
    args: [workspaceId, normalizedName],
  });
  return rs.rows.map((r) => rowToRelationship(r as unknown as Record<string, unknown>));
}

export async function insertRelationship(
  db: Executor,
  args: { id: string; workspaceId: string; name: string; normalizedName: string; createdAt: string },
): Promise<void> {
  await db.execute({
    sql: "INSERT INTO relationships(id, workspace_id, name, normalized_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [args.id, args.workspaceId, args.name, args.normalizedName, args.createdAt, args.createdAt],
  });
}

export async function touchRelationship(db: Executor, workspaceId: string, id: string, updatedAt: string): Promise<void> {
  await db.execute({
    sql: "UPDATE relationships SET updated_at = ? WHERE workspace_id = ? AND id = ?",
    args: [updatedAt, workspaceId, id],
  });
}
