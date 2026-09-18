// http.ts 요청 스키마 검증 강화 — 잘못된 extracted 값은 400(invalid_request)으로 걸러진다.
import { describe, expect, it } from "vitest";
import { decideRequestSchema } from "@/lib/server/http";
import { baseExtracted, RECEIVED_0918 } from "./helpers";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    analysisId: "a1",
    index: 0,
    receivedAt: RECEIVED_0918,
    decision: "apply" as const,
    extracted: baseExtracted({
      organization: "A창호",
      kind: "remittance",
      amount: 3_000_000,
      currency: "KRW",
      dueDate: "2026-09-20",
      intent: "new",
    }),
    target: { relationship: { newName: "A창호" }, task: "new" as const },
    confirmations: {},
    ...overrides,
  };
}

describe("decideRequestSchema — extracted 검증 강화", () => {
  it("정상적인 요청은 통과한다", () => {
    expect(decideRequestSchema.safeParse(validBody()).success).toBe(true);
  });

  it("음수 금액은 400으로 거부된다", () => {
    const body = validBody();
    body.extracted = { ...body.extracted, amount: -1 };
    expect(decideRequestSchema.safeParse(body).success).toBe(false);
  });

  it("1e13을 넘는 금액은 거부된다", () => {
    const body = validBody();
    body.extracted = { ...body.extracted, amount: 1e13 + 1 };
    expect(decideRequestSchema.safeParse(body).success).toBe(false);
  });

  it("존재하지 않는 날짜(2월 30일)는 거부된다", () => {
    const body = validBody();
    body.extracted = { ...body.extracted, dueDate: "2026-02-30" };
    expect(decideRequestSchema.safeParse(body).success).toBe(false);
  });

  it("날짜 형식이 아닌 문자열은 거부된다", () => {
    const body = validBody();
    body.extracted = { ...body.extracted, dueDate: "날짜아님" };
    expect(decideRequestSchema.safeParse(body).success).toBe(false);
  });

  it("101자를 넘는 이름은 거부된다", () => {
    const body = validBody();
    body.extracted = { ...body.extracted, organization: "가".repeat(101) };
    expect(decideRequestSchema.safeParse(body).success).toBe(false);
  });

  it("공백만 있는 이름은 거부된다(null을 쓰도록 유도)", () => {
    const body = validBody();
    body.extracted = { ...body.extracted, senderName: "   " };
    expect(decideRequestSchema.safeParse(body).success).toBe(false);
  });

  it("소문자 통화 코드는 거부된다", () => {
    const body = validBody();
    body.extracted = { ...body.extracted, currency: "krw" };
    expect(decideRequestSchema.safeParse(body).success).toBe(false);
  });

  it("target.relationship.newName은 1~100자여야 한다", () => {
    const tooLong = validBody({ target: { relationship: { newName: "가".repeat(101) }, task: "new" } });
    expect(decideRequestSchema.safeParse(tooLong).success).toBe(false);
    const empty = validBody({ target: { relationship: { newName: "" }, task: "new" } });
    expect(decideRequestSchema.safeParse(empty).success).toBe(false);
  });
});
