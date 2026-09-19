// 공개 링크 비용 보호(하루 외부 AI 호출 총량)와 배포 환경 DB 주소 결정.
import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";
import { createTestDb, resolveDatabaseUrl } from "@/lib/server/db";
import { aiDailyLimitFromEnv, tryConsumeGlobalAiQuota } from "@/lib/server/repo/usage";

const opened: Client[] = [];
afterEach(() => {
  for (const c of opened.splice(0)) c.close();
});

describe("하루 AI 호출 총량", () => {
  it("동시 호출이 섞여도 상한을 넘지 않는다", async () => {
    const db = await createTestDb();
    opened.push(db);
    const results = await Promise.all(Array.from({ length: 12 }, () => tryConsumeGlobalAiQuota(db, "2026-09-19", 5)));
    expect(results.filter(Boolean)).toHaveLength(5);
    const rs = await db.execute({ sql: "SELECT count FROM ai_usage WHERE day = ?", args: ["2026-09-19"] });
    expect(Number(rs.rows[0].count)).toBe(5);
  });

  it("날짜가 바뀌면 다시 허용한다", async () => {
    const db = await createTestDb();
    opened.push(db);
    expect(await tryConsumeGlobalAiQuota(db, "2026-09-19", 1)).toBe(true);
    expect(await tryConsumeGlobalAiQuota(db, "2026-09-19", 1)).toBe(false);
    expect(await tryConsumeGlobalAiQuota(db, "2026-09-20", 1)).toBe(true);
  });

  it("상한 0이면 외부 호출을 쓰지 않는다, 기본값은 300", async () => {
    const db = await createTestDb();
    opened.push(db);
    expect(await tryConsumeGlobalAiQuota(db, "2026-09-19", 0)).toBe(false);
    expect(aiDailyLimitFromEnv({})).toBe(300);
    expect(aiDailyLimitFromEnv({ AI_DAILY_LIMIT: "50" })).toBe(50);
    expect(aiDailyLimitFromEnv({ AI_DAILY_LIMIT: "abc" })).toBe(300);
  });
});

describe("DB 주소 결정", () => {
  it("DATABASE_URL → TURSO_DATABASE_URL → Vercel 임시 파일 → 로컬 파일 순서", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "libsql://a.turso.io", TURSO_DATABASE_URL: "libsql://b.turso.io" })).toBe("libsql://a.turso.io");
    expect(resolveDatabaseUrl({ TURSO_DATABASE_URL: "libsql://b.turso.io", VERCEL: "1" })).toBe("libsql://b.turso.io");
    expect(resolveDatabaseUrl({ VERCEL: "1" })).toBe("file:/tmp/ai-inbox.db");
    expect(resolveDatabaseUrl({})).toBe("file:data/ai-inbox.db");
  });
});
