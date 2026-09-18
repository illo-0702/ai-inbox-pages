// 원문 속 금액 표현을 결정적으로 파싱한다. "300만원" → 3000000 KRW 등.

export interface ParsedAmount {
  amount: number | null;
  currency: string | null;
}

const BIG_UNITS: Record<string, number> = { 억: 1e8, 만: 1e4 };
const SMALL_UNITS: Record<string, number> = { 천: 1000, 백: 100, 십: 10 };

function parseNumber(raw: string): number {
  return Math.round(Number(raw.replace(/,/g, "")));
}

/** "3백", "5천", "150" 처럼 만/억이 빠진 소단위 묶음을 숫자로 만든다. */
function parseSmallGroup(s: string): number {
  if (!s) return 0;
  let sum = 0;
  let matched = false;
  const re = /(\d+(?:\.\d+)?)(천|백|십)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[0] === "") {
      re.lastIndex += 1;
      continue;
    }
    matched = true;
    const n = Number(m[1]);
    sum += m[2] ? n * SMALL_UNITS[m[2]] : n;
  }
  return matched ? sum : 0;
}

/** "2억 5천만원", "3백만원", "1.5억", "50만" 같은 한국어 숫자 단위 표현을 원화 정수로 변환한다. */
function parseKoreanNumeral(raw: string): number | null {
  let s = raw.replace(/,/g, "").replace(/\s+/g, "").trim();
  if (!s) return null;
  if (s.endsWith("원")) s = s.slice(0, -1);
  if (!s) return null;

  let total = 0;
  let matched = false;

  const eok = /^(\d+(?:\.\d+)?)억/.exec(s);
  if (eok) {
    total += Number(eok[1]) * BIG_UNITS["억"];
    matched = true;
    s = s.slice(eok[0].length);
  }

  const man = /^([^만]*)만/.exec(s);
  if (man) {
    const smallVal = parseSmallGroup(man[1]);
    if (smallVal > 0) {
      total += smallVal * BIG_UNITS["만"];
      matched = true;
    }
    s = s.slice(man[0].length);
  }

  if (s) {
    const smallVal = parseSmallGroup(s);
    if (smallVal > 0) {
      total += smallVal;
      matched = true;
    }
  }

  return matched ? Math.round(total) : null;
}

interface AmountHit {
  index: number;
  end: number;
  amount: number;
  currency: string | null;
}

/** 원문에서 금액 후보를 모두 찾는다. 전화번호·날짜 속 숫자는 제외한다. */
function findAmountHits(text: string): AmountHit[] {
  const hits: AmountHit[] = [];
  const push = (re: RegExp, toHit: (m: RegExpExecArray) => { amount: number | null; currency: string | null }) => {
    for (const m of text.matchAll(re)) {
      const { amount, currency } = toHit(m);
      if (amount === null || !Number.isFinite(amount) || amount <= 0) continue;
      hits.push({ index: m.index, end: m.index + m[0].length, amount, currency });
    }
  };
  push(/\$\s?([\d,]+(?:\.\d+)?)/g, (m) => ({ amount: parseNumber(m[1]), currency: "USD" }));
  push(/USD\s*([\d,]+(?:\.\d+)?)/gi, (m) => ({ amount: parseNumber(m[1]), currency: "USD" }));
  push(/([\d,]+(?:\.\d+)?)\s*달러/g, (m) => ({ amount: parseNumber(m[1]), currency: "USD" }));
  push(/([\d,]+(?:\.\d+)?)\s*엔/g, (m) => ({ amount: parseNumber(m[1]), currency: "JPY" }));
  push(/\d+(?:\.\d+)?(?:억|천|백|십|만)(?:[\d.,\s]*(?:억|천|백|십|만))*\s*원?/g, (m) => ({
    amount: parseKoreanNumeral(m[0]),
    currency: "KRW",
  }));
  push(/(?<![\d.-])([\d,]+)\s*원/g, (m) => ({ amount: parseNumber(m[1]), currency: "KRW" }));
  // 통화 표시 없는 숫자는 천 단위 쉼표가 있을 때만 금액 후보로 본다 (연도·전화번호 오인 방지)
  push(/(?<![\d.,-])(\d{1,3}(?:,\d{3})+)(?![\d.,-]|\s*원)/g, (m) => ({ amount: parseNumber(m[1]), currency: null }));

  // 같은 구간을 여러 패턴이 잡은 경우 먼저 나온(더 구체적인) 것만 남긴다
  const kept: AmountHit[] = [];
  for (const h of hits) {
    if (kept.some((k) => h.index < k.end && k.index < h.end)) continue;
    kept.push(h);
  }
  return kept.sort((a, b) => a.index - b.index);
}

/**
 * 원문에서 금액과 통화를 함께 추출한다. 못 찾으면 둘 다 null.
 * 서로 다른 금액이 여러 개면("300만원 말고 350만원으로") "(으)로" 바로 앞 금액을 새 값으로 보고,
 * 그런 표지가 없으면 판단하지 않고 null을 돌려준다(AI 해석 또는 사용자 확인에 맡김).
 */
export function parseAmount(text: string): ParsedAmount {
  const hits = findAmountHits(text);
  const distinct = hits.filter(
    (h, i) => hits.findIndex((o) => o.amount === h.amount && o.currency === h.currency) === i,
  );
  if (distinct.length === 0) return { amount: null, currency: null };
  if (distinct.length === 1) return { amount: distinct[0].amount, currency: distinct[0].currency };

  const targets = hits.filter((h) => /^\s*(?:으로|로)(?![가-힣]*\s*(?:말고|대신))/.test(text.slice(h.end)));
  if (targets.length > 0) {
    const t = targets[targets.length - 1];
    return { amount: t.amount, currency: t.currency };
  }
  return { amount: null, currency: null };
}
