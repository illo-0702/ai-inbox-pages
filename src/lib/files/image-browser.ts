// 이미지에서 텍스트를 OCR로 추출한다(Tesseract.js 사용).
// 파일은 이 함수 실행 동안만 메모리에 있고 어디에도 저장하지 않는다.
"use client";

import { FileExtractError, type ExtractFileResponse } from "./types";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PIXELS = 3000 * 3000;
const MAX_CHARS = 2000;

/**
 * 이미지 파일의 크기 검증. 비율이 극단적인 경우(가로/세로 10배 이상) 예외 발생.
 */
function validateImageDimensions(width: number, height: number): void {
  if (width * height > MAX_PIXELS) {
    throw new FileExtractError(
      "image_too_large",
      `이미지가 너무 커요. 최대 ${Math.floor(Math.sqrt(MAX_PIXELS))}x${Math.floor(Math.sqrt(MAX_PIXELS))} 픽셀까지 지원합니다.`,
      413,
    );
  }
  const ratio = Math.max(width / height, height / width);
  if (ratio > 10) {
    throw new FileExtractError(
      "image_aspect_ratio",
      "이미지의 가로세로 비율이 너무 극단적이에요. 일반적인 문서나 사진을 업로드해주세요.",
      400,
    );
  }
}

/**
 * 이미지에서 Tesseract.js를 사용해 텍스트를 추출한다.
 */
export async function extractImageTextInBrowser(file: File): Promise<ExtractFileResponse> {
  // 파일 크기 검증
  if (file.size > MAX_SIZE) {
    throw new FileExtractError("image_too_large", `5MB 이하 파일만 지원해요.`, 413);
  }

  // 파일 타입 검증
  const mimeType = file.type.toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new FileExtractError(
      "unsupported_image_format",
      "JPG, PNG, WEBP 형식만 지원해요. 다른 형식으로 변환해보세요.",
      415,
    );
  }

  // 이미지 로드 및 차원 검증
  let imageData: string;
  try {
    const buf = await file.arrayBuffer();
    imageData = `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`;

    // 이미지 메타데이터 읽기
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          validateImageDimensions(img.width, img.height);
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("failed_to_load_image"));
      img.src = imageData;
    });
  } catch (e) {
    if (e instanceof FileExtractError) throw e;
    throw new FileExtractError(
      "unreadable_image",
      "이미지를 읽을 수 없어요. 손상됐거나 지원되지 않는 형식일 수 있어요.",
      400,
    );
  }

  // Tesseract.js로 OCR 수행
  let text = "";
  try {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("kor");
    try {
      const result = await worker.recognize(imageData);
      text = result.data.text;
    } finally {
      await worker.terminate();
    }
  } catch (e) {
    // eslint-disable-next-line no-console -- 디버그: 배포 전 제거 예정
    console.error("[image-ocr-error]", e);
    throw new FileExtractError(
      "ocr_failed",
      "이미지에서 텍스트를 인식하지 못했어요. 선명한 이미지를 다시 시도해주세요.",
      422,
    );
  }

  // 텍스트 정제
  const cleaned = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleaned) {
    throw new FileExtractError(
      "image_no_text",
      "읽을 수 있는 글자가 없어요. 텍스트가 명확하게 보이는 이미지를 사용해주세요.",
      422,
    );
  }

  const truncated = cleaned.length > MAX_CHARS;
  const finalText = truncated ? cleaned.slice(0, MAX_CHARS) : cleaned;

  return {
    kind: "image",
    text: finalText,
    truncated,
    provider: "demo", // Tesseract.js는 로컬 처리이므로 "demo"
    notice: truncated ? "앞부분 2000자만 가져왔어요. 필요한 부분만 남겨주세요." : null,
  };
}
