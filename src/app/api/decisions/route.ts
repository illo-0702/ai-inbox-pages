// POST /api/decisions — 분석 결과 하나에 대한 사용자 결정(apply/keep/defer)을 적용한다.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyDecision } from "@/lib/server/apply";
import { getDb } from "@/lib/server/db";
import { apiError, decideRequestSchema, handleRouteError, isValidIsoDateTime } from "@/lib/server/http";
import { getWorkspace } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const workspace = await getWorkspace({ create: true });
    if (!workspace) return apiError("invalid_request", "세션을 확인할 수 없어요.", 400);

    const json = await req.json().catch(() => null);
    if (!json) return apiError("invalid_request", "요청 형식이 올바르지 않습니다.", 400);
    const parsed = decideRequestSchema.safeParse(json);
    if (!parsed.success) return apiError("invalid_request", "요청 형식이 올바르지 않습니다.", 400);
    if (!isValidIsoDateTime(parsed.data.receivedAt)) {
      return apiError("invalid_request", "받은 날짜가 올바르지 않습니다.", 400);
    }

    const db = await getDb();
    const result = await applyDecision(db, workspace.id, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
