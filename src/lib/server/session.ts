// 세션(작업공간) 관리 — 구현 계약 7장.
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { nowIso } from "@/lib/time";
import type { IsoDateTime } from "@/lib/types";
import { getDb } from "./db";
import {
  deleteExpiredWorkspaces,
  deleteWorkspaceCascade,
  getWorkspaceRow,
  insertWorkspaceRow,
  tryConsumeAnalyzeQuota,
} from "./repo/workspaces";

const COOKIE_NAME = "ai_inbox_sid";
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS ?? 86400);
const ANALYZE_RATE_LIMIT_PER_HOUR = Number(process.env.ANALYZE_RATE_LIMIT_PER_HOUR ?? 60);
const CLEANUP_INTERVAL_MS = 60_000;
const HOUR_MS = 60 * 60 * 1000;

let lastCleanupAt = 0;

export interface WorkspaceSession {
  id: string;
  expiresAt: IsoDateTime;
}

/** 계약 7장: 32바이트 난수 base64url. */
function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

async function maybeCleanupExpired(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  const db = await getDb();
  await deleteExpiredWorkspaces(db, nowIso());
}

/** 쿠키의 작업공간을 조회하고, 없거나 만료됐으면(옵션에 따라) 새로 만든다. */
export async function getWorkspace(options: { create?: boolean } = {}): Promise<WorkspaceSession | null> {
  const create = options.create ?? true;
  await maybeCleanupExpired();
  const db = await getDb();
  const store = await cookies();
  const sid = store.get(COOKIE_NAME)?.value ?? null;

  if (sid) {
    const row = await getWorkspaceRow(db, sid);
    if (row && Date.parse(row.expiresAt) > Date.now()) {
      return { id: row.id, expiresAt: row.expiresAt };
    }
  }
  if (!create) return null;

  const id = generateSessionId();
  const createdAt = nowIso();
  const expiresAt = nowIso(new Date(Date.now() + SESSION_TTL_SECONDS * 1000));
  await insertWorkspaceRow(db, { id, createdAt, expiresAt });
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
  return { id, expiresAt };
}

/** DELETE /api/session — 작업공간과 그 아래 데이터를 모두 삭제하고 쿠키를 지운다. */
export async function destroySession(): Promise<void> {
  const db = await getDb();
  const store = await cookies();
  const sid = store.get(COOKIE_NAME)?.value ?? null;
  if (sid) {
    await deleteWorkspaceCascade(db, sid);
  }
  store.delete(COOKIE_NAME);
}

/**
 * 세션당 분석 호출 상한(시간당). 단일 원자 UPDATE로 검사와 소비를 함께 처리해
 * 동시 요청 경합(TOCTOU)이 생기지 않게 한다. 초과 시 false.
 */
export async function checkAnalyzeRateLimit(workspaceId: string): Promise<boolean> {
  const db = await getDb();
  const now = nowIso();
  const cutoff = nowIso(new Date(Date.now() - HOUR_MS));
  return tryConsumeAnalyzeQuota(db, workspaceId, now, cutoff, ANALYZE_RATE_LIMIT_PER_HOUR);
}
