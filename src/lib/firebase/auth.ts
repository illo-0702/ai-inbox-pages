// Firebase Google 인증 로직
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";
import { auth as firebaseAuth } from "./config";

const auth = firebaseAuth as Auth | undefined;

const googleProvider = new GoogleAuthProvider();

/**
 * Google 로그인
 * @returns 사용자 정보 (uid, email, displayName, photoURL)
 */
export async function signInWithGoogle() {
  if (!auth) throw new Error("Firebase가 초기화되지 않았습니다.");

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  } catch (error: any) {
    console.error("Google 로그인 실패:", error);
    throw new Error(`로그인 실패: ${error.message}`);
  }
}

/**
 * 로그아웃
 */
export async function signOut() {
  if (!auth) throw new Error("Firebase가 초기화되지 않았습니다.");

  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error("로그아웃 실패:", error);
    throw new Error(`로그아웃 실패: ${error.message}`);
  }
}

/**
 * 현재 로그인한 사용자 정보 반환
 * @returns 사용자 정보 또는 null
 */
export function getCurrentUser(): {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
} | null {
  if (!auth || !auth.currentUser) return null;

  const user = auth.currentUser;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

/**
 * 인증 상태 변경 리스너 등록
 * @param callback 사용자 정보 또는 null을 받는 콜백 함수
 * @returns 리스너 해제 함수
 */
export function onAuthChange(
  callback: (user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null) => void,
) {
  if (!auth) {
    console.error("Firebase가 초기화되지 않았습니다.");
    return () => {};
  }

  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else {
      callback(null);
    }
  });
}

/**
 * 사용자 ID 토큰 획득 (API 호출용)
 */
export async function getIdToken(): Promise<string | null> {
  if (!auth || !auth.currentUser) return null;

  try {
    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.error("ID 토큰 획득 실패:", error);
    return null;
  }
}
