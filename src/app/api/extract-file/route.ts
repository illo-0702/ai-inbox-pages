// POST /api/extract-file — PDF·이미지에서 텍스트만 추출한다(메모리 처리, 저장 없음. 기획서 13.1/5.2).
// 파일 바이트·추출 텍스트는 로그에 남기지 않는다. 로그는 {kind, errorCode, ms}만 남긴다.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { recognizeImageText, VisionError } from "@/lib/ai/vision";
import {
  extractPdfText,
  FileExtractError,
  finalizeExtractedText,
  validateUpload,
  type ExtractFileResponse,
  type FileKind,
} from "@/lib/files/extract";
import { apiError, handleRouteError } from "@/lib/server/http";
import { checkAnalyzeRateLimit, getWorkspace } from "@/lib/server/session";
import { getDb } from "@/lib/server/db";
import { aiDailyLimitFromEnv, tryConsumeGlobalAiQuota } from "@/lib/server/repo/usage";
import { todayInSeoul } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INPUT_CHARS = Number(process.env.MAX_INPUT_CHARS ?? 2000);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  let kind: FileKind | null = null;
  let errorCode: string | null = null;

  try {
    const workspace = await getWorkspace({ create: true });
    if (!workspace) {
      errorCode = "invalid_request";
      return apiError("invalid_request", "세션을 확인할 수 없어요.", 400);
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      errorCode = "invalid_request";
      return apiError("invalid_request", "파일을 선택해주세요.", 400);
    }

    const resolved = validateUpload({ name: file.name, type: file.type, size: file.size });
    kind = resolved.kind;
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (resolved.kind === "pdf") {
      const result = await extractPdfText(bytes, MAX_INPUT_CHARS);
      const body: ExtractFileResponse = {
        kind: "pdf",
        text: result.text,
        pages: result.pages,
        truncated: result.truncated,
        notice: result.notice,
      };
      return NextResponse.json(body);
    }

    // 이미지 인식은 분석과 같은 비용을 쓰므로 분석 레이트리밋을 함께 소모한다.
    const allowed = await checkAnalyzeRateLimit(workspace.id);
    if (!allowed) {
      errorCode = "rate_limited";
      return apiError("rate_limited", "분석 요청이 너무 많아요. 잠시 후 다시 시도해주세요.", 429);
    }

    // 공개 링크 비용 보호: 오늘 외부 AI 호출 총량을 넘으면 이미지 인식을 멈춘다.
    const quotaOk = await tryConsumeGlobalAiQuota(await getDb(), todayInSeoul(), aiDailyLimitFromEnv(process.env));
    if (!quotaOk) {
      errorCode = "ai_daily_limit";
      return apiError("image_unavailable", "오늘 AI 사용량을 모두 써서 이미지 인식을 쉬고 있어요. 텍스트를 붙여넣어 주세요.", 503);
    }

    const recognized = await recognizeImageText(bytes, resolved.mime);
    const finalized = finalizeExtractedText(recognized.text, MAX_INPUT_CHARS);
    const body: ExtractFileResponse = {
      kind: "image",
      text: finalized.text,
      truncated: finalized.truncated,
      notice: finalized.notice,
      provider: recognized.provider,
    };
    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof FileExtractError) {
      errorCode = err.code;
      return apiError(err.code, err.message, err.status);
    }
    if (err instanceof VisionError) {
      errorCode = "image_unavailable";
      return apiError("image_unavailable", "이미지 인식은 AI 연결이 필요해요. 텍스트를 붙여넣어 주세요.", 503);
    }
    errorCode = "internal_error";
    return handleRouteError(err);
  } finally {
    // 내용 없는 운영 로그만 남긴다(기획서 13.1) — 원문·파일·추출 텍스트는 절대 포함하지 않는다.
    console.info(JSON.stringify({ kind, errorCode, ms: Date.now() - startedAt }));
  }
}
