// POST /api/tasks/:id/status — 완료 처리/되돌리기.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { setTaskStatus } from "@/lib/server/apply";
import { getDb } from "@/lib/server/db";
import { apiError, handleRouteError, taskStatusBodySchema } from "@/lib/server/http";
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
    const parsed = taskStatusBodySchema.safeParse(json);
    if (!parsed.success) return apiError("invalid_request", "요청 형식이 올바르지 않습니다.", 400);

    const db = await getDb();
    const task = await setTaskStatus(db, workspace.id, id, parsed.data.status, parsed.data.expectedVersion);
    return NextResponse.json(task);
  } catch (err) {
    return handleRouteError(err);
  }
}
