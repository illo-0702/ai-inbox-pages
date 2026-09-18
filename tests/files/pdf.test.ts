// 실제 unpdf(pdf.js)로 실제 PDF 바이트를 읽는다 — 네트워크 호출 없음(로컬 파일 파싱만).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdfText } from "@/lib/files/pdf";

const FIXTURE_PATH = path.resolve(__dirname, "../fixtures/sample-request.pdf");

describe("extractPdfText — 실제 한국어 PDF", () => {
  it("핵심 문장을 그대로 추출한다", async () => {
    const bytes = new Uint8Array(await readFile(FIXTURE_PATH));
    const result = await extractPdfText(bytes, 2000);

    expect(result.pages).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.notice).toBeNull();
    expect(result.text).toContain("B상사 박팀장");
    expect(result.text).toContain("25일까지 견적서");
    expect(result.text).toContain("150만원");
    expect(result.text).toContain("30일까지");
  });

  it("maxChars보다 짧으면 잘리지 않는다(4자만 허용하는 극단적 상한으로 truncated 검증)", async () => {
    const bytes = new Uint8Array(await readFile(FIXTURE_PATH));
    const result = await extractPdfText(bytes, 4);
    expect(result.truncated).toBe(true);
    expect(result.text).toHaveLength(4);
    expect(result.notice).toContain("앞부분 4자만");
  });
});

describe("extractPdfText — 손상된 파일", () => {
  it("PDF가 아닌 임의의 바이트는 unreadable_file(400)로 거절한다", async () => {
    const bytes = new TextEncoder().encode("이것은 PDF가 아닌 임의의 바이트입니다 12345 XYZ 손상된 파일");
    await expect(extractPdfText(bytes, 2000)).rejects.toMatchObject({
      name: "FileExtractError",
      code: "unreadable_file",
      status: 400,
    });
  });
});
