// 원문 기한 표현("dueText")을 받은 날짜(receivedAt) 기준으로 결정적으로 해석한다.
// AI 출력의 날짜는 참고용일 뿐, 최종 판단은 항상 이 모듈이 내린다 (계약서 2장).

import type { DateString, IsoDateTime } from "../types";
import {
  addDays,
  daysInMonth,
  isValidYmd,
  parseDateString,
  seoulDateOf,
  toDateString,
  weekdayOf,
} from "../time";

export interface ResolveDueResult {
  date: DateString | null;
  ambiguous: boolean;
  /** true면 이 모듈이 dueText 패턴을 인식해 date를 확정했다는 뜻(그 값이 null이어도). */
  matched: boolean;
}

const WEEKDAY_INDEX: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

/** dueText 인식에 쓰는 날짜 표현 정규식 조각(공용, findDueText와 공유). */
const DATE_PHRASE_SOURCE =
  "(?:\\d{4}-\\d{1,2}-\\d{1,2}" +
  "|\\d{4}\\.\\d{1,2}\\.\\d{1,2}" +
  "|\\d{1,2}월\\s*\\d{1,2}일" +
  "|\\d{1,2}\\/\\d{1,2}" +
  "|\\d{1,2}\\.\\d{1,2}" +
  "|다음\\s*주\\s*[일월화수목금토]요일" +
  "|이번\\s*주\\s*[일월화수목금토]요일" +
  "|말일|월말" +
  "|\\d{1,2}일\\s*(?:뒤|후)" +
  "|글피|모레|내일|오늘" +
  "|\\d{1,2}일)";

/** 원문 전체에서 기한 표현 구절을 하나 찾아 돌려준다(데모 규칙 엔진이 사용). */
export function findDueText(text: string): string | null {
  const re = new RegExp(DATE_PHRASE_SOURCE + "(?:까지)?");
  const m = re.exec(text);
  return m ? m[0] : null;
}

/** dueText를 받은 시각 기준으로 해석한다. */
export function resolveDue(dueText: string | null, receivedAt: IsoDateTime): ResolveDueResult {
  if (!dueText) return { date: null, ambiguous: false, matched: false };

  const s = dueText.trim().replace(/까지\s*$/, "").trim();
  if (!s) return { date: null, ambiguous: false, matched: false };

  const received = seoulDateOf(receivedAt);
  const { y: ry, m: rm } = parseDateString(received);

  const finalize = (y: number, mo: number, d: number, ambiguous: boolean): ResolveDueResult => {
    if (!isValidYmd(y, mo, d)) return { date: null, ambiguous: true, matched: true };
    return { date: toDateString(y, mo, d), ambiguous, matched: true };
  };

  const resolveNextMonth = (y: number, mo: number, day: number): ResolveDueResult => {
    let ny = y;
    let nm = mo + 1;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    return finalize(ny, nm, day, true);
  };

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return finalize(Number(m[1]), Number(m[2]), Number(m[3]), false);

  m = /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/.exec(s);
  if (m) return finalize(Number(m[1]), Number(m[2]), Number(m[3]), false);

  m = /^(\d{1,2})월\s*(\d{1,2})일$/.exec(s);
  if (m) return finalize(ry, Number(m[1]), Number(m[2]), false);

  m = /^(\d{1,2})\/(\d{1,2})$/.exec(s);
  if (m) return finalize(ry, Number(m[1]), Number(m[2]), false);

  m = /^(\d{1,2})\.(\d{1,2})$/.exec(s);
  if (m) return finalize(ry, Number(m[1]), Number(m[2]), false);

  m = /^다음\s*주\s*([일월화수목금토])요일$/.exec(s);
  if (m) {
    const rw = weekdayOf(received);
    const target = WEEKDAY_INDEX[m[1]];
    const diff = 7 - rw + target;
    return { date: addDays(received, diff), ambiguous: false, matched: true };
  }

  m = /^이번\s*주\s*([일월화수목금토])요일$/.exec(s);
  if (m) {
    const rw = weekdayOf(received);
    const target = WEEKDAY_INDEX[m[1]];
    return { date: addDays(received, target - rw), ambiguous: false, matched: true };
  }

  if (/^(말일|월말)$/.test(s)) {
    return { date: toDateString(ry, rm, daysInMonth(ry, rm)), ambiguous: false, matched: true };
  }

  m = /^(\d{1,2})일\s*(?:뒤|후)$/.exec(s);
  if (m) return { date: addDays(received, Number(m[1])), ambiguous: false, matched: true };

  if (s === "오늘") return { date: received, ambiguous: false, matched: true };
  if (s === "내일") return { date: addDays(received, 1), ambiguous: false, matched: true };
  if (s === "모레") return { date: addDays(received, 2), ambiguous: false, matched: true };
  if (s === "글피") return { date: addDays(received, 3), ambiguous: false, matched: true };

  m = /^(\d{1,2})일$/.exec(s);
  if (m) {
    const day = Number(m[1]);
    if (!isValidYmd(ry, rm, day)) return resolveNextMonth(ry, rm, day);
    const candidate = toDateString(ry, rm, day);
    if (candidate < received) return resolveNextMonth(ry, rm, day);
    return { date: candidate, ambiguous: false, matched: true };
  }

  return { date: null, ambiguous: false, matched: false };
}
