import { describe, expect, it } from "vitest";
import { finalizeExtractedText, truncationNotice, UNREADABLE_MARK } from "@/lib/files/text";

describe("finalizeExtractedText", () => {
  it("길이 제한 이내면 그대로 두고 notice는 null", () => {
    const result = finalizeExtractedText("짧은 텍스트", 2000);
    expect(result).toEqual({ text: "짧은 텍스트", truncated: false, notice: null });
  });

  it("2000자를 넘으면 앞부분만 자르고 truncated:true + 안내 문구", () => {
    const raw = "가".repeat(2500);
    const result = finalizeExtractedText(raw, 2000);
    expect(result.text).toBe("가".repeat(2000));
    expect(result.text).toHaveLength(2000);
    expect(result.truncated).toBe(true);
    expect(result.notice).toBe(truncationNotice(2000));
  });

  it("정확히 상한과 같으면 자르지 않는다", () => {
    const raw = "나".repeat(2000);
    const result = finalizeExtractedText(raw, 2000);
    expect(result.truncated).toBe(false);
    expect(result.notice).toBeNull();
  });

  it(`잘린 결과에 ${UNREADABLE_MARK}가 남아있으면 두 안내를 이어붙인다`, () => {
    const raw = "가".repeat(1990) + UNREADABLE_MARK + "나".repeat(50);
    const result = finalizeExtractedText(raw, 2000);
    expect(result.truncated).toBe(true);
    expect(result.notice).toContain(truncationNotice(2000));
    expect(result.notice).toContain("일부 글자를 읽지 못했어요");
  });

  it(`잘리지 않아도 ${UNREADABLE_MARK}가 있으면 판독불가 안내를 붙인다`, () => {
    const result = finalizeExtractedText(`영수증 금액 ${UNREADABLE_MARK} 원`, 2000);
    expect(result.truncated).toBe(false);
    expect(result.notice).toBe("일부 글자를 읽지 못했어요. 날짜·금액을 꼭 확인해주세요.");
  });

  it(`잘려서 ${UNREADABLE_MARK} 표시 자체가 잘려나가면 판독불가 안내는 붙지 않는다`, () => {
    const raw = "가".repeat(2000) + UNREADABLE_MARK;
    const result = finalizeExtractedText(raw, 2000);
    expect(result.truncated).toBe(true);
    expect(result.notice).toBe(truncationNotice(2000));
  });
});
