// Firestore 데이터 래퍼
// localStorage 인터페이스 유지하면서 Firestore에 데이터를 읽고 쓴다
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  QueryConstraint,
  Firestore,
} from "firebase/firestore";
import { db as firebaseDb, auth as firebaseAuth } from "./config";
import type { LocalData } from "@/lib/local/types";
import { nowIso } from "@/lib/time";

const db = firebaseDb as Firestore | undefined;
const auth = firebaseAuth;

const COLLECTION_NAME = "user_data";

/**
 * 사용자의 기존 데이터가 없을 때 반환할 빈 데이터
 */
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

/**
 * Firestore에서 데이터 로드
 * 현재 로그인한 사용자의 데이터만 로드함
 * @returns LocalData 객체
 */
export async function loadDataFromFirestore(): Promise<LocalData> {
  if (!db || !auth || !auth.currentUser) {
    console.warn("Firestore 또는 인증이 초기화되지 않음");
    return emptyData();
  }

  try {
    const userId = auth.currentUser.uid;
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as LocalData;
      // 버전 확인
      if (data.version !== 1) {
        console.warn("지원하지 않는 데이터 버전:", data.version);
        return emptyData();
      }
      return data;
    }
    return emptyData();
  } catch (error) {
    console.error("Firestore 데이터 로드 실패:", error);
    return emptyData();
  }
}

/**
 * Firestore에 데이터 저장
 * 현재 로그인한 사용자 ID로 구분하여 저장함
 * @param data 저장할 LocalData 객체
 */
export async function saveDataToFirestore(data: LocalData): Promise<void> {
  if (!db || !auth || !auth.currentUser) {
    console.warn("Firestore 또는 인증이 초기화되지 않음 — 저장 실패");
    return;
  }

  try {
    const userId = auth.currentUser.uid;
    const docRef = doc(db, COLLECTION_NAME, userId);

    // lastModified 타임스탬프 추가
    const dataWithTimestamp = {
      ...data,
      lastModified: new Date().toISOString(),
    };

    await setDoc(docRef, dataWithTimestamp);
  } catch (error) {
    console.error("Firestore 데이터 저장 실패:", error);
    // 저장 실패 시에도 에러를 던지지 않음 (localStorage 동작 유지)
  }
}

/**
 * Firestore + localStorage 하이브리드 모드
 * 우선순위: Firestore (로그인) > localStorage (오프라인)
 *
 * 1. 로그인 상태면 Firestore에서 읽기
 * 2. 로그인 상태가 아니면 localStorage에서 읽기
 * 3. 저장 시에는 localStorage + Firestore (비동기) 동시 저장
 */

let localCache: LocalData | null = null;

/**
 * 데이터 로드 (하이브리드)
 * - 로그인 상태: Firestore 우선
 * - 비로그인 상태: localStorage 사용
 */
export async function loadDataHybrid(): Promise<LocalData> {
  if (auth?.currentUser) {
    // 로그인 상태 — Firestore에서 로드
    return await loadDataFromFirestore();
  } else {
    // 비로그인 상태 — localStorage에서 로드
    try {
      const raw = typeof window !== "undefined" ? window.localStorage?.getItem("ai-inbox-pages:data:v1") : null;
      if (raw) {
        return JSON.parse(raw) as LocalData;
      }
    } catch (error) {
      console.error("localStorage 로드 실패:", error);
    }
    return emptyData();
  }
}

/**
 * 데이터 저장 (하이브리드)
 * - localStorage에는 항상 저장
 * - Firestore에는 로그인 상태일 때만 비동기 저장
 */
export async function saveDataHybrid(data: LocalData): Promise<void> {
  // 1. localStorage에 동기적으로 저장
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("ai-inbox-pages:data:v1", JSON.stringify(data));
    }
  } catch (error) {
    console.warn("localStorage 저장 실패:", error);
  }

  // 2. Firestore에 비동기 저장 (에러 무시)
  if (auth?.currentUser) {
    try {
      await saveDataToFirestore(data);
    } catch (error) {
      console.warn("Firestore 저장 실패 — 로컬에는 저장됨:", error);
    }
  }
}

/**
 * localStorage 인터페이스 호환성을 위한 withData 래퍼
 * 기존 store.ts에서 그대로 사용 가능
 */
export async function withDataHybrid<T>(mutator: (data: LocalData) => T): Promise<T> {
  const data = await loadDataHybrid();
  const result = mutator(data);
  await saveDataHybrid(data);
  return result;
}
