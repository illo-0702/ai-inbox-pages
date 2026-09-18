// GET /api/dashboard — 현재 해야 할 일 대시보드.
import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { apiError, handleRouteError } from "@/lib/server/http";
import { getDashboard } from "@/lib/server/queries";
import { getWorkspace } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const workspace = await getWorkspace({ create: true });
    if (!workspace) return apiError("invalid_request", "세션을 확인할 수 없어요.", 400);
    const db = await getDb();
    const dashboard = await getDashboard(db, workspace.id);
    return NextResponse.json(dashboard);
  } catch (err) {
    return handleRouteError(err);
  }
}
