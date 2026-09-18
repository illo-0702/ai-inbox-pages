// 클라이언트 전용 포맷터·라벨 사전. 금액·날짜 표기는 이 파일에서만 만든다.
import type {
  DateString,
  IsoDateTime,
  Judgment,
  Decision,
  TaskKind,
  TaskStatus,
  ReasonCode,
  EventType,
  FieldName,
} from "@/lib/types";
import { parseDateString, seoulDateOf } from "@/lib/time";

/** "2026-09-22" → "2026.09.22" */
export function formatDate(date: DateString | null | undefined): string {
  if (!date) return "";
  const { y, m, d } = parseDateString(date);
  return `${y}.${pad(m)}.${pad(d)}`;
}

/** "2026-09-22" → "09.22" (연도 생략 — 변경 비교·타임라인용) */
export function formatShort(date: DateString | null | undefined): string {
  if (!date) return "";
  const { m, d } = parseDateString(date);
  return `${pad(m)}.${pad(d)}`;
}

/** 마감 문구: "2026.09.22까지" 또는 "마감 미정" */
export function formatDueLabel(date: DateString | null | undefined): string {
  if (!date) return "마감 미정";
  return `${formatDate(date)}까지`;
}

/** ISO 시각 → "2026.09.19 15:00" (Asia/Seoul) */
export function formatDateTime(at: IsoDateTime | null | undefined): string {
  if (!at) return "";
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return "";
  const seoulDate = seoulDateOf(at);
  const d = new Date(ms + 9 * 60 * 60 * 1000);
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  return `${formatDate(seoulDate)} ${hh}:${mm}`;
}

/** ISO 시각 → "2026.09.19" (날짜만) */
export function formatIsoDate(at: IsoDateTime | null | undefined): string {
  if (!at) return "";
  return formatDate(seoulDateOf(at));
}

/** 정수(원) → "3,000,000원". currency가 KRW가 아니면 통화 코드를 붙인다. */
export function formatKRW(amount: number | null | undefined, currency?: string | null): string {
  if (amount === null || amount === undefined) return "";
  const num = amount.toLocaleString("ko-KR");
  if (!currency || currency === "KRW") return `${num}원`;
  return `${num} ${currency}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ───────────────────────────── 라벨 사전 ─────────────────────────────

export const judgmentLabel: Record<Judgment, string> = {
  confirmed: "명확한 요청으로 분석됨",
  possible: "변경 가능성",
  needs_check: "확인 필요",
};

export const judgmentShortLabel: Record<Judgment, string> = {
  confirmed: "확정",
  possible: "변경 가능성",
  needs_check: "확인 필요",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  open: "미완료",
  done: "완료",
};

export const decisionLabel: Record<Decision, string> = {
  pending: "대기",
  applied: "적용",
  kept: "기존 유지",
};

export const taskKindLabel: Record<TaskKind, string> = {
  remittance: "송금",
  document: "자료 전달",
  schedule: "일정",
  other: "업무",
};

export const dueStateLabel: Record<"overdue" | "today" | "upcoming" | "none", string> = {
  overdue: "기한 지남",
  today: "오늘 마감",
  upcoming: "",
  none: "",
};

export const eventTypeLabel: Record<EventType, string> = {
  task_created: "송금 요청 등록",
  task_updated: "마감 변경 적용",
  change_kept: "기존 유지",
  change_deferred: "변경 보류",
  completed: "완료",
  reopened: "미완료로 되돌림",
};

export const fieldNameLabel: Record<FieldName, string> = {
  dueDate: "마감",
  amount: "금액",
  currency: "통화",
  title: "제목",
};

export const reasonCodeLabel: Record<ReasonCode, string> = {
  tentative_expression: "잠정 표현",
  relationship_unknown: "관계 미상",
  relationship_new: "새 관계",
  multiple_task_candidates: "업무 후보 여러 건",
  date_ambiguous: "날짜 해석 불명확",
  date_missing_for_change: "변경할 값 없음",
  older_message: "과거에 받은 메시지",
  task_completed: "이미 완료된 업무",
  no_changes: "기존 값과 동일",
  intent_unclear: "새 요청인지 변경인지 확인 필요",
  currency_unclear: "통화 불명확",
  cancellation_or_removal: "취소·철회 표현",
  no_actionable_request: "실행 요청 없음",
  sender_missing: "발신자 정보 없음",
};

/** 필드 변경 값을 화면 표기용 문자열로. 필드 라벨은 호출부에서 따로 붙이므로 여기서는 중복하지 않는다. */
export function formatFieldValue(field: FieldName, value: string | number | null): string {
  if (value === null) return field === "dueDate" ? "미정" : "-";
  if (field === "dueDate") return formatShort(String(value));
  if (field === "amount") return formatKRW(Number(value));
  return String(value);
}

// ───────────────────────────── 조사(을/를 등) ─────────────────────────────

const JOSA_PAIRS = {
  "을/를": ["을", "를"],
  "이/가": ["이", "가"],
  "은/는": ["은", "는"],
  "으로/로": ["으로", "로"],
} as const;

/**
 * 한글 받침 유무에 따라 조사를 자동으로 붙인다.
 * 한글 음절로 끝나지 않는 단어(숫자·영문 등)는 안전하게 "받침 있음"으로 간주한다.
 * 예: josa("송금", "을/를") → "송금을", josa("A창호", "을/를") → "A창호를"
 */
export function josa(word: string, pair: keyof typeof JOSA_PAIRS): string {
  const [withBatchim, withoutBatchim] = JOSA_PAIRS[pair];
  const trimmed = word.trim();
  if (!trimmed) return `${word}${withBatchim}`;
  const lastCode = trimmed.charCodeAt(trimmed.length - 1);
  const isHangulSyllable = lastCode >= 0xac00 && lastCode <= 0xd7a3;
  const hasBatchim = isHangulSyllable ? (lastCode - 0xac00) % 28 !== 0 : true;
  return `${word}${hasBatchim ? withBatchim : withoutBatchim}`;
}
