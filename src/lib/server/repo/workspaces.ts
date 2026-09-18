// workspaces 테이블 저장소 — 세션 격리 단위.
import type { Client } from "@libsql/client";
import type { Executor } from "../db";
import { withWriteTransaction } from "../db";

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

export async function deleteExpiredWorkspaces(db: Executor, nowIso: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM workspaces WHERE expires_at < ?", args: [nowIso] });
}

/**
 * 분석 호출 한도를 단일 원자 UPDATE로 검사·소비한다(읽고-쓰는 두 단계로 나누면 동시 요청에서 경합이 생긴다).
 * window가 만료됐거나(analyze_window_start가 없거나 cutoff보다 과거) 아직 한도 미만이면 허용하고 그 자리에서 카운트를 올린다.
 * rowsAffected > 0 이면 허용, 0이면 한도 초과(또는 작업공간 없음).
 */
export async function tryConsumeAnalyzeQuota(
  client: Client,
  workspaceId: string,
  nowIsoStr: string,
  cutoffIsoStr: string,
  limit: number,
): Promise<boolean> {
  return withWriteTransaction(client, async (tx) => {
    const rs = await tx.execute({
      sql: `UPDATE workspaces
            SET analyze_count = CASE WHEN analyze_window_start IS NULL OR analyze_window_start < ? THEN 1 ELSE analyze_count + 1 END,
                analyze_window_start = CASE WHEN analyze_window_start IS NULL OR analyze_window_start < ? THEN ? ELSE analyze_window_start END
            WHERE id = ? AND (analyze_window_start IS NULL OR analyze_window_start < ? OR analyze_count < ?)`,
      args: [cutoffIsoStr, cutoffIsoStr, nowIsoStr, workspaceId, cutoffIsoStr, limit],
    });
    return rs.rowsAffected > 0;
  });
}

/** 작업공간과 그 아래 모든 데이터를 하나의 트랜잭션(원자적)으로 삭제한다. FK cascade에 의존하지 않는다. */
export async function deleteWorkspaceCascade(client: Client, workspaceId: string): Promise<void> {
  await withWriteTransaction(client, async (tx) => {
    await tx.execute({ sql: "DELETE FROM events WHERE workspace_id = ?", args: [workspaceId] });
    await tx.execute({ sql: "DELETE FROM proposals WHERE workspace_id = ?", args: [workspaceId] });
    await tx.execute({ sql: "DELETE FROM tasks WHERE workspace_id = ?", args: [workspaceId] });
    await tx.execute({ sql: "DELETE FROM contacts WHERE workspace_id = ?", args: [workspaceId] });
    await tx.execute({ sql: "DELETE FROM relationships WHERE workspace_id = ?", args: [workspaceId] });
    await tx.execute({ sql: "DELETE FROM workspaces WHERE id = ?", args: [workspaceId] });
  });
}
