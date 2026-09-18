import { describe, expect, it } from "vitest";
import { resolveDue } from "../../src/lib/ai/dates";
import { seoulLocalToIso } from "../../src/lib/time";

interface Case {
  label: string;
  dueText: string | null;
  receivedLocal: string;
  date: string | null;
  ambiguous: boolean;
  matched: boolean;
}

const cases: Case[] = [
  { label: "내일", dueText: "내일", receivedLocal: "2026-09-18T09:00", date: "2026-09-19", ambiguous: false, matched: true },
  { label: "오늘", dueText: "오늘", receivedLocal: "2026-09-18T09:00", date: "2026-09-18", ambiguous: false, matched: true },
  { label: "모레", dueText: "모레", receivedLocal: "2026-09-18T09:00", date: "2026-09-20", ambiguous: false, matched: true },
  { label: "글피", dueText: "글피", receivedLocal: "2026-09-18T09:00", date: "2026-09-21", ambiguous: false, matched: true },
  { label: "N일까지(미래, 이번 달)", dueText: "20일까지", receivedLocal: "2026-09-18T09:00", date: "2026-09-20", ambiguous: false, matched: true },
  { label: "N일까지(미래, 하루 뒤 받음)", dueText: "22일까지", receivedLocal: "2026-09-19T09:00", date: "2026-09-22", ambiguous: false, matched: true },
  { label: "N일(과거→다음 달, 예시)", dueText: "3일", receivedLocal: "2026-09-05T09:00", date: "2026-10-03", ambiguous: true, matched: true },
  { label: "N일(받은 날과 동일 → 과거 아님)", dueText: "5일", receivedLocal: "2026-09-05T09:00", date: "2026-09-05", ambiguous: false, matched: true },
  { label: "N일(이번 달에 없는 날짜 → 다음 달)", dueText: "31일", receivedLocal: "2026-09-18T09:00", date: "2026-10-31", ambiguous: true, matched: true },
  { label: "N일까지(과거 → 다음 달)", dueText: "20일까지", receivedLocal: "2026-09-25T09:00", date: "2026-10-20", ambiguous: true, matched: true },
  { label: "존재하지 않는 날짜(2/30)", dueText: "2월 30일", receivedLocal: "2026-09-18T09:00", date: null, ambiguous: true, matched: true },
  { label: "말일", dueText: "말일", receivedLocal: "2026-09-18T09:00", date: "2026-09-30", ambiguous: false, matched: true },
  { label: "월말(2월, 평년)", dueText: "월말", receivedLocal: "2026-02-10T09:00", date: "2026-02-28", ambiguous: false, matched: true },
  { label: "연말 넘김(12/31의 내일 → 다음 해)", dueText: "내일", receivedLocal: "2026-12-31T09:00", date: "2027-01-01", ambiguous: false, matched: true },
  { label: "M/N 슬래시", dueText: "9/20", receivedLocal: "2026-09-01T09:00", date: "2026-09-20", ambiguous: false, matched: true },
  { label: "M.N 점", dueText: "9.20", receivedLocal: "2026-09-01T09:00", date: "2026-09-20", ambiguous: false, matched: true },
  { label: "M월 N일", dueText: "9월 20일", receivedLocal: "2026-09-01T09:00", date: "2026-09-20", ambiguous: false, matched: true },
  { label: "YYYY-MM-DD", dueText: "2026-09-20", receivedLocal: "2026-09-01T09:00", date: "2026-09-20", ambiguous: false, matched: true },
  { label: "YYYY.MM.DD", dueText: "2026.09.20", receivedLocal: "2026-09-01T09:00", date: "2026-09-20", ambiguous: false, matched: true },
  { label: "다음 주 금요일", dueText: "다음 주 금요일", receivedLocal: "2026-09-18T09:00", date: "2026-09-25", ambiguous: false, matched: true },
  { label: "이번 주 화요일(이미 지난 요일)", dueText: "이번 주 화요일", receivedLocal: "2026-09-18T09:00", date: "2026-09-15", ambiguous: false, matched: true },
  { label: "이번주 금요일(공백 없음, 오늘)", dueText: "이번주 금요일", receivedLocal: "2026-09-18T09:00", date: "2026-09-18", ambiguous: false, matched: true },
  { label: "N일 뒤", dueText: "3일 뒤", receivedLocal: "2026-09-18T09:00", date: "2026-09-21", ambiguous: false, matched: true },
  { label: "N일 후", dueText: "5일 후", receivedLocal: "2026-09-18T09:00", date: "2026-09-23", ambiguous: false, matched: true },
  { label: "N일(까지 없이, 이번 달)", dueText: "10일", receivedLocal: "2026-09-01T09:00", date: "2026-09-10", ambiguous: false, matched: true },
  { label: "dueText 없음", dueText: null, receivedLocal: "2026-09-18T09:00", date: null, ambiguous: false, matched: false },
  { label: "인식 불가 표현", dueText: "다음달에 알려드릴게요", receivedLocal: "2026-09-18T09:00", date: null, ambiguous: false, matched: false },
];

describe("resolveDue", () => {
  it.each(cases)("$label: '$dueText' (받은날 $receivedLocal) → $date", (c) => {
    const receivedAt = seoulLocalToIso(c.receivedLocal);
    const result = resolveDue(c.dueText, receivedAt);
    expect(result.date).toBe(c.date);
    expect(result.ambiguous).toBe(c.ambiguous);
    expect(result.matched).toBe(c.matched);
  });
});
