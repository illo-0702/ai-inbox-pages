import { describe, expect, it } from "vitest";
import { detectTentative } from "../../src/lib/ai/normalize";

describe("detectTentative", () => {
  const positive = [
    "24일까지 해주셔도 될 것 같긴 한데 기존 일정 한번 확인해볼게요.",
    "가능할 것 같은데 확인해볼게요.",
    "아마 가능할 것 같습니다.",
    "아직 미정이라 다음 주에 다시 연락드릴게요.",
    "혹시 가능할까요?",
    "지금 검토 중이라 확답은 어렵습니다.",
  ];

  const negative = [
    "22일까지 부탁드립니다.",
    "300만원 송금 부탁드립니다.",
    "일정은 확정입니다.",
    "완료했습니다. 감사합니다.",
    "네 알겠습니다 감사합니다.",
  ];

  it.each(positive)("잠정 표현으로 인식: '%s'", (text) => {
    expect(detectTentative(text)).toBe(true);
  });

  it.each(negative)("잠정 표현 아님: '%s'", (text) => {
    expect(detectTentative(text)).toBe(false);
  });
});

import { cleanTitle } from "../../src/lib/ai/normalize";

describe("cleanTitle — 금액·기한·업체명 제거", () => {
  it.each([
    ["300만원 송금", null, "송금"],
    ["A창호 300만원 송금", "A창호", "송금"],
    ["기존 일정 확인 후 기한(24일) 조정 검토", null, "기존 일정 확인 후 기한 조정 검토"],
    ["9월 22일까지 견적서 전달", null, "견적서 전달"],
    ["3,000,000원", null, null],
    ["내일까지 계약서 사본 전달", null, "계약서 사본 전달"],
  ] as const)("%s", (input, org, expected) => {
    expect(cleanTitle(input, org)).toBe(expected);
  });
});
