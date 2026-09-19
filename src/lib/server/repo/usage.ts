// 공개 링크 비용 보호: 하루(Asia/Seoul) 외부 AI 호출 총량 상한. 작업공간과 무관한 전역 집계이며 내용은 저장하지 않는다.
import type { Client } from "@libsql/client";
import { withWriteTransaction } from "../db";

export const DEFAULT_AI_DAILY_LIMIT = 300;

export function aiDailyLimitFromEnv(env: Record<string, string | undefined>): number {
  const n = Number(env.AI_DAILY_LIMIT);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_AI_DAILY_LIMIT;
}

/** 오늘 외부 AI 호출 1회를 원자적으로 예약한다. 상한에 도달했으면 false. */
export async function tryConsumeGlobalAiQuota(client: Client, day: string, limit: number): Promise<boolean> {
  if (limit <= 0) return false;
  return withWriteTransaction(client, async (tx) => {
    const rs = await tx.execute({
      sql: `INSERT INTO ai_usage (day, count) VALUES (?, 1)
            ON CONFLICT(day) DO UPDATE SET count = count + 1 WHERE ai_usage.count < ?`,
      args: [day, limit],
    });
    return rs.rowsAffected > 0;
  });
}
