// PDF 텍스트 추출을 서버 없이 브라우저에서 직접 한다(GitHub Pages는 정적 파일만 서빙).
// 파일은 이 함수 실행 동안만 메모리에 있고 어디에도 저장하지 않는다.
"use client";

import { FileExtractError, type ExtractFileResponse } from "./types";

const MAX_PAGES = 10;
const MAX_CHARS = 2000;

export async function extractPdfTextInBrowser(file: File): Promise<ExtractFileResponse> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // 워커 파일을 번들러 자산으로 등록한다. new URL(..., import.meta.url) 패턴은 webpack이
  // basePath(assetPrefix)를 반영한 실제 배포 경로로 번들링해준다(GitHub Pages 프로젝트 페이지 포함).
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url,
    ).toString();
  }

  const buf = await file.arrayBuffer();
  let doc;
  try {
    doc = await pdfjsLib.getDocument({ data: buf }).promise;
  } catch (e) {
    // eslint-disable-next-line no-console -- 디버그: 배포 전 제거 예정
    console.error("[pdf-debug]", e);
    throw new FileExtractError("unreadable_file", "파일을 읽을 수 없어요. 손상됐거나 암호가 걸려 있을 수 있어요.", 400);
  }

  if (doc.numPages > MAX_PAGES) {
    throw new FileExtractError("pdf_too_many_pages", `PDF는 최대 ${MAX_PAGES}페이지까지 지원해요.`, 400);
  }

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    parts.push(text);
  }
  const full = parts.join("\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  if (!full) {
    throw new FileExtractError("pdf_no_text", "읽을 수 있는 글자가 없어요. 스캔 이미지일 수 있어요. 직접 붙여넣어 주세요.", 422);
  }

  const truncated = full.length > MAX_CHARS;
  const text = truncated ? full.slice(0, MAX_CHARS) : full;

  return {
    kind: "pdf",
    text,
    pages: doc.numPages,
    truncated,
    notice: truncated ? "앞부분 2000자만 가져왔어요. 필요한 부분만 남겨주세요." : null,
  };
}
