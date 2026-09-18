import { describe, expect, it } from "vitest";
import { parseAmount } from "../../src/lib/ai/amount";

interface Case {
  text: string;
  amount: number | null;
  currency: string | null;
}

const cases: Case[] = [
  { text: "300만원 송금 부탁드립니다", amount: 3_000_000, currency: "KRW" },
  { text: "1,500,000원 입금했습니다", amount: 1_500_000, currency: "KRW" },
  { text: "150만 원 보내주세요", amount: 1_500_000, currency: "KRW" },
  { text: "3백만원 결제 예정입니다", amount: 3_000_000, currency: "KRW" },
  { text: "2억 5천만원 송금합니다", amount: 250_000_000, currency: "KRW" },
  { text: "5천원 정산합니다", amount: 5_000, currency: "KRW" },
  { text: "1.5억 규모입니다", amount: 150_000_000, currency: "KRW" },
  { text: "50만 보내주세요", amount: 500_000, currency: "KRW" },
  { text: "50,000 정도 됩니다", amount: 50_000, currency: null },
  { text: "$500 결제해주세요", amount: 500, currency: "USD" },
  { text: "500달러 송금 부탁드립니다", amount: 500, currency: "USD" },
  { text: "USD 500 송금 부탁드립니다", amount: 500, currency: "USD" },
  { text: "500엔 입금했습니다", amount: 500, currency: "JPY" },
  { text: "금액 언급이 전혀 없는 문장입니다", amount: null, currency: null },
];

describe("parseAmount", () => {
  it.each(cases)("'$text' → $amount $currency", (c) => {
    const result = parseAmount(c.text);
    expect(result.amount).toBe(c.amount);
    expect(result.currency).toBe(c.currency);
  });
});

describe("parseAmount — 여러 금액·오인 방지", () => {
  const cases: Case[] = [
    { text: "300만원 말고 350만원으로 변경 부탁드립니다", amount: 3500000, currency: "KRW" },
    { text: "송금액 300만원을 350만원으로 바꿔주세요", amount: 3500000, currency: "KRW" },
    { text: "300만원과 500만원 두 건 송금 부탁드립니다", amount: null, currency: null },
    { text: "010-1234-5678로 연락주세요", amount: null, currency: null },
    { text: "2026-09-20까지 처리 부탁드립니다", amount: null, currency: null },
    { text: "2026년 9월 20일까지 300만원 송금", amount: 3000000, currency: "KRW" },
    { text: "300만원(3,000,000원) 송금 부탁드립니다", amount: 3000000, currency: "KRW" },
    { text: "3,000,000원 송금, 금액은 3,000,000원 그대로입니다", amount: 3000000, currency: "KRW" },
  ];
  it.each(cases)("$text", (c) => {
    const result = parseAmount(c.text);
    expect(result.amount).toBe(c.amount);
    expect(result.currency).toBe(c.currency);
  });
});
