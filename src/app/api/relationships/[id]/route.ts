// GET /api/relationships/:id — 관계 상세 및 타임라인.
import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { apiError, handleRouteError } from "@/lib/server/http";
import { getRelationshipDetail } from "@/lib/server/queries";
import { getWorkspace } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const workspace = await getWorkspace({ create: true });
    if (!workspace) return apiError("invalid_request", "세션을 확인할 수 없어요.", 400);
    const { id } = await params;
    const db = await getDb();
    const detail = await getRelationshipDetail(db, workspace.id, id);
    if (!detail) return apiError("not_found", "관계를 찾을 수 없습니다.", 404);
    return NextResponse.json(detail);
  } catch (err) {
    return handleRouteError(err);
  }
}
