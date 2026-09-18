// 서버 테스트 공용 헬퍼 — 격리된 테스트 DB와 최소 ExtractedRequest 값을 만든다.
import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import { createTestDb } from "@/lib/server/db";
import { insertWorkspaceRow } from "@/lib/server/repo/workspaces";
import { nowIso, seoulLocalToIso } from "@/lib/time";
import type { ExtractedRequest } from "@/lib/types";

export async function setupWorkspace(): Promise<{ db: Client; workspaceId: string }> {
  const db = await createTestDb();
  const workspaceId = randomUUID();
  await insertWorkspaceRow(db, {
    id: workspaceId,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });
  return { db, workspaceId };
}

/** 두 번째 작업공간을 같은 DB 위에 추가한다(격리 테스트용). */
export async function addWorkspace(db: Client): Promise<string> {
  const workspaceId = randomUUID();
  await insertWorkspaceRow(db, {
    id: workspaceId,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });
  return workspaceId;
}

export function baseExtracted(overrides: Partial<ExtractedRequest> = {}): ExtractedRequest {
  return {
    senderName: null,
    organization: null,
    kind: null,
    title: null,
    amount: null,
    currency: null,
    dueText: null,
    dueDate: null,
    dueAmbiguous: false,
    tentative: false,
    cancellation: false,
    intent: "none",
    ...overrides,
  };
}

export const RECEIVED_0918 = seoulLocalToIso("2026-09-18T09:00");
export const RECEIVED_0919 = seoulLocalToIso("2026-09-19T09:00");
export const RECEIVED_0918_EARLY = seoulLocalToIso("2026-09-18T08:00");
