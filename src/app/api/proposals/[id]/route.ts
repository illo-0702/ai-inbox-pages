// GET /api/proposals/:id — 저장된 제안 상세(관계/업무 후보 재계산 포함).
import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { apiError, handleRouteError } from "@/lib/server/http";
import { getProposalView } from "@/lib/server/queries";
import { getWorkspace } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const workspace = await getWorkspace({ create: true });
    if (!workspace) return apiError("invalid_request", "세션을 확인할 수 없어요.", 400);
    const { id } = await params;
    const db = await getDb();
    const view = await getProposalView(db, workspace.id, id);
    if (!view) return apiError("not_found", "제안을 찾을 수 없습니다.", 404);
    return NextResponse.json(view);
  } catch (err) {
    return handleRouteError(err);
  }
}
