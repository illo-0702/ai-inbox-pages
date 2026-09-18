// 2026-09-19 로컬 OmniRoute(auto 라우팅)로 앱의 실제 프롬프트를 보내 받은 실제 모델 응답을 기록한 회귀 테스트.
// 실제 응답이 스키마 검증과 공통 정규화를 통과하고, 대표 시나리오 값이 기대대로 나오는지 확인한다.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { aiOutputSchema } from "../../src/lib/ai/schema";
import { normalize, type RawExtractedRequest } from "../../src/lib/ai/normalize";
import type { ExtractionInput } from "../../src/lib/types";

interface RecordedCase {
  id: string;
  text: string;
  receivedAt: string;
  org: string | null;
  known: { name: string; contacts: string[] }[];
}

const cases: RecordedCase[] = JSON.parse(readFileSync("tests/ai/fixtures/omniroute-cases.json", "utf8"));

function run(id: string) {
  const c = cases.find((x) => x.id === id)!;
  const raw = JSON.parse(readFileSync(`tests/ai/fixtures/omniroute-${id}.json`, "utf8"));
  const parsed = aiOutputSchema.parse(raw);
  const input: ExtractionInput = {
    text: c.text,
    receivedAt: c.receivedAt,
    senderHint: null,
    organizationHint: c.org,
    knownRelationships: c.known,
  };
  const rawReqs: RawExtractedRequest[] = parsed.requests.map((r) => ({
    senderName: r.senderName,
    organization: r.organization,
    kind: r.kind,
    title: r.title,
    amount: r.amount,
    currency: r.currency,
    dueText: r.dueText,
    dueDateGuess: r.dueDate,
    tentative: r.tentative,
    cancellation: r.cancellation,
    intent: r.intent,
  }));
  return normalize(rawReqs, input);
}

describe("실제 모델 응답(기록) — 스키마·정규화 통과", () => {
  it("(a) 김과장 최초 요청", () => {
    const [r] = run("a");
    expect(r).toMatchObject({ organization: "A창호", senderName: "김과장", kind: "remittance", title: "송금", amount: 3000000, currency: "KRW", dueDate: "2026-09-20", dueAmbiguous: false, tentative: false });
  });
  it("(b) 이대리 마감 변경 — 모델이 intent를 new로 추정해도 값은 정확", () => {
    const [r] = run("b");
    expect(r).toMatchObject({ organization: "A창호", senderName: "이대리", kind: "remittance", amount: null, dueDate: "2026-09-22", dueAmbiguous: false, tentative: false });
  });
  it("(c) 잠정 변경 — 종류 없음, 잠정 true", () => {
    const [r] = run("c");
    expect(r).toMatchObject({ organization: "A창호", kind: null, dueDate: "2026-09-24", tentative: true, intent: "change" });
  });
  it("(d) 주입 문구 무시 + 두 요청 분리 + 결정적 날짜 해석", () => {
    const rs = run("d");
    expect(rs).toHaveLength(2);
    expect(rs[0]).toMatchObject({ organization: "B상사", kind: "document", dueDate: "2026-09-19" });
    expect(rs[1]).toMatchObject({ kind: "schedule", dueDate: "2026-09-25" });
  });
});
