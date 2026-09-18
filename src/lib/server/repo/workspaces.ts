// workspaces 테이블 저장소 — 세션 격리 단위.
import type { Client } from "@libsql/client";
import type { Executor } from "../db";

export interface WorkspaceRow {
  id: string;
  createdAt: string;
  expiresAt: string;
  analyzeCount: number;
  analyzeWindowStart: string | null;
}

function rowToWorkspace(row: Record<string, unknown>): WorkspaceRow {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
    analyzeCount: Number(row.analyze_count as number),
    analyzeWindowStart: (row.analyze_window_start as string | null) ?? null,
  };
}

export async function getWorkspaceRow(db: Executor, id: string): Promise<WorkspaceRow | null> {
  const rs = await db.execute({
    sql: "SELECT id, created_at, expires_at, analyze_count, analyze_window_start FROM workspaces WHERE id = ?",
    args: [id],
  });
  return rs.rows.length ? rowToWorkspace(rs.rows[0] as unknown as Record<string, unknown>) : null;
}

export async function insertWorkspaceRow(
  db: Executor,
  args: { id: string; createdAt: string; expiresAt: string },
): Promise<void> {
  await db.execute({
    sql: "INSERT INTO workspaces(id, created_at, expires_at, analyze_count, analyze_window_start) VALUES (?, ?, ?, 0, NULL)",
    args: [args.id, args.createdAt, args.expiresAt],
  });
}

export async function updateAnalyzeWindow(
  db: Executor,
  id: string,
  count: number,
  windowStart: string,
): Promise<void> {
  await db.execute({
    sql: "UPDATE workspaces SET analyze_count = ?, analyze_window_start = ? WHERE id = ?",
    args: [count, windowStart, id],
  });
}

export async function deleteExpiredWorkspaces(db: Executor, nowIso: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM workspaces WHERE expires_at < ?", args: [nowIso] });
}

/** 작업공간과 그 아래 모든 데이터를 하나의 배치(원자적)로 삭제한다. FK cascade에 의존하지 않는다. */
export async function deleteWorkspaceCascade(client: Client, workspaceId: string): Promise<void> {
  await client.batch(
    [
      { sql: "DELETE FROM events WHERE workspace_id = ?", args: [workspaceId] },
      { sql: "DELETE FROM proposals WHERE workspace_id = ?", args: [workspaceId] },
      { sql: "DELETE FROM tasks WHERE workspace_id = ?", args: [workspaceId] },
      { sql: "DELETE FROM contacts WHERE workspace_id = ?", args: [workspaceId] },
      { sql: "DELETE FROM relationships WHERE workspace_id = ?", args: [workspaceId] },
      { sql: "DELETE FROM workspaces WHERE id = ?", args: [workspaceId] },
    ],
    "write",
  );
}
