// GitHub Pages 버전의 저장소: 서버 DB 대신 이 브라우저의 localStorage 하나만 쓴다.
// 세션·작업공간 개념이 없다 — 이 브라우저에 저장된 데이터가 전부다(다른 방문자와 격리는
// "각자의 브라우저"가 대신한다). 원문(text)은 이 파일에 저장하지 않는다.
import type { LocalData } from "./types";
import { nowIso } from "@/lib/time";

const STORAGE_KEY = "ai-inbox-pages:data:v1";

function emptyData(): LocalData {
  return {
    version: 1,
    createdAt: nowIso(),
    relationships: [],
    contacts: [],
    tasks: [],
    proposals: [],
    events: [],
  };
}

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function loadData(): LocalData {
  if (!hasStorage()) return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as LocalData;
    if (parsed.version !== 1) return emptyData();
    return parsed;
  } catch {
    return emptyData();
  }
}

function saveData(data: LocalData): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 저장 공간이 꽉 찼거나 프라이빗 모드 — 조용히 무시(다음 읽기는 마지막 성공 상태를 반환)
  }
}

/**
 * 데이터를 읽어 mutator로 바꾸고 저장한다. 브라우저 탭 하나에서 동기적으로 실행되므로
 * 서버 버전의 트랜잭션·동시성 제어(withWriteTransaction)가 필요 없다.
 */
export function withData<T>(mutator: (data: LocalData) => T): T {
  const data = loadData();
  const result = mutator(data);
  saveData(data);
  return result;
}

export function clearData(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}
