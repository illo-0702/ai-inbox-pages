"use client";

import { useEffect, useState } from "react";
import { getDashboard, deleteSession, ApiRequestError } from "@/lib/client/api";
import { formatDateTime } from "@/lib/client/format";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function Footer() {
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((res) => {
        if (!cancelled) setExpiresAt(res.sessionExpiresAt);
      })
      .catch(() => {
        // 세션 안내는 부가 정보이므로 실패해도 화면을 막지 않는다
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          {expiresAt
            ? `이 데모 데이터는 ${formatDateTime(expiresAt)}에 자동 삭제됩니다.`
            : "이 데모 데이터는 일정 시간 후 자동 삭제됩니다."}
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
