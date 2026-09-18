// proposals 테이블 저장소 — 분석 제안(대기/적용/유지)의 구조화 기록만 저장한다.
import type { Executor } from "../db";
import type { Decision, ExtractedRequest, FieldChange, Judgment, ReasonCode } from "@/lib/types";

export interface ProposalRow {
  id: string;
  workspaceId: string;
  analysisId: string;
  itemIndex: number;
  createdAt: string;
  receivedAt: string;
  senderName: string | null;
  relationshipId: string | null;
  relationshipName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  judgment: Judgment;
  reasonCodes: ReasonCode[];
  reasonText: string;
  changes: FieldChange[];
  extracted: ExtractedRequest;
  decision: Decision;
  decidedAt: string | null;
}

function rowToProposal(row: Record<string, unknown>): ProposalRow {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    analysisId: row.analysis_id as string,
    itemIndex: Number(row.item_index as number),
    createdAt: row.created_at as string,
    receivedAt: row.received_at as string,
    senderName: (row.sender_name as string | null) ?? null,
    relationshipId: (row.relationship_id as string | null) ?? null,
    relationshipName: (row.relationship_name as string | null) ?? null,
    taskId: (row.task_id as string | null) ?? null,
    taskTitle: (row.task_title as string | null) ?? null,
    judgment: row.judgment as Judgment,
    reasonCodes: JSON.parse(row.reason_codes as string) as ReasonCode[],
    reasonText: row.reason_text as string,
    changes: JSON.parse(row.changes as string) as FieldChange[],
    extracted: JSON.parse(row.extracted as string) as ExtractedRequest,
    decision: row.decision as Decision,
    decidedAt: (row.decided_at as string | null) ?? null,
  };
}

const SELECT = `SELECT p.id, p.workspace_id, p.analysis_id, p.item_index, p.created_at, p.received_at,
  p.sender_name, p.relationship_id, p.relationship_name, p.task_id, t.title AS task_title,
  p.judgment, p.reason_codes, p.reason_text, p.changes, p.extracted, p.decision, p.decided_at
  FROM proposals p LEFT JOIN tasks t ON t.id = p.task_id`;

export async function findProposalByIdemKey(
  db: Executor,
  workspaceId: string,
  analysisId: string,
  itemIndex: number,
): Promise<ProposalRow | null> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE p.workspace_id = ? AND p.analysis_id = ? AND p.item_index = ?`,
    args: [workspaceId, analysisId, itemIndex],
  });
  return rs.rows.length ? rowToProposal(rs.rows[0] as unknown as Record<string, unknown>) : null;
}

export async function getProposalRow(db: Executor, workspaceId: string, id: string): Promise<ProposalRow | null> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE p.workspace_id = ? AND p.id = ?`,
    args: [workspaceId, id],
  });
  return rs.rows.length ? rowToProposal(rs.rows[0] as unknown as Record<string, unknown>) : null;
}

export async function listProposalsPending(db: Executor, workspaceId: string): Promise<ProposalRow[]> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE p.workspace_id = ? AND p.decision = 'pending' ORDER BY p.created_at DESC`,
    args: [workspaceId],
  });
  return rs.rows.map((r) => rowToProposal(r as unknown as Record<string, unknown>));
}

export async function listProposalsPendingForRelationship(
  db: Executor,
  workspaceId: string,
  relationshipId: string,
): Promise<ProposalRow[]> {
  const rs = await db.execute({
    sql: `${SELECT} WHERE p.workspace_id = ? AND p.relationship_id = ? AND p.decision = 'pending' ORDER BY p.created_at DESC`,
    args: [workspaceId, relationshipId],
  });
  return rs.rows.map((r) => rowToProposal(r as unknown as Record<string, unknown>));
}

export async function countPendingForTask(db: Executor, workspaceId: string, taskId: string): Promise<number> {
  const rs = await db.execute({
    sql: "SELECT COUNT(*) AS c FROM proposals WHERE workspace_id = ? AND task_id = ? AND decision = 'pending'",
    args: [workspaceId, taskId],
  });
  return Number(rs.rows[0]?.c ?? 0);
}

export async function insertProposalRow(
  db: Executor,
  args: {
    id: string;
    workspaceId: string;
    analysisId: string;
    itemIndex: number;
    createdAt: string;
    receivedAt: string;
    senderName: string | null;
    relationshipId: string | null;
    relationshipName: string | null;
    taskId: string | null;
    judgment: Judgment;
    reasonCodes: ReasonCode[];
    reasonText: string;
    changes: FieldChange[];
    extracted: ExtractedRequest;
    decision: Decision;
    decidedAt: string | null;
  },
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO proposals(id, workspace_id, analysis_id, item_index, created_at, received_at,
          sender_name, relationship_id, relationship_name, task_id, judgment, reason_codes, reason_text,
          changes, extracted, decision, decided_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      args.id,
      args.workspaceId,
      args.analysisId,
      args.itemIndex,
      args.createdAt,
      args.receivedAt,
      args.senderName,
      args.relationshipId,
      args.relationshipName,
      args.taskId,
      args.judgment,
      JSON.stringify(args.reasonCodes),
      args.reasonText,
      JSON.stringify(args.changes),
      JSON.stringify(args.extracted),
      args.decision,
      args.decidedAt,
    ],
  });
}

export async function updateProposalDecision(
  db: Executor,
  workspaceId: string,
  id: string,
  args: {
    decision: Decision;
    decidedAt: string;
    relationshipId: string | null;
    relationshipName: string | null;
    taskId: string | null;
    changes: FieldChange[];
    extracted: ExtractedRequest;
  },
): Promise<void> {
  await db.execute({
    sql: `UPDATE proposals SET decision = ?, decided_at = ?, relationship_id = ?, relationship_name = ?,
          task_id = ?, changes = ?, extracted = ? WHERE workspace_id = ? AND id = ?`,
    args: [
      args.decision,
      args.decidedAt,
      args.relationshipId,
      args.relationshipName,
      args.taskId,
      JSON.stringify(args.changes),
      JSON.stringify(args.extracted),
      workspaceId,
      id,
    ],
  });
}
