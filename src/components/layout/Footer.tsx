"use client";

import { useState } from "react";
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
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-[var(--color-text-faint)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          정적 데모입니다. 모든 데이터는 이 브라우저에만(localStorage) 저장되고 서버로 전송되지 않아요.
          다른 기기·브라우저에는 보이지 않습니다.
        </p>
        <div className="flex items-center gap-3">
          {error && <span className="text-[var(--color-danger)]">{error}</span>}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="rounded px-2 py-1 font-medium text-[var(--color-text-muted)] underline decoration-dotted hover:text-[var(--color-danger)]"
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
