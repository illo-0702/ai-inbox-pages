// API 라우트 공용: zod 요청 스키마, 오류 응답 헬퍼.
import { LibsqlError } from "@libsql/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidDateString } from "@/lib/time";
import type { ApiError } from "@/lib/types";
import { ApplyError, VersionConflictError } from "./apply";

export class HttpError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function apiError(code: string, message: string, status: number): NextResponse {
  const body: ApiError = { error: code, message };
  return NextResponse.json(body, { status });
}

const BUSY_CODE_RE = /BUSY|LOCKED|TRANSACTION_ACTIVE/i;

/** 예외를 표준 오류 응답으로 변환한다. 오류 메시지에 원문을 담지 않는다. */
export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof VersionConflictError) {
    return NextResponse.json({ error: "version_conflict", latest: err.latest }, { status: 409 });
  }
  if (err instanceof ApplyError) {
    return apiError(err.code, err.message, err.status);
  }
  if (err instanceof HttpError) {
    return apiError(err.code, err.message, err.status);
  }
  if (err instanceof LibsqlError && BUSY_CODE_RE.test(err.code)) {
    return apiError("busy", "잠시 후 다시 시도해주세요.", 503);
  }
  // 내용 없는 진단 정보만 로그에 남긴다.
  console.error("[api] unexpected_error", err instanceof Error ? err.name : typeof err);
  return apiError("internal_error", "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.", 500);
}

/** trim 후 1~max자. 공백만 있던 값은 빈 문자열이 되어 거부된다(null을 쓰도록 유도). */
function shortText(max: number) {
  return z.string().trim().min(1).max(max);
}

const extractedRequestSchema = z.object({
  senderName: shortText(100).nullable(),
  organization: shortText(100).nullable(),
  kind: z.enum(["remittance", "document", "schedule", "other"]).nullable(),
  title: shortText(100).nullable(),
  amount: z.number().int().min(0).max(1e13).nullable(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, "통화 코드는 ISO 4217 3자리여야 해요.")
    .nullable(),
  dueText: z.string().nullable(),
  dueDate: z
    .string()
    .nullable()
    .refine((v) => v === null || isValidDateString(v), { message: "날짜 형식이 올바르지 않습니다." }),
  dueAmbiguous: z.boolean(),
  tentative: z.boolean(),
  cancellation: z.boolean(),
  intent: z.enum(["new", "change", "unclear", "none"]),
});

const decideTargetSchema = z.object({
  relationship: z.union([z.object({ id: z.string().min(1) }), z.object({ newName: shortText(100) }), z.null()]),
  task: z.union([z.object({ id: z.string().min(1), expectedVersion: z.number().int() }), z.literal("new"), z.null()]),
});

const confirmationsSchema = z.object({
  date: z.boolean().optional(),
  tentativeAccepted: z.boolean().optional(),
});

export const decideRequestSchema = z.object({
  analysisId: z.string().min(1),
  index: z.number().int().min(0),
  receivedAt: z.string().min(1),
  decision: z.enum(["apply", "keep", "defer"]),
  extracted: extractedRequestSchema,
  target: decideTargetSchema,
  confirmations: confirmationsSchema,
});

export const proposalDecideBodySchema = z.object({
  decision: z.enum(["apply", "keep", "defer"]),
  target: decideTargetSchema,
  confirmations: confirmationsSchema,
  extracted: extractedRequestSchema.optional(),
});

export const taskStatusBodySchema = z.object({
  status: z.enum(["open", "done"]),
  expectedVersion: z.number().int(),
});

export const analyzeRequestSchema = z.object({
  text: z.string(),
  receivedAt: z.string().min(1),
  senderHint: z.string().nullable().optional(),
  organizationHint: z.string().nullable().optional(),
});

export function isValidIsoDateTime(s: string): boolean {
  return !Number.isNaN(Date.parse(s));
}
