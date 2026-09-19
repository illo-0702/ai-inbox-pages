"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteSession, ApiRequestError } from "@/lib/client/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function Footer() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteSession();
      window.location.reload();
    } catch (e) {
      setDeleting(false);
      setDialogOpen(false);
      setError(e instanceof ApiRequestError ? e.message : "삭제에 실패했어요. 다시 시도해주세요.");
    }
  }

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]" role="contentinfo">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
        <p className="text-xs text-[var(--color-text-faint)]">
          정적 데모입니다. 모든 데이터는 이 브라우저에만(localStorage) 저장되고 서버로 전송되지 않아요.
          다른 기기·브라우저에는 보이지 않습니다.
        </p>

        <nav aria-label="정책 및 정보" className="flex flex-wrap gap-4 text-xs">
          <Link href="/privacy" className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
            이용약관
          </Link>
          <Link href="/security" className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
            보안 안내
          </Link>
        </nav>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {error && (
            <span className="text-xs text-[var(--color-danger)]" role="alert">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="rounded px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] underline decoration-dotted hover:text-[var(--color-danger)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]"
            aria-label="이 세션의 모든 데이터 삭제"
          >
            데모 데이터 삭제
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        title="데모 데이터를 삭제할까요?"
        description="이 세션에서 만든 관계·업무·이력이 모두 삭제되며 되돌릴 수 없습니다."
        confirmLabel="삭제"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDialogOpen(false)}
      />
    </footer>
  );
}
