// libSQL 클라이언트 싱글톤 + 스키마 보장.
// 모든 DB 접근은 이 모듈이 만든 client(또는 그 transaction)를 통해서만 이뤄진다.
import { createClient, type Client, type InStatement, type ResultSet } from "@libsql/client";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** repo 함수들이 받는 최소 실행기 — Client와 Transaction이 모두 만족한다. */
export type Executor = { execute(stmt: InStatement): Promise<ResultSet> };

const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    analyze_count INTEGER NOT NULL DEFAULT 0,
    analyze_window_start TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_relationships_workspace ON relationships(workspace_id)`,
  `CREATE INDEX IF NOT EXISTS idx_relationships_norm ON relationships(workspace_id, normalized_name)`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    relationship_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(relationship_id, display_name)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON contacts(workspace_id)`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_relationship ON contacts(relationship_id)`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    relationship_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    amount INTEGER,
    currency TEXT,
    due_date TEXT,
    status TEXT NOT NULL,
    version INTEGER NOT NULL,
    last_received_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_relationship ON tasks(relationship_id)`,
  `CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    analysis_id TEXT NOT NULL,
    item_index INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    received_at TEXT NOT NULL,
    sender_name TEXT,
    relationship_id TEXT,
    relationship_name TEXT,
    task_id TEXT,
    judgment TEXT NOT NULL,
    reason_codes TEXT NOT NULL,
    reason_text TEXT NOT NULL,
    changes TEXT NOT NULL,
    extracted TEXT NOT NULL,
    decision TEXT NOT NULL,
    decided_at TEXT,
    UNIQUE(workspace_id, analysis_id, item_index)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_proposals_workspace ON proposals(workspace_id)`,
  `CREATE INDEX IF NOT EXISTS idx_proposals_relationship ON proposals(relationship_id)`,
  `CREATE INDEX IF NOT EXISTS idx_proposals_task ON proposals(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_proposals_decision ON proposals(workspace_id, decision)`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    task_id TEXT,
    relationship_id TEXT,
    contact_name TEXT,
    event_type TEXT NOT NULL,
    field_changes TEXT NOT NULL,
    received_at TEXT,
    applied_at TEXT NOT NULL,
    actor TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_events_workspace ON events(workspace_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_task ON events(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_relationship ON events(relationship_id)`,
];

let clientPromise: Promise<Client> | null = null;

/** 앱 전역 싱글톤 client (스키마 보장 완료 후 반환) */
export function getDb(): Promise<Client> {
  if (!clientPromise) clientPromise = initDb();
  return clientPromise;
}

async function initDb(): Promise<Client> {
  const url = process.env.DATABASE_URL ?? "file:data/ai-inbox.db";
  ensureDataDirFor(url);
  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  await ensureSchema(client);
  return client;
}

function ensureDataDirFor(url: string): void {
  if (!url.startsWith("file:")) return;
  const raw = url.slice("file:".length).split("?")[0];
  if (raw === "" || raw === ":memory:") return;
  const dir = path.dirname(path.resolve(raw));
  fs.mkdirSync(dir, { recursive: true });
}

export async function ensureSchema(client: Client): Promise<void> {
  await client.execute("PRAGMA foreign_keys=ON");
  for (const stmt of SCHEMA_STATEMENTS) {
    await client.execute(stmt);
  }
}

/**
 * 테스트 전용 격리 DB. 가능하면 ":memory:"를 쓰되, libsql의 :memory:는
 * 호출마다 다른 논리 커넥션을 빌려 쓸 수 있어 트랜잭션 간 상태가 분리될 수 있다.
 * 실제로 상태가 공유되는지 확인한 뒤, 안 되면 os.tmpdir() 임시 파일로 대체한다.
 */
export async function createTestDb(): Promise<Client> {
  const memClient = createClient({ url: ":memory:" });
  await ensureSchema(memClient);
  if (await supportsCrossCallState(memClient)) return memClient;
  memClient.close();

  const tmpFile = path.join(os.tmpdir(), `ai-inbox-test-${randomUUID()}.db`);
  const fileClient = createClient({ url: `file:${tmpFile}` });
  await ensureSchema(fileClient);
  return fileClient;
}

async function supportsCrossCallState(client: Client): Promise<boolean> {
  try {
    const probeId = `__probe_${randomUUID()}`;
    const stamp = "1970-01-01T00:00:00.000Z";
    await client.execute({
      sql: "INSERT INTO workspaces(id, created_at, expires_at) VALUES (?, ?, ?)",
      args: [probeId, stamp, stamp],
    });
    const rs1 = await client.execute({ sql: "SELECT id FROM workspaces WHERE id = ?", args: [probeId] });
    await client.execute({ sql: "DELETE FROM workspaces WHERE id = ?", args: [probeId] });
    if (rs1.rows.length !== 1) return false;

    const tx = await client.transaction("write");
    try {
      await tx.execute({
        sql: "INSERT INTO workspaces(id, created_at, expires_at) VALUES (?, ?, ?)",
        args: [probeId, stamp, stamp],
      });
      await tx.commit();
    } finally {
      tx.close();
    }
    const rs2 = await client.execute({ sql: "SELECT id FROM workspaces WHERE id = ?", args: [probeId] });
    await client.execute({ sql: "DELETE FROM workspaces WHERE id = ?", args: [probeId] });
    return rs2.rows.length === 1;
  } catch {
    return false;
  }
}
