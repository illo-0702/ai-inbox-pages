// 외부 호출 없이 정규식만으로 동작하는 데모 규칙 엔진. 모든 AI 제공자가 실패했을 때의 폴백.

import type { Intent, TaskKind } from "../types";
import { findDueText } from "./dates";
import { parseAmount } from "./amount";
import type { RawExtractedRequest } from "./normalize";

const TITLE_ALT = "과장|대리|부장|차장|팀장|사원|주임|실장|이사|대표|매니저|님";
const SENDER_RE = new RegExp(`(\\S*?)(${TITLE_ALT})입니다`);

const KIND_PATTERNS: Array<[RegExp, TaskKind]> = [
  [/송금|입금|이체|결제/, "remittance"],
  [/자료|서류|견적|파일|전달|보내/, "document"],
  [/미팅|방문|일정|회의|약속/, "schedule"],
];

const ACTION_VERB_RE = /부탁|해주|바랍|주세요|요청|필요/;
const GREETING_RE = /감사합니다|감사드립니다|고맙습니다|잘\s*받았습니다|수고하셨습니다|확인했습니다|알겠습니다/;
const CHANGE_KEYWORD_RE = /변경|바뀌|수정|말고|대신|연기|미뤄|당겨/;
const CANCELLATION_RE = /취소|철회/;

/** "(업체) (이름+직함)입니다" 패턴에서 회사명과 발신자를 분리한다. */
function parseSender(text: string): { organization: string | null; senderName: string | null } {
  const m = SENDER_RE.exec(text);
  if (!m) return { organization: null, senderName: null };

  const fusedPart = m[1]; // 직함 바로 앞에 공백 없이 붙은 부분(성 등)
  const title = m[2];
  const before = text.slice(0, m.index).replace(/\s+$/, "");

  if (fusedPart) {
    // "김과장" 처럼 직함이 이름에 융합된 경우 → 그 앞은 전부 회사명
    return { organization: before.length ? before : null, senderName: `${fusedPart}${title}` };
  }

  // "대리" 처럼 직함이 단독 토큰인 경우 → 바로 앞 토큰을 이름으로 흡수
  if (!before) return { organization: null, senderName: title };
  const tokens = before.split(/\s+/);
  const nameToken = tokens[tokens.length - 1];
  const orgTokens = tokens.slice(0, -1);
  return {
    organization: orgTokens.length ? orgTokens.join(" ") : null,
    senderName: `${nameToken} ${title}`,
  };
}

function detectKind(text: string): TaskKind | null {
  for (const [re, kind] of KIND_PATTERNS) {
    if (re.test(text)) return kind;
  }
  return null;
}

function detectIntent(
  text: string,
  amount: number | null,
  dueText: string | null,
  kind: TaskKind | null,
): Intent {
  if (CHANGE_KEYWORD_RE.test(text)) return "change";
  // 금액 없이 기한 표현만 있는 후속문 — 송금 건이거나 업무 종류를 알 수 없는 경우에만
  // "기존 조건 변경"으로 본다. document/schedule처럼 원래 금액이 없는 종류는 제외한다.
  const fallbackEligible = kind === "remittance" || kind === null;
  if (fallbackEligible && amount === null && dueText) return "change";
  return "new";
}

/** 원문 한 건을 정규식으로 분석해 RawExtractedRequest[]를 만든다(0건 또는 1건). */
export function extractDemo(text: string): RawExtractedRequest[] {
  const hasAction = ACTION_VERB_RE.test(text);
  const isGreetingOnly = !hasAction && GREETING_RE.test(text);
  if (isGreetingOnly) return [];

  const { organization, senderName } = parseSender(text);
  // 발신자를 못 찾은 문맥 없는 후속문(예: "24일까지 해주셔도 될 것 같긴 한데...")은
  // 업무 종류를 함부로 추측하지 않는다.
  const kind = senderName ? detectKind(text) : null;
  const dueText = findDueText(text);
  const parsedAmount = parseAmount(text);
  const intent = detectIntent(text, parsedAmount.amount, dueText, kind);

  const request: RawExtractedRequest = {
    senderName,
    organization,
    kind,
    title: null,
    amount: null,
    currency: null,
    dueText,
    dueDateGuess: null,
    tentative: false,
    cancellation: CANCELLATION_RE.test(text),
    intent,
  };
  return [request];
}
