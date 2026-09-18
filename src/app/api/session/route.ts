// DELETE /api/session — 데모 데이터 즉시 삭제.
import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/server/http";
import { destroySession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(): Promise<NextResponse> {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
