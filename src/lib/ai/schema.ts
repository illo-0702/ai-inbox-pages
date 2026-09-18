// AI 제공자 출력(JSON)을 검증하는 zod 스키마. 검증 실패 = 형식 오류(invalid_output).

import { z } from "zod";

const taskKindSchema = z.enum(["remittance", "document", "schedule", "other"]);
const intentSchema = z.enum(["new", "change", "unclear", "none"]);

const nullableString = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v == null ? null : v));

const nullableNumber = z
  .number()
  .nullable()
  .optional()
  .transform((v) => (v == null ? null : v));

const boolFlag = z
  .boolean()
  .optional()
  .transform((v) => v ?? false);

export const aiRequestSchema = z.object({
  senderName: nullableString,
  organization: nullableString,
  kind: taskKindSchema
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  title: nullableString,
  amount: nullableNumber,
  currency: nullableString,
  dueText: nullableString,
  /** AI의 원시 날짜 추정(참고용). 최종 판단은 항상 서버(dates.ts)가 다시 계산한다. */
  dueDate: nullableString,
  tentative: boolFlag,
  cancellation: boolFlag,
  intent: intentSchema,
});

export const aiOutputSchema = z.object({
  requests: z.array(aiRequestSchema),
});

export type AiRequest = z.infer<typeof aiRequestSchema>;
export type AiOutput = z.infer<typeof aiOutputSchema>;
