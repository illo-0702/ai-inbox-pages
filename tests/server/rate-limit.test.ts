// 분석 호출 한도의 동시성 안전성 — 단일 원자 UPDATE로 TOCTOU 경합을 막는다.
import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";
import { tryConsumeAnalyzeQuota } from "@/lib/server/repo/workspaces";
import { nowIso } from "@/lib/time";
import { setupWorkspace } from "./helpers";

const opened: Client[] = [];
afterEach(() => {
  for (const c of opened.splice(0)) c.close();
});

describe("tryConsumeAnalyzeQuota — 동시 요청 경합 방지", () => {
  it("한도 5로 10개를 동시에 호출하면 정확히 5개만 허용된다", async () => {
    const { db, workspaceId } = await setupWorkspace();
    opened.push(db);
    const now = nowIso();
    const cutoff = nowIso(new Date(Date.now() - 60 * 60 * 1000));

    const results = await Promise.all(Array.from({ length: 10 }, () => tryConsumeAnalyzeQuota(db, workspaceId, now, cutoff, 5)));
    expect(results.filter(Boolean)).toHaveLength(5);
  });

  it("window가 지나면 다시 허용되고 카운트가 1로 리셋된다", async () => {
    const { db, workspaceId } = await setupWorkspace();
    opened.push(db);
    const now = nowIso();
    const cutoff = nowIso(new Date(Date.now() - 60 * 60 * 1000));
    for (let i = 0; i < 3; i++) {
      expect(await tryConsumeAnalyzeQuota(db, workspaceId, now, cutoff, 3)).toBe(true);
    }
    expect(await tryConsumeAnalyzeQuota(db, workspaceId, now, cutoff, 3)).toBe(false);

    // 1시간 넘게 지난 뒤(=현재 window_start가 cutoff보다 과거) 다시 시도하면 허용된다.
    const later = nowIso(new Date(Date.now() + 61 * 60 * 1000));
    const laterCutoff = nowIso(new Date(Date.now() + 1 * 60 * 1000));
    expect(await tryConsumeAnalyzeQuota(db, workspaceId, later, laterCutoff, 3)).toBe(true);
  });
});
