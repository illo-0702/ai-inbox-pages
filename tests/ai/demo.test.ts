import { describe, expect, it } from "vitest";
import { extractDemo } from "../../src/lib/ai/demo";
import { normalize } from "../../src/lib/ai/normalize";
import { seoulLocalToIso } from "../../src/lib/time";
import type { ExtractionInput } from "../../src/lib/types";

function run(text: string, receivedLocal: string) {
  const input: ExtractionInput = {
    text,
    receivedAt: seoulLocalToIso(receivedLocal),
    senderHint: null,
    organizationHint: null,
    knownRelationships: [],
  };
  return normalize(extractDemo(text), input);
}

describe("데모 규칙 엔진 (기획서 6장 시나리오)", () => {
  it("(a) 최초 요청: A창호 김과장, 송금 300만원, 20일까지, 신규", () => {
    const [r] = run("A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다.", "2026-09-18T09:00");
    expect(r.organization).toBe("A창호");
    expect(r.senderName).toBe("김과장");
    expect(r.kind).toBe("remittance");
    expect(r.amount).toBe(3_000_000);
    expect(r.currency).toBe("KRW");
    expect(r.dueDate).toBe("2026-09-20");
    expect(r.dueAmbiguous).toBe(false);
    expect(r.tentative).toBe(false);
    expect(r.intent).toBe("new");
  });

  it("(b) 다른 담당자의 마감 변경: A창호 이대리, 금액 없음, 22일까지, change", () => {
    const [r] = run("A창호 이대리입니다. 송금은 22일까지 부탁드립니다.", "2026-09-19T09:00");
    expect(r.organization).toBe("A창호");
    expect(r.senderName).toBe("이대리");
    expect(r.kind).toBe("remittance");
    expect(r.amount).toBeNull();
    expect(r.dueDate).toBe("2026-09-22");
    expect(r.intent).toBe("change");
  });

  it("(c) 잠정 변경: 업체·발신자 없음, kind null, tentative true, 24일까지, change", () => {
    const [r] = run(
      "24일까지 해주셔도 될 것 같긴 한데 기존 일정 한번 확인해볼게요.",
      "2026-09-19T09:00",
    );
    expect(r.organization).toBeNull();
    expect(r.senderName).toBeNull();
    expect(r.kind).toBeNull();
    expect(r.dueDate).toBe("2026-09-24");
    expect(r.tentative).toBe(true);
    expect(r.intent).toBe("change");
  });

  it("감사 인사만 있으면 빈 배열", () => {
    const result = run("감사합니다 잘 받았습니다.", "2026-09-19T09:00");
    expect(result).toEqual([]);
  });

  it("자료 전달 요청을 document로 분류한다", () => {
    const [r] = run("B상사 박부장입니다. 견적서 자료 오늘까지 전달 부탁드립니다.", "2026-09-19T09:00");
    expect(r.organization).toBe("B상사");
    expect(r.senderName).toBe("박부장");
    expect(r.kind).toBe("document");
    expect(r.intent).toBe("new");
  });

  it("업체 없이 이름만 있는 신규 자료 요청: org null, sender '이영호 대리', kind document, intent new", () => {
    const [r] = run("이영호 대리입니다. 25일까지 견적서 보내주세요.", "2026-09-19T09:00");
    expect(r.organization).toBeNull();
    expect(r.senderName).toBe("이영호 대리");
    expect(r.kind).toBe("document");
    expect(r.intent).toBe("new");
  });
});
