// 제공자 설정 판단(AI_PROVIDER_ORDER)과 OpenAI 호환/Gemini 어댑터.

import type { ProviderId } from "../types";

export interface ProviderConfig {
  id: "omniroute" | "gemini" | "openrouter";
  model: string;
  baseUrl: string | null; // omniroute·openrouter만 사용
  apiKey: string | null;
}

/** 제공자 호출 실패를 나타내는 내부 에러. code만 밖으로 노출된다(원문·응답 본문 없음). */
export class ProviderCallError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.name = "ProviderCallError";
    this.code = code;
  }
}

const DEFAULT_ORDER: ProviderId[] = ["omniroute", "gemini", "openrouter"];

/** AI_PROVIDER_ORDER 순서대로, "설정된" 제공자만 골라 반환한다. */
export function resolveProviderOrder(env: Record<string, string | undefined>): ProviderConfig[] {
  const orderRaw = env.AI_PROVIDER_ORDER?.trim();
  const order = orderRaw
    ? orderRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_ORDER;

  const configs: ProviderConfig[] = [];
  for (const id of order) {
    if (id === "omniroute") {
      const model = env.OMNIROUTE_MODEL;
      if (model) {
        configs.push({
          id: "omniroute",
          model,
          baseUrl: env.OMNIROUTE_BASE_URL?.trim() || "http://localhost:20128/v1",
          apiKey: env.OMNIROUTE_API_KEY || null,
        });
      }
    } else if (id === "gemini") {
      const model = env.GEMINI_MODEL;
      const apiKey = env.GEMINI_API_KEY;
      if (model && apiKey) configs.push({ id: "gemini", model, baseUrl: null, apiKey });
    } else if (id === "openrouter") {
      const model = env.OPENROUTER_MODEL;
      const apiKey = env.OPENROUTER_API_KEY;
      if (model && apiKey) {
        configs.push({ id: "openrouter", model, baseUrl: "https://openrouter.ai/api/v1", apiKey });
      }
    }
  }
  return configs;
}

/** 응답 문자열에서 ```json 코드펜스를 걷어내고 JSON을 파싱한다. */
function parseJsonLoose(content: string): unknown {
  let text = content.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderCallError("invalid_output");
  }
}

function isAbortError(e: unknown, controller: AbortController): boolean {
  if (controller.signal.aborted) return true;
  return e instanceof Error && e.name === "AbortError";
}

/** OmniRoute·OpenRouter 공용 OpenAI 호환 어댑터. */
export async function callOpenAiCompatible(
  cfg: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

    let res: Response;
    try {
      res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (e) {
      throw new ProviderCallError(isAbortError(e, controller) ? "timeout" : "network");
    }

    if (!res.ok) throw new ProviderCallError(`http_${res.status}`);

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new ProviderCallError("invalid_output");
    }

    const content = (data as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]
      ?.message?.content;
    if (typeof content !== "string") throw new ProviderCallError("invalid_output");
    return parseJsonLoose(content);
  } finally {
    clearTimeout(timer);
  }
}

/** Gemini generateContent 어댑터. */
export async function callGemini(
  cfg: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`;

    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": cfg.apiKey ?? "",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      });
    } catch (e) {
      throw new ProviderCallError(isAbortError(e, controller) ? "timeout" : "network");
    }

    if (!res.ok) throw new ProviderCallError(`http_${res.status}`);

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new ProviderCallError("invalid_output");
    }

    const text = (
      data as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> }
    )?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new ProviderCallError("invalid_output");
    return parseJsonLoose(text);
  } finally {
    clearTimeout(timer);
  }
}

/** 제공자 종류에 맞는 어댑터를 호출한다. */
export async function callProvider(
  cfg: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<unknown> {
  if (cfg.id === "gemini") return callGemini(cfg, systemPrompt, userPrompt, fetchImpl, timeoutMs);
  return callOpenAiCompatible(cfg, systemPrompt, userPrompt, fetchImpl, timeoutMs);
}
