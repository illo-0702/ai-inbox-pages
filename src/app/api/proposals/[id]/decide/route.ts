// POST /api/proposals/:id/decide — 저장된 pending 제안을 처리한다.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { decidePendingProposal } from "@/lib/server/apply";
import { getDb } from "@/lib/server/db";
import { apiError, handleRouteError, proposalDecideBodySchema } from "@/lib/server/http";
import { getWorkspace } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const workspace = await getWorkspace({ create: true });
    if (!workspace) return apiError("invalid_request", "세션을 확인할 수 없어요.", 400);
    const { id } = await params;

    const json = await req.json().catch(() => null);
    if (!json) return apiError("invalid_request", "요청 형식이 올바르지 않습니다.", 400);
    const parsed = proposalDecideBodySchema.safeParse(json);
    if (!parsed.success) return apiError("invalid_request", "요청 형식이 올바르지 않습니다.", 400);

    const db = await getDb();
    const result = await decidePendingProposal(db, workspace.id, id, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
