"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 내용 없는 진단 정보만 남긴다 (원문·개인정보 없음)
    console.error("[ai-inbox] unhandled error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div
        className="flex flex-col items-center gap-4 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-6 py-16 text-center max-w-md"
        role="alert"
        aria-live="assertive"
      >
        <div className="text-5xl font-bold text-[var(--color-danger)]">⚠️</div>
        <h1 className="text-lg font-semibold text-[var(--color-text)]">
          문제가 발생했어요
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          잠시 후 다시 시도해주세요. 문제가 계속되면 새로고침해주세요.
        </p>
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 text-xs text-[var(--color-text-muted)] bg-white p-2 rounded w-full max-h-24 overflow-auto">
            <p className="font-mono break-words">
              {error.digest || error.message || "Unknown error"}
            </p>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-brand)]"
            aria-label="오류 해결을 위해 다시 시도"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            aria-label="홈으로 이동"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
