// GET /api/capabilities — 파일 입력 관련 기능 가용성(구현 설계 3번).
// 미구현 입력 방식을 사용 가능한 기능처럼 보여주지 않기 위해 UI가 이 값으로 탭을 켜고 끈다(기획서 5.2).
import { NextResponse } from "next/server";
import { resolveProviderOrder } from "@/lib/ai/providers";
import type { CapabilitiesResponse } from "@/lib/files/extract";
import { handleRouteError } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const providers = resolveProviderOrder(process.env);
    const imageInput = providers.length > 0 && process.env.AI_IMAGE_INPUT !== "false";
    const body: CapabilitiesResponse = { pdfInput: true, imageInput };
    return NextResponse.json(body);
  } catch (err) {
    return handleRouteError(err);
  }
}
