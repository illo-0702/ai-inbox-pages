// contacts 테이블 저장소 — 담당자는 apply로 관계가 확정될 때만 upsert 된다.
import type { Executor } from "../db";

export interface ContactRow {
  id: string;
  relationshipId: string;
  displayName: string;
  createdAt: string;
}

export async function listContactNames(db: Executor, workspaceId: string, relationshipId: string): Promise<string[]> {
  const rs = await db.execute({
    sql: "SELECT display_name FROM contacts WHERE workspace_id = ? AND relationship_id = ? ORDER BY created_at ASC",
    args: [workspaceId, relationshipId],
  });
  return rs.rows.map((r) => r.display_name as string);
}

export async function upsertContact(
  db: Executor,
  args: { id: string; workspaceId: string; relationshipId: string; displayName: string; createdAt: string },
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO contacts(id, workspace_id, relationship_id, display_name, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(relationship_id, display_name) DO NOTHING`,
    args: [args.id, args.workspaceId, args.relationshipId, args.displayName, args.createdAt],
  });
}
