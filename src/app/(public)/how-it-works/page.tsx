import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HowItWorksPage() {
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
            <Link href="/how-it-works" className="text-sm font-semibold text-[var(--color-text)]">
              사용 방법
            </Link>
            <Link href="/faq" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              FAQ
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-[var(--color-surface)] py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-12 space-y-4">
            <h1 className="text-4xl font-bold text-[var(--color-text)]">사용 방법</h1>
            <p className="text-lg text-[var(--color-text-muted)]">
              AI Inbox의 3가지 기본 사용 단계를 알아봅시다.
            </p>
          </div>

          <div className="space-y-12">
            {/* Step 1 */}
            <section className="rounded-lg border border-[var(--color-border)] p-8">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-muted)]">
                  <span className="text-2xl font-bold text-[var(--color-brand-text)]">1</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--color-text)]">
                    메시지 입력
                  </h2>
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    받은 요청을 그대로 붙여넣으세요
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg bg-[var(--color-surface-muted)] p-6">
                  <h3 className="mb-3 font-semibold text-[var(--color-text)]">메시지 입력 화면</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <label className="mb-1 block text-[var(--color-text-muted)]">
                        메시지 텍스트
                      </label>
                      <div className="rounded border border-[var(--color-border)] bg-white p-3 font-mono text-xs text-[var(--color-text-muted)]">
                        "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다."
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[var(--color-text-muted)]">
                          받은 날짜
                        </label>
                        <input
                          type="date"
                          className="w-full rounded border border-[var(--color-border)] p-2 text-xs"
                          defaultValue="2026-09-18"
                          disabled
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[var(--color-text-muted)]">
                          받은 시간
                        </label>
                        <input
                          type="time"
                          className="w-full rounded border border-[var(--color-border)] p-2 text-xs"
                          defaultValue="14:30"
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-[var(--color-success-bg)] p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    ✓ <strong>중요</strong>: 메시지는 현재 분석 세션 중에만 사용되며, 저장할 때는
                    정리된 정보만 남습니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Step 2 */}
            <section className="rounded-lg border border-[var(--color-border)] p-8">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-muted)]">
                  <span className="text-2xl font-bold text-[var(--color-brand-text)]">2</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--color-text)]">
                    AI 분석
                  </h2>
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    AI가 요청을 자동으로 정리해줍니다
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg bg-[var(--color-surface-muted)] p-6">
                  <h3 className="mb-4 font-semibold text-[var(--color-text)]">
                    분석 결과 (자동 추출)
                  </h3>
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded bg-white p-3">
                        <div className="text-xs text-[var(--color-text-muted)]">발신자</div>
                        <div className="mt-1 font-semibold text-[var(--color-text)]">
                          김과장
                        </div>
                      </div>
                      <div className="rounded bg-white p-3">
                        <div className="text-xs text-[var(--color-text-muted)]">관계</div>
                        <div className="mt-1 font-semibold text-[var(--color-text)]">
                          A창호
                        </div>
                      </div>
                      <div className="rounded bg-white p-3">
                        <div className="text-xs text-[var(--color-text-muted)]">요청</div>
                        <div className="mt-1 font-semibold text-[var(--color-text)]">
                          송금
                        </div>
                      </div>
                      <div className="rounded bg-white p-3">
                        <div className="text-xs text-[var(--color-text-muted)]">마감</div>
                        <div className="mt-1 font-semibold text-[var(--color-text)]">
                          2026년 9월 20일
                        </div>
                      </div>
                    </div>
                    <div className="rounded bg-white p-3">
                      <div className="text-xs text-[var(--color-text-muted)]">금액</div>
                      <div className="mt-1 font-semibold text-[var(--color-text)]">
                        3,000,000원
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-[var(--color-warning-bg)] p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    💡 <strong>애매한 부분</strong>: "내일까지" 같은 상대 날짜는 받은 날짜를
                    기준으로 해석하고, 확인을 요청합니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Step 3 */}
            <section className="rounded-lg border border-[var(--color-border)] p-8">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-muted)]">
                  <span className="text-2xl font-bold text-[var(--color-brand-text)]">3</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--color-text)]">
                    결과 확인 및 관리
                  </h2>
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    정리된 업무를 확인하고 관리합니다
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--color-text)]">
                    저장 후 대시보드
                  </h3>
                  <div className="rounded-lg bg-[var(--color-surface-muted)] p-6">
                    <div className="space-y-3">
                      <div className="rounded-lg border-2 border-[var(--color-brand)] bg-white p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                              관계
                            </div>
                            <div className="font-semibold text-[var(--color-text)]">
                              A창호
                            </div>
                          </div>
                          <span className="inline-block rounded bg-[var(--color-success-bg)] px-2 py-1 text-xs font-semibold text-[var(--color-success)]">
                            미완료
                          </span>
                        </div>
                        <div className="mb-2 text-base font-semibold text-[var(--color-text)]">
                          3,000,000원 송금
                        </div>
                        <div className="mb-3 text-sm text-[var(--color-text-muted)]">
                          마감: <span className="font-semibold">2026년 9월 20일</span>
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          상세 보기 / 완료
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--color-text)]">
                    후속 요청 입력
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    같은 업체의 이대리가 "22일까지"라고 말하면, AI Inbox는:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
                    <li>✓ 같은 관계의 같은 업무를 찾습니다</li>
                    <li>✓ 마감만 9/20 → 9/22로 제안합니다</li>
                    <li>✓ 금액은 유지합니다</li>
                    <li>✓ 변경 이력을 기록합니다</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-[var(--color-success-bg)] p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    ✓ <strong>업무는 항상 하나</strong>: 같은 업체의 같은 업무가 여러 담당자로부터
                    전달되어도, 변경사항만 추적됩니다.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* FAQ Link */}
          <section className="mt-12 rounded-lg bg-[var(--color-brand-muted)] p-8">
            <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
              더 알고 싶으신가요?
            </h2>
            <p className="mb-4 text-[var(--color-text-muted)]">
              자주 묻는 질문을 확인하거나, 지금 바로 시작해보세요.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/faq">
                <button className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]">
                  FAQ 보기
                </button>
              </Link>
              <Link href="/input">
                <Button>지금 시작하기</Button>
              </Link>
            </div>
          </section>
        </div>
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
    </div>
  );
}
