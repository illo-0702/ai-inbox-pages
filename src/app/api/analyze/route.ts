// POST /api/analyze — 원문을 분석해 제안 초안을 만든다. DB에 아무것도 저장하지 않는다.
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ExtractionError, extract } from "@/lib/ai";
import type { AnalyzeResponse } from "@/lib/types";
import { getDb } from "@/lib/server/db";
import { analyzeRequestSchema, apiError, handleRouteError, isValidIsoDateTime } from "@/lib/server/http";
import { judge } from "@/lib/server/judge";
import { buildRelationshipRefs, buildTaskSnapshots } from "@/lib/server/queries";
import { checkAnalyzeRateLimit, getWorkspace } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INPUT_CHARS = Number(process.env.MAX_INPUT_CHARS ?? 2000);

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const workspace = await getWorkspace({ create: true });
    if (!workspace) return apiError("invalid_request", "세션을 확인할 수 없어요.", 400);

    const json = await req.json().catch(() => null);
    if (!json) return apiError("invalid_request", "요청 형식이 올바르지 않습니다.", 400);
    const parsed = analyzeRequestSchema.safeParse(json);
    if (!parsed.success) return apiError("invalid_request", "요청 형식이 올바르지 않습니다.", 400);
    const { text, receivedAt, senderHint, organizationHint } = parsed.data;

    // 빈 입력은 AI를 호출하지 않는다.
    if (text.trim().length === 0) {
      return apiError("empty_input", "내용을 입력해주세요.", 400);
    }
    if (text.length > MAX_INPUT_CHARS) {
      return apiError("input_too_long", `입력은 ${MAX_INPUT_CHARS}자 이하로 작성해주세요.`, 400);
    }
    if (!isValidIsoDateTime(receivedAt)) {
      return apiError("invalid_request", "받은 날짜가 올바르지 않습니다.", 400);
    }

    const allowed = await checkAnalyzeRateLimit(workspace.id);
    if (!allowed) {
      return apiError("rate_limited", "분석 요청이 너무 많아요. 잠시 후 다시 시도해주세요.", 429);
    }

    const db = await getDb();
    const relationships = await buildRelationshipRefs(db, workspace.id);
    const tasks = await buildTaskSnapshots(db, workspace.id);
    const knownRelationships = relationships.map((r) => ({ name: r.name, contacts: r.contacts }));

    let result;
    try {
      result = await extract({
        text,
        receivedAt,
        senderHint: senderHint ?? null,
        organizationHint: organizationHint ?? null,
        knownRelationships,
      });
    } catch (err) {
      if (err instanceof ExtractionError) {
        return apiError("analysis_failed", "분석에 실패했어요. 잠시 후 다시 시도해주세요.", 502);
      }
      throw err;
    }

    const drafts = result.requests.map((extracted, index) => judge(extracted, receivedAt, { relationships, tasks }, index));

    const response: AnalyzeResponse = {
      analysisId: randomUUID(),
      receivedAt,
      provider: result.provider,
      model: result.model,
      usedFallback: result.fallbacks.length > 0,
      drafts,
    };
    return NextResponse.json(response);
  } catch (err) {
    return handleRouteError(err);
  }
}
