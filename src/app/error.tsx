"use client";

import { useEffect } from "react";

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
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-6 py-16 text-center">
      <p className="text-lg font-semibold text-[var(--color-danger)]">문제가 발생했어요</p>
      <p className="text-sm text-[var(--color-text-muted)]">
        잠시 후 다시 시도해주세요. 문제가 계속되면 새로고침해주세요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
      >
        다시 시도
      </button>
    </div>
  );
}
