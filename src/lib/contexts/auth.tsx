"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthChange, signInWithGoogle, signOut } from "@/lib/firebase/auth";

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Firebase 인증 상태 감시
  useEffect(() => {
    try {
      const unsubscribe = onAuthChange((authUser) => {
        setUser(authUser);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Auth provider 에러:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setLoading(false);
    }
  }, []);

  const handleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
      // 상태는 onAuthChange 리스너에서 자동으로 업데이트됨
    } catch (err) {
      const message = err instanceof Error ? err.message : "로그인 실패";
      setError(message);
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      setLoading(true);
      await signOut();
      setUser(null);
      // 상태는 onAuthChange 리스너에서 자동으로 업데이트됨
    } catch (err) {
      const message = err instanceof Error ? err.message : "로그아웃 실패";
      setError(message);
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn: handleSignIn,
    signOut: handleSignOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Auth 컨텍스트 사용 훅
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용 가능합니다");
  }
  return context;
}
