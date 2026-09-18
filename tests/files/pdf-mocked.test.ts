// unpdf를 모킹해 실제 파일로는 만들기 번거로운 경계 상황(암호·과다 페이지·빈 텍스트)을 검증한다.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(),
  extractText: vi.fn(),
}));

import { extractText, getDocumentProxy } from "unpdf";
import { extractPdfText, MAX_PDF_PAGES } from "@/lib/files/pdf";

const mockGetDocumentProxy = getDocumentProxy as unknown as ReturnType<typeof vi.fn>;
const mockExtractText = extractText as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockGetDocumentProxy.mockReset();
  mockExtractText.mockReset();
});

describe("extractPdfText — 경계 상황(모킹된 unpdf)", () => {
  it("페이지 수가 상한을 넘으면 pdf_too_many_pages(400) — extractText는 호출하지 않는다", async () => {
    mockGetDocumentProxy.mockResolvedValueOnce({ numPages: MAX_PDF_PAGES + 1 });

    await expect(extractPdfText(new Uint8Array([1]), 2000)).rejects.toMatchObject({
      code: "pdf_too_many_pages",
      status: 400,
    });
    expect(mockExtractText).not.toHaveBeenCalled();
  });

  it("암호가 걸린 PDF(PasswordException) → pdf_encrypted(400)", async () => {
    const err = new Error("No password given");
    err.name = "PasswordException";
    mockGetDocumentProxy.mockRejectedValueOnce(err);

    await expect(extractPdfText(new Uint8Array([1]), 2000)).rejects.toMatchObject({
      code: "pdf_encrypted",
      status: 400,
    });
  });

  it("추출된 텍스트가 비어있으면(스캔본) pdf_no_text(422)", async () => {
    mockGetDocumentProxy.mockResolvedValueOnce({ numPages: 1 });
    mockExtractText.mockResolvedValueOnce({ totalPages: 1, text: "   \n  " });

    await expect(extractPdfText(new Uint8Array([1]), 2000)).rejects.toMatchObject({
      code: "pdf_no_text",
      status: 422,
    });
  });

  it("로딩 자체가 실패하면(손상 파일) unreadable_file(400)", async () => {
    mockGetDocumentProxy.mockRejectedValueOnce(new Error("Invalid PDF structure"));

    await expect(extractPdfText(new Uint8Array([1]), 2000)).rejects.toMatchObject({
      code: "unreadable_file",
      status: 400,
    });
  });

  it("정상 추출 시 pages와 텍스트를 그대로 담는다", async () => {
    mockGetDocumentProxy.mockResolvedValueOnce({ numPages: 3 });
    mockExtractText.mockResolvedValueOnce({ totalPages: 3, text: "정상 추출된 내용" });

    const result = await extractPdfText(new Uint8Array([1]), 2000);
    expect(result).toEqual({ pages: 3, text: "정상 추출된 내용", truncated: false, notice: null });
  });
});
