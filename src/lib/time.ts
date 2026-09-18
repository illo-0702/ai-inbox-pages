// Asia/Seoul 기준 날짜 유틸리티. 서버·클라이언트 공용, 외부 의존성 없음.
// 한국은 서머타임이 없으므로 +09:00 고정 오프셋으로 계산한다.

import type { DateString, IsoDateTime } from "./types";

export const SEOUL_OFFSET_MINUTES = 9 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 시각(ISO 문자열 또는 Date)을 Asia/Seoul 달력 날짜로 변환 */
export function seoulDateOf(at: IsoDateTime | Date): DateString {
  const ms = typeof at === "string" ? Date.parse(at) : at.getTime();
  if (Number.isNaN(ms)) throw new Error("invalid_datetime");
  const d = new Date(ms + SEOUL_OFFSET_MINUTES * 60 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 오늘(Asia/Seoul) */
export function todayInSeoul(now: Date = new Date()): DateString {
  return seoulDateOf(now);
}

export function isValidDateString(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isValidYmd(y, mo, d);
}

export function isValidYmd(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function toDateString(y: number, m: number, d: number): DateString {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseDateString(s: DateString): { y: number; m: number; d: number } {
  const m = DATE_RE.exec(s);
  if (!m) throw new Error("invalid_date");
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** 날짜 문자열에 일수를 더한다 */
export function addDays(s: DateString, days: number): DateString {
  const { y, m, d } = parseDateString(s);
  const t = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return toDateString(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** a - b (일) */
export function diffDays(a: DateString, b: DateString): number {
  const pa = parseDateString(a);
  const pb = parseDateString(b);
  return Math.round((Date.UTC(pa.y, pa.m - 1, pa.d) - Date.UTC(pb.y, pb.m - 1, pb.d)) / DAY_MS);
}

/** 0=일 … 6=토 */
export function weekdayOf(s: DateString): number {
  const { y, m, d } = parseDateString(s);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 마감 상태 — 날짜만 있는 마감은 해당 날짜가 지나야 기한 경과 (기획서 9.4) */
export function dueStateOf(
  dueDate: DateString | null,
  today: DateString,
): "overdue" | "today" | "upcoming" | "none" {
  if (!dueDate) return "none";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  return "upcoming";
}

/** "2026-09-18T14:30" 같은 로컬 입력값(Asia/Seoul로 간주)을 오프셋 포함 ISO로 */
export function seoulLocalToIso(local: string): IsoDateTime {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(local);
  if (!m) throw new Error("invalid_local_datetime");
  const [, y, mo, d, hh = "00", mi = "00", ss = "00"] = m;
  return `${y}-${mo}-${d}T${hh}:${mi}:${ss}+09:00`;
}

/** Date → Asia/Seoul 로컬 입력값 "YYYY-MM-DDTHH:mm" (datetime-local 기본값용) */
export function isoToSeoulLocal(at: IsoDateTime | Date): string {
  const ms = typeof at === "string" ? Date.parse(at) : at.getTime();
  const d = new Date(ms + SEOUL_OFFSET_MINUTES * 60 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** 현재 시각을 +09:00 오프셋 ISO 문자열로 */
export function nowIso(now: Date = new Date()): IsoDateTime {
  return seoulLocalToIso(isoToSeoulLocal(now) + ":" + pad(new Date(now.getTime()).getUTCSeconds()));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
