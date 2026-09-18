// PDF에서 텍스트만 추출한다(메모리 처리, 디스크에 쓰지 않음). unpdf(pdf.js) 위의 순수 함수 계층.
import { extractText, getDocumentProxy } from "unpdf";
import { FileExtractError } from "./types";
import { finalizeExtractedText, type FinalizedText } from "./text";

/** 기획서 5.2·14장 — PDF 페이지 수 상한 */
export const MAX_PDF_PAGES = 10;

export interface PdfExtractResult extends FinalizedText {
  pages: number;
}

const ENCRYPTED_MESSAGE = "암호가 걸린 PDF는 열 수 없어요. 내용을 복사해 붙여넣어 주세요.";
const UNREADABLE_MESSAGE = "파일을 읽을 수 없어요. 손상된 파일일 수 있어요.";

function isPasswordError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === "PasswordException") return true;
  return /password/i.test(e.message);
}

/** getDocumentProxy 로딩 실패를 pdf_encrypted/unreadable_file로 분류한다. */
async function loadPdf(bytes: Uint8Array) {
  try {
    // verbosity: 0 — pdf.js 내부 경고 로그(파일 내용과 무관하지만 잡음)를 끈다.
    return await getDocumentProxy(bytes, { verbosity: 0 });
  } catch (e) {
    if (isPasswordError(e)) {
      throw new FileExtractError("pdf_encrypted", ENCRYPTED_MESSAGE, 400);
    }
    throw new FileExtractError("unreadable_file", UNREADABLE_MESSAGE, 400);
  }
}

async function extractRawText(pdf: Awaited<ReturnType<typeof getDocumentProxy>>): Promise<string> {
  try {
    const result = await extractText(pdf, { mergePages: true });
    return result.text.trim();
  } catch (e) {
    if (isPasswordError(e)) {
      throw new FileExtractError("pdf_encrypted", ENCRYPTED_MESSAGE, 400);
    }
    throw new FileExtractError("unreadable_file", UNREADABLE_MESSAGE, 400);
  }
}

/** PDF 바이트 → 텍스트. 손상·암호·페이지 초과·빈 텍스트(스캔본)를 구분해 FileExtractError로 던진다. */
export async function extractPdfText(bytes: Uint8Array, maxChars: number): Promise<PdfExtractResult> {
  const pdf = await loadPdf(bytes);

  const pages = pdf.numPages;
  if (pages > MAX_PDF_PAGES) {
    throw new FileExtractError("pdf_too_many_pages", `PDF는 최대 ${MAX_PDF_PAGES}페이지까지 지원해요.`, 400);
  }

  const rawText = await extractRawText(pdf);
  if (rawText.length === 0) {
    throw new FileExtractError(
      "pdf_no_text",
      "읽을 수 있는 글자가 없어요. 이미지로 올리거나 직접 붙여넣어 주세요.",
      422,
    );
  }

  return { ...finalizeExtractedText(rawText, maxChars), pages };
}
