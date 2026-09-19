"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "./ui/Button";

interface OnboardingFlowProps {
  onClose: () => void;
}

export function OnboardingFlow({ onClose }: OnboardingFlowProps) {
  const [step, setStep] = useState<"intro" | "sample" | "choice">("intro");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-[var(--color-surface)] p-6 shadow-lg sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          aria-label="닫기"
        >
          ✕
        </button>

        {step === "intro" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                3분 안에 알아보기
              </h2>
              <p className="mt-2 text-[var(--color-text-muted)]">
                AI Inbox가 어떻게 작동하는지 함께 알아봅시다.
              </p>
            </div>

            <div className="rounded-lg bg-[var(--color-surface-muted)] p-6">
              <p className="mb-4 font-semibold text-[var(--color-text)]">
                업무는 어디에서 가장 많이 오나요?
              </p>
              <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
                <label className="flex items-center gap-3">
                  <input type="radio" name="source" value="email" defaultChecked />
                  <span>이메일</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="radio" name="source" value="messenger" />
                  <span>메신저 (카카오톡, Slack 등)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="radio" name="source" value="phone" />
                  <span>문자 또는 전화</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="radio" name="source" value="mixed" />
                  <span>모두 섞여있어요</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setStep("sample")}
                className="flex-1 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
              >
                샘플로 먼저 보기
              </button>
              <Link href="/input" className="flex-1">
                <button
                  onClick={onClose}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                >
                  내 업무 넣어보기
                </button>
              </Link>
            </div>
          </div>
        )}

        {step === "sample" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setStep("intro")}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                aria-label="이전"
              >
                ←
              </button>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                실제 예시: 같은 업체, 다른 담당자
              </h2>
            </div>

            <div className="space-y-4">
              {/* Before */}
              <div>
                <h3 className="mb-3 font-semibold text-[var(--color-text)]">
                  Before: 메시지가 흩어져 있을 때
                </h3>
                <div className="space-y-2 rounded-lg bg-[var(--color-surface-muted)] p-4">
                  <div className="rounded bg-white p-3 text-sm">
                    <div className="mb-1 font-semibold text-[var(--color-text)]">
                      9월 18일 · 김과장
                    </div>
                    <p className="text-[var(--color-text-muted)]">
                      "A창호입니다. 20일까지 300만원 송금 부탁드립니다."
                    </p>
                  </div>
                  <div className="rounded bg-white p-3 text-sm">
                    <div className="mb-1 font-semibold text-[var(--color-text)]">
                      9월 19일 · 이대리
                    </div>
                    <p className="text-[var(--color-text-muted)]">
                      "송금은 22일까지 가능할까요?"
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center py-2">
                <div className="text-[var(--color-text-muted)]">↓</div>
              </div>

              {/* After */}
              <div>
                <h3 className="mb-3 font-semibold text-[var(--color-text)]">
                  After: AI Inbox에서 정리된 상태
                </h3>
                <div className="rounded-lg border-2 border-[var(--color-brand)] bg-[var(--color-surface-muted)] p-4">
                  <div className="mb-4">
                    <div className="mb-2 text-sm font-semibold text-[var(--color-text)]">
                      관계: A창호 (담당자: 김과장, 이대리)
                    </div>
                    <div className="rounded bg-white p-4">
                      <div className="mb-3 font-semibold text-[var(--color-text)]">
                        300만원 송금
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-[var(--color-text-muted)]">마감:</span>{" "}
                          <span className="font-semibold">
                            <span className="line-through">9/20</span> → 9/22
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">금액:</span>{" "}
                          <span className="font-semibold">3,000,000원</span>
                        </div>
                        <div className="mt-3 border-t border-[var(--color-border)] pt-2 text-[var(--color-text-muted)]">
                          <div className="text-xs">9/19 이대리 · 마감 변경</div>
                          <div className="text-xs">9/18 김과장 · 송금 요청</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="rounded-lg bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-text-muted)]">
              💡 같은 업체의 두 담당자 메시지가 <strong>하나의 업무</strong>로 연결되고,{" "}
              <strong>마감만 변경</strong>됩니다. 변경 이력도 함께 확인 가능합니다.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setStep("choice")}
                className="flex-1 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
              >
                이해했어요
              </button>
            </div>
          </div>
        )}

        {step === "choice" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                이제 시작할 준비가 됐나요?
              </h2>
              <p className="mt-2 text-[var(--color-text-muted)]">
                지금 바로 첫 번째 업무를 정리해보세요.
              </p>
            </div>

            <div className="rounded-lg bg-[var(--color-brand-muted)] p-6">
              <h3 className="mb-3 font-semibold text-[var(--color-text)]">
                3가지 방법으로 시작 가능해요
              </h3>
              <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
                <li className="flex gap-3">
                  <span className="flex-shrink-0">1</span>
                  <span>받은 메시지를 그대로 붙여넣기</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0">2</span>
                  <span>AI가 내용을 분석해서 정리</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0">3</span>
                  <span>변경사항은 자동으로 추적</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/input" className="flex-1">
                <button
                  onClick={onClose}
                  className="w-full rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
                >
                  지금 시작하기
                </button>
              </Link>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                나중에 하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
