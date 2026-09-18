// AI 추출 계층의 유일한 공개 진입점. src/lib/ai 밖에서는 extract()만 호출한다.
// 제공자 체인 → zod 검증(형식 오류 1회 재시도) → 공통 정규화 → 전부 실패 시 데모 폴백.

import type { ExtractionInput, ExtractionResult, ProviderId } from "../types";
import { ExtractionError } from "./errors";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { type ProviderConfig, ProviderCallError, callProvider, resolveProviderOrder } from "./providers";
import { aiOutputSchema, type AiRequest } from "./schema";
import { normalize, type RawExtractedRequest } from "./normalize";
import { extractDemo } from "./demo";

export { ExtractionError } from "./errors";

interface AttemptSuccess {
  ok: true;
  requests: RawExtractedRequest[];
}
interface AttemptFailure {
  ok: false;
  code: string;
}
type AttemptResult = AttemptSuccess | AttemptFailure;

function toRawExtractedRequest(r: AiRequest): RawExtractedRequest {
  return {
    senderName: r.senderName,
    organization: r.organization,
    kind: r.kind,
    title: r.title,
    amount: r.amount,
    currency: r.currency,
    dueText: r.dueText,
    dueDateGuess: r.dueDate,
    tentative: r.tentative,
    cancellation: r.cancellation,
    intent: r.intent,
  };
}

/** 운영 로그: 제공자 ID·오류 코드·지연만 남긴다. 원문·응답 본문·키는 절대 남기지 않는다. */
function logProviderFailure(provider: ProviderId, errorCode: string, ms: number): void {
  console.warn(JSON.stringify({ provider, errorCode, ms }));
}

async function attemptOnce(
  cfg: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<AttemptResult> {
  const started = Date.now();
  try {
    const raw = await callProvider(cfg, systemPrompt, userPrompt, fetchImpl, timeoutMs);
    const parsed = aiOutputSchema.safeParse(raw);
    if (!parsed.success) {
      logProviderFailure(cfg.id, "invalid_output", Date.now() - started);
      return { ok: false, code: "invalid_output" };
    }
    return { ok: true, requests: parsed.data.requests.map(toRawExtractedRequest) };
  } catch (e) {
    const code = e instanceof ProviderCallError ? e.code : "network";
    logProviderFailure(cfg.id, code, Date.now() - started);
    return { ok: false, code };
  }
}

export interface ExtractOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

/** 원문 → 구조화 요청(ExtractedRequest[]). 이 함수가 src/lib/ai의 유일한 공개 API다. */
export async function extract(input: ExtractionInput, opts: ExtractOptions = {}): Promise<ExtractionResult> {
  const env = opts.env ?? (typeof process !== "undefined" ? process.env : {});
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const timeoutMs = Number(env.AI_TIMEOUT_MS) || 20000;
  const demoFallbackEnabled = env.AI_DEMO_FALLBACK !== "false";

  const providers = resolveProviderOrder(env);
  const fallbacks: { provider: ProviderId; errorCode: string }[] = [];

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  for (const cfg of providers) {
    let result = await attemptOnce(cfg, systemPrompt, userPrompt, fetchImpl, timeoutMs);

    if (!result.ok && result.code === "invalid_output") {
      // 형식 오류는 같은 제공자에서 1회만 재시도한다.
      fallbacks.push({ provider: cfg.id, errorCode: result.code });
      result = await attemptOnce(cfg, systemPrompt, userPrompt, fetchImpl, timeoutMs);
    }

    if (result.ok) {
      const requests = normalize(result.requests, input);
      return { provider: cfg.id, model: cfg.model, requests, fallbacks };
    }

    fallbacks.push({ provider: cfg.id, errorCode: result.code });
  }

  if (demoFallbackEnabled) {
    const requests = normalize(extractDemo(input.text), input);
    return { provider: "demo", model: null, requests, fallbacks };
  }

  throw new ExtractionError("analysis_failed");
}
