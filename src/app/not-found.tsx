import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
      <p className="text-lg font-semibold text-[var(--color-text)]">페이지를 찾을 수 없어요</p>
      <p className="text-sm text-[var(--color-text-muted)]">
        주소가 바뀌었거나 삭제된 페이지일 수 있어요.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
      >
        현재 할 일로 이동
      </Link>
    </div>
  );
}
