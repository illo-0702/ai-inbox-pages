import Link from "next/link";

export const metadata = {
  title: "페이지를 찾을 수 없어요 — 404 · AI Inbox",
  description: "요청하신 페이지를 찾을 수 없습니다. 홈으로 돌아가세요.",
  openGraph: {
    title: "404 페이지",
    description: "요청하신 페이지를 찾을 수 없습니다.",
    type: "website",
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center max-w-md">
        <div className="text-5xl font-bold text-[var(--color-text-muted)]">404</div>
        <h1 className="text-lg font-semibold text-[var(--color-text)]">
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          주소가 바뀌었거나 삭제된 페이지일 수 있어요.
        </p>
        <Link
          href="/"
          className="mt-4 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] transition-colors"
        >
          현재 할 일로 이동
        </Link>
      </div>
    </div>
  );
}
