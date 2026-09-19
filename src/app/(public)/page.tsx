"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { OnboardingFlow } from "@/components/OnboardingFlow";

export default function LandingPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[var(--color-text)]">AI Inbox</span>
            <span className="hidden text-xs text-[var(--color-text-muted)] sm:inline">
              흩어진 연락을 지금 해야 할 일로
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/how-it-works" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              사용 방법
            </Link>
            <Link href="/faq" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              FAQ
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-[var(--color-surface)] py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="space-y-6 text-center">
              <h1 className="text-4xl font-bold leading-tight text-[var(--color-text)] sm:text-5xl">
                illo
              </h1>
              <p className="text-xl text-[var(--color-text-muted)] sm:text-2xl">
                흩어진 업무, 하나의 내 일로
              </p>
              <p className="mx-auto max-w-2xl text-base text-[var(--color-text-muted)]">
                여러 곳에서 받은 요청을 관계별로 연결하고, 변경사항을 추적해<br className="hidden sm:inline" />
                지금 유효한 조건과 이력을 함께 보여드립니다.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/input">
                  <Button className="w-full sm:w-auto">무료로 시작하기</Button>
                </Link>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                >
                  3분 튜토리얼 보기
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="mb-8 text-center text-2xl font-bold text-[var(--color-text)]">
              이런 경험이 있나요?
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                <h3 className="mb-2 font-semibold text-[var(--color-text)]">
                  담당자가 바뀌면 맥락이 끊긴다
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  같은 업체에서도 여러 담당자가 조건을 바꿔 전달합니다. 누가 뭘 말했는지 다시 확인하기 어려워요.
                </p>
              </div>
              <div className="rounded-lg bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                <h3 className="mb-2 font-semibold text-[var(--color-text)]">
                  변경된 조건을 놓친다
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  날짜가 바뀌고 금액이 조정되지만, 기존 메시지와 비교해야만 알 수 있어요.
                </p>
              </div>
              <div className="rounded-lg bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                <h3 className="mb-2 font-semibold text-[var(--color-text)]">
                  현재 상태를 기억하기 어렵다
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  과거 조건과 최신 조건이 뒤섞여, 지금 뭘 해야 하는지 헷갈려요.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-[var(--color-surface)] py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="mb-12 text-center text-2xl font-bold text-[var(--color-text)]">
              작동 방식
            </h2>
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] text-lg font-bold text-white">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
                    요청 입력
                  </h3>
                  <p className="text-[var(--color-text-muted)]">
                    메시지를 복사해서 붙여넣기만 하면 됩니다. 받은 날짜를 확인하면 OK.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] text-lg font-bold text-white">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
                    AI 분석
                  </h3>
                  <p className="text-[var(--color-text-muted)]">
                    발신자, 관계, 요청 내용, 마감, 금액을 자동으로 추출합니다.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] text-lg font-bold text-white">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
                    결과 확인
                  </h3>
                  <p className="text-[var(--color-text-muted)]">
                    분석 결과를 확인하고, 애매한 부분이 있으면 선택으로 명확히 합니다.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] text-lg font-bold text-white">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
                    할 일 관리
                  </h3>
                  <p className="text-[var(--color-text-muted)]">
                    모든 할 일이 한곳에 모여, 마감 순서대로 정렬됩니다.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] text-lg font-bold text-white">
                    5
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
                    완료 추적
                  </h3>
                  <p className="text-[var(--color-text-muted)]">
                    실제 업무를 처리한 후 완료 표시하면, 변경 이력과 함께 기록됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Example Section */}
        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="mb-8 text-center text-2xl font-bold text-[var(--color-text)]">
              변경 사항 추적 예시
            </h2>
            <div className="space-y-6">
              {/* First message */}
              <div className="rounded-lg bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-block rounded bg-[var(--color-brand-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-text)]">
                    9월 18일
                  </span>
                  <span className="font-semibold text-[var(--color-text)]">A창호 김과장</span>
                </div>
                <p className="text-[var(--color-text-muted)]">
                  "20일까지 300만원 송금 부탁드립니다."
                </p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="text-[var(--color-text-muted)]">↓</div>
              </div>

              {/* First task */}
              <div className="rounded-lg border-2 border-[var(--color-brand)] bg-[var(--color-surface)] p-6">
                <h3 className="mb-3 font-semibold text-[var(--color-text)]">
                  업무 등록: 3,000,000원 송금
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-[var(--color-text-muted)]">마감:</span>{" "}
                    <span className="font-semibold text-[var(--color-text)]">2026년 9월 20일</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">금액:</span>{" "}
                    <span className="font-semibold text-[var(--color-text)]">3,000,000원</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="text-[var(--color-text-muted)]">↓</div>
              </div>

              {/* Second message */}
              <div className="rounded-lg bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-block rounded bg-[var(--color-brand-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-text)]">
                    9월 19일
                  </span>
                  <span className="font-semibold text-[var(--color-text)]">A창호 이대리</span>
                </div>
                <p className="text-[var(--color-text-muted)]">
                  "송금은 22일까지 부탁드립니다."
                </p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="text-[var(--color-text-muted)]">↓</div>
              </div>

              {/* Updated task */}
              <div className="rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-6">
                <h3 className="mb-3 font-semibold text-[var(--color-text)]">
                  업무 업데이트: 같은 건으로 연결됨
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-[var(--color-text-muted)]">마감:</span>{" "}
                    <span className="inline-flex items-center gap-2 text-[var(--color-text)]">
                      <span className="line-through">9월 20일</span>
                      <span className="font-semibold text-[var(--color-success)]">→ 9월 22일</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">금액:</span>{" "}
                    <span className="font-semibold text-[var(--color-text)]">3,000,000원 (변경 없음)</span>
                  </div>
                  <div className="mt-3 text-xs text-[var(--color-text-muted)]">
                    변경 이력: 9/19 이대리 · 마감 변경 적용
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="bg-[var(--color-surface)] py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="rounded-lg bg-[var(--color-brand-muted)] p-6 sm:p-8">
              <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
                신뢰할 수 있는 처리
              </h2>
              <ul className="space-y-3 text-sm text-[var(--color-text-muted)]">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 text-[var(--color-brand-text)]">✓</span>
                  <span>애매한 변경사항은 자동 확정하지 않고, 사용자가 확인 후 적용합니다.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 text-[var(--color-brand-text)]">✓</span>
                  <span>최신 메시지라도 잠정적인 표현은 현재 조건을 유지한 채 보류합니다.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 text-[var(--color-brand-text)]">✓</span>
                  <span>모든 변경 이력은 누가 언제 무엇을 했는지 명확히 기록됩니다.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
            <h2 className="mb-4 text-2xl font-bold text-[var(--color-text)]">
              지금 시작하세요
            </h2>
            <p className="mb-6 text-[var(--color-text-muted)]">
              받은 요청을 정리하고, 변경사항을 추적하고, 지금 해야 할 일을 확인하세요.
            </p>
            <Link href="/input">
              <Button className="w-full sm:w-auto">무료로 시작하기</Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-[var(--color-text-muted)] sm:flex-row">
            <p>&copy; 2026 AI Inbox. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/how-it-works" className="hover:text-[var(--color-text)]">
                사용 방법
              </Link>
              <Link href="/faq" className="hover:text-[var(--color-text)]">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingFlow onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
