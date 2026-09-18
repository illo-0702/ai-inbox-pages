// AI든 데모 규칙 엔진이든, 결과는 반드시 이 모듈을 거쳐 ExtractedRequest[]가 된다.
// 날짜 재해석(resolveDue), 금액 재파싱(parseAmount), 잠정 표현 탐지(detectTentative),
// 빈 문자열 정리, 힌트 채우기, 기본 제목 채우기를 모두 여기서 일괄 처리한다.

import type { DateString, ExtractedRequest, ExtractionInput, Intent, TaskKind } from "../types";
import { isValidDateString } from "../time";
import { resolveDue } from "./dates";
import { parseAmount } from "./amount";

/** 정규화 이전, 제공자별 어댑터·데모 엔진이 공통으로 만들어내는 중간 표현. */
export interface RawExtractedRequest {
  senderName: string | null;
  organization: string | null;
  kind: TaskKind | null;
  title: string | null;
  amount: number | null;
  currency: string | null;
  dueText: string | null;
  /** AI가 제시한 원시 날짜 추정(참고용). 데모 엔진은 항상 null. */
  dueDateGuess: string | null;
  tentative: boolean;
  cancellation: boolean;
  intent: Intent;
}

const TENTATIVE_PATTERNS: RegExp[] = [
  /것\s*같/,
  /확인해\s*(?:볼게|보겠|봐야|볼\s*예정)/,
  /아마/,
  /될\s*수도/,
  /가능할\s*(?:수도|것)/,
  /예정인데/,
  /미정/,
  /혹시/,
  /검토\s*중/,
  /잠정/,
  /보류/,
];

/** 계약서 정규식 목록 + 합리적 확장으로 잠정·조건부 표현을 탐지한다. */
export function detectTentative(text: string): boolean {
  return TENTATIVE_PATTERNS.some((re) => re.test(text));
}

function emptyToNull(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  return t.length ? t : null;
}

/** 제목에서 금액·기한·업체명을 걷어내 동작만 남긴다. 카드가 금액·마감을 따로 보여주기 때문이다. */
export function cleanTitle(title: string | null, organization: string | null): string | null {
  if (!title) return null;
  let t = title;
  if (organization) t = t.split(organization).join(" ");
  t = t
    .replace(/\([^)]*\d[^)]*\)/g, " ") // 숫자가 든 괄호: "(24일)", "(3,000,000원)"
    .replace(/\d+(?:\.\d+)?(?:억|천|백|십|만)(?:[\d.,\s]*(?:억|천|백|십|만))*\s*원?/g, " ")
    .replace(/[\d,]+\s*(?:원|달러|엔)/g, " ")
    .replace(/(?:\d{4}[-./년]\s*)?\d{1,2}\s*[-./월]\s*\d{1,2}\s*일?(?:\s*(?:까지|이내|전))?/g, " ")
    .replace(/\d{1,2}\s*일(?:\s*(?:까지|이내|전))?/g, " ")
    .replace(/(?:오늘|내일|모레|글피)(?:\s*까지)?/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,./·:-]+|[\s,./·:-]+$/g, "")
    .trim();
  if (!t) return null;
  return t.length > 40 ? t.slice(0, 40).trim() : t;
}

function defaultTitle(kind: TaskKind): string {
  switch (kind) {
    case "remittance":
      return "송금";
    case "document":
      return "자료 전달";
    case "schedule":
      return "일정";
    case "other":
      return "요청 처리";
  }
}

/** raw 추출 결과 배열을 공통 규칙으로 정규화한다. */
export function normalize(raw: RawExtractedRequest[], input: ExtractionInput): ExtractedRequest[] {
  const globalTentative = detectTentative(input.text);
  const parsedAmount = parseAmount(input.text);
  const single = raw.length === 1;

  return raw.map((r): ExtractedRequest => {
    const senderName = emptyToNull(r.senderName) ?? input.senderHint ?? null;
    const organization = emptyToNull(r.organization) ?? input.organizationHint ?? null;
    const kind = r.kind ?? null;

    let title = cleanTitle(emptyToNull(r.title), emptyToNull(r.organization) ?? input.organizationHint);
    if (!title && kind) title = defaultTitle(kind);

    let amount = r.amount ?? null;
    let currency = emptyToNull(r.currency);
    if (single && parsedAmount.amount !== null) {
      amount = parsedAmount.amount;
      currency = parsedAmount.currency;
    }

    const dueText = emptyToNull(r.dueText);
    const resolved = resolveDue(dueText, input.receivedAt);

    let dueDate: DateString | null;
    let dueAmbiguous: boolean;
    if (resolved.matched) {
      dueDate = resolved.date;
      dueAmbiguous = resolved.ambiguous;
    } else {
      const guess = emptyToNull(r.dueDateGuess);
      if (guess && isValidDateString(guess)) {
        dueDate = guess;
        dueAmbiguous = true;
      } else {
        dueDate = null;
        dueAmbiguous = false;
      }
    }

    return {
      senderName,
      organization,
      kind,
      title,
      amount,
      currency,
      dueText,
      dueDate,
      dueAmbiguous,
      tentative: r.tentative || globalTentative,
      cancellation: r.cancellation,
      intent: r.intent,
    };
  });
}
