"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell";

const NAV = [
  { href: "/", label: "현재 할 일" },
  { href: "/relationships", label: "관계" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header
      className="border-b border-[var(--color-border)] bg-[var(--color-surface)]"
      role="banner"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          href="/"
          className="flex items-baseline gap-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] rounded"
          aria-label="AI Inbox 홈으로"
        >
          <span className="text-lg font-bold text-[var(--color-text)]">AI Inbox</span>
          <span className="hidden text-xs text-[var(--color-text-muted)] sm:inline">
            흩어진 연락을 지금 해야 할 일로
          </span>
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="flex flex-wrap items-center gap-1.5 sm:gap-2"
        >
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] ${
                  active
                    ? "bg-[var(--color-brand-muted)] text-[var(--color-brand-text)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <NotificationBell />
          <Link
            href="/settings"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] ${
              pathname.startsWith("/settings")
                ? "bg-[var(--color-brand-muted)] text-[var(--color-brand-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
            }`}
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          >
            설정
          </Link>
          <Link
            href="/input"
            className="rounded-lg bg-[var(--color-brand)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-brand)]"
            aria-label="새 정보 추가하기"
          >
            정보 추가
          </Link>
        </nav>
      </div>
    </header>
  );
}
