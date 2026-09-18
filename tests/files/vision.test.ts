// src/lib/ai/vision.ts — 모의 fetch로만 검증한다(실제 네트워크 호출 금지).
import { afterEach, describe, expect, it, vi } from "vitest";
import { recognizeImageText, resolveVisionProviderOrder, VisionError } from "@/lib/ai/vision";

type FetchInput = RequestInfo | URL;

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}
function errResponse(status: number) {
  return { ok: false, status, json: async () => ({}) } as unknown as Response;
}

const SAMPLE_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
const GEMINI_URL_FRAGMENT = "generativelanguage.googleapis.com";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveVisionProviderOrder", () => {
  it("*_VISION_MODEL이 있으면 그 모델을 쓰고 텍스트 모델은 그대로 둔다", () => {
    const configs = resolveVisionProviderOrder({
      OMNIROUTE_MODEL: "text-model",
      OMNIROUTE_VISION_MODEL: "vision-model",
    });
    expect(configs).toHaveLength(1);
    expect(configs[0]).toMatchObject({ id: "omniroute", model: "text-model", visionModel: "vision-model" });
  });

  it("*_VISION_MODEL이 없으면 텍스트 모델로 대체한다", () => {
    const configs = resolveVisionProviderOrder({ OMNIROUTE_MODEL: "text-model" });
    expect(configs[0].visionModel).toBe("text-model");
  });

  it("설정되지 않은 제공자는 건너뛴다", () => {
    expect(resolveVisionProviderOrder({})).toEqual([]);
  });
});

describe("recognizeImageText", () => {
  it("OpenAI 호환 요청 본문 — content 배열에 텍스트 프롬프트 + image_url(data URL)을 담는다", async () => {
    const fetchImpl = vi.fn(async (input: FetchInput, init?: RequestInit): Promise<Response> => {
      expect(String(input)).toContain("/chat/completions");
      const body = JSON.parse((init?.body as string) ?? "{}");
      expect(body.model).toBe("vision-model");
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe("user");
      expect(body.messages[0].content).toEqual([
        { type: "text", text: expect.stringContaining("판독불가") },
        { type: "image_url", image_url: { url: expect.stringMatching(/^data:image\/png;base64,/) } },
      ]);
      return okResponse({ choices: [{ message: { content: "추출된 글자" } }] });
    });

    const result = await recognizeImageText(SAMPLE_BYTES, "image/png", {
      env: { OMNIROUTE_MODEL: "text-model", OMNIROUTE_VISION_MODEL: "vision-model" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ text: "추출된 글자", provider: "omniroute", model: "vision-model" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("Gemini 요청 본문 — parts에 텍스트 프롬프트 + inline_data(base64)를 담는다", async () => {
    const fetchImpl = vi.fn(async (input: FetchInput, init?: RequestInit): Promise<Response> => {
      expect(String(input)).toContain(GEMINI_URL_FRAGMENT);
      const body = JSON.parse((init?.body as string) ?? "{}");
      expect(body.contents).toHaveLength(1);
      expect(body.contents[0].role).toBe("user");
      expect(body.contents[0].parts[0]).toEqual({ text: expect.stringContaining("판독불가") });
      expect(body.contents[0].parts[1]).toEqual({
        inline_data: { mime_type: "image/png", data: expect.any(String) },
      });
      return okResponse({ candidates: [{ content: { parts: [{ text: "게미니 추출 결과" }] } }] });
    });

    const result = await recognizeImageText(SAMPLE_BYTES, "image/png", {
      env: { GEMINI_API_KEY: "gk", GEMINI_MODEL: "gemini-model" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ text: "게미니 추출 결과", provider: "gemini", model: "gemini-model" });
  });

  it("첫 제공자가 실패하면 다음 제공자로 넘어간다", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn(async (input: FetchInput): Promise<Response> => {
      const url = String(input);
      if (url.includes("20128")) return errResponse(500);
      if (url.includes(GEMINI_URL_FRAGMENT)) {
        return okResponse({ candidates: [{ content: { parts: [{ text: "성공" }] } }] });
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const result = await recognizeImageText(SAMPLE_BYTES, "image/png", {
      env: { OMNIROUTE_MODEL: "omni-model", GEMINI_API_KEY: "gk", GEMINI_MODEL: "gemini-model" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.provider).toBe("gemini");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("설정된 제공자가 없으면 fetch를 호출하지 않고 VisionError를 던진다", async () => {
    const fetchImpl = vi.fn();
    await expect(
      recognizeImageText(SAMPLE_BYTES, "image/png", {
        env: {},
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(VisionError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("모든 제공자가 실패하면 VisionError를 던진다(데모 폴백 없음)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn(async (): Promise<Response> => errResponse(500));

    await expect(
      recognizeImageText(SAMPLE_BYTES, "image/png", {
        env: { OMNIROUTE_MODEL: "omni-model", GEMINI_API_KEY: "gk", GEMINI_MODEL: "gemini-model" },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(VisionError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("로그(console)에 추출된 텍스트나 base64가 남지 않는다", async () => {
    const secretText = "이미지에서 추출한 매우 민감한 문장-XYZ999";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const fetchImpl = vi.fn(async (input: FetchInput): Promise<Response> => {
      const url = String(input);
      if (url.includes("20128")) return errResponse(500); // 실패한 시도 → 로그에 남음(코드만)
      return okResponse({ candidates: [{ content: { parts: [{ text: secretText }] } }] });
    });

    const base64Fragment = Buffer.from(SAMPLE_BYTES).toString("base64").slice(0, 12);

    const result = await recognizeImageText(SAMPLE_BYTES, "image/png", {
      env: { OMNIROUTE_MODEL: "omni-model", GEMINI_API_KEY: "gk", GEMINI_MODEL: "gemini-model" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.text).toBe(secretText);

    for (const spy of [warnSpy, logSpy, errorSpy]) {
      for (const call of spy.mock.calls) {
        const serialized = call.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
        expect(serialized).not.toContain(secretText);
        expect(serialized).not.toContain(base64Fragment);
      }
    }
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(Object.keys(logged).sort()).toEqual(["errorCode", "ms", "provider"]);
  });
});
