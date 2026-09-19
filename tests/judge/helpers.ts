// judge() 테스트 공용 헬퍼 — 최소 ExtractedRequest 값과 기준 시각.
import { seoulLocalToIso } from "@/lib/time";
import type { ExtractedRequest } from "@/lib/types";

export function baseExtracted(overrides: Partial<ExtractedRequest> = {}): ExtractedRequest {
  return {
    senderName: null,
    organization: null,
    kind: null,
    title: null,
    amount: null,
    currency: null,
    dueText: null,
    dueDate: null,
    dueAmbiguous: false,
    tentative: false,
    cancellation: false,
    intent: "none",
    ...overrides,
  };
}

export const RECEIVED_0918 = seoulLocalToIso("2026-09-18T09:00");
export const RECEIVED_0919 = seoulLocalToIso("2026-09-19T09:00");
export const RECEIVED_0918_EARLY = seoulLocalToIso("2026-09-18T08:00");
