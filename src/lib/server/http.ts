// API 라우트 공용: zod 요청 스키마, 오류 응답 헬퍼.
import { NextResponse } from "next/server";
import { z } from "zod";
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
  // 내용 없는 진단 정보만 로그에 남긴다.
  console.error("[api] unexpected_error", err instanceof Error ? err.name : typeof err);
  return apiError("internal_error", "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.", 500);
}

const extractedRequestSchema = z.object({
  senderName: z.string().nullable(),
  organization: z.string().nullable(),
  kind: z.enum(["remittance", "document", "schedule", "other"]).nullable(),
  title: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  dueText: z.string().nullable(),
  dueDate: z.string().nullable(),
  dueAmbiguous: z.boolean(),
  tentative: z.boolean(),
  cancellation: z.boolean(),
  intent: z.enum(["new", "change", "unclear", "none"]),
});

const decideTargetSchema = z.object({
  relationship: z.union([z.object({ id: z.string().min(1) }), z.object({ newName: z.string().min(1) }), z.null()]),
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
