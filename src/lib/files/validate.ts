// 업로드 파일의 크기·형식 검사. 내용(바이트)은 열어보지 않는 순수 함수 계층.
import { FileExtractError, type FileKind } from "./types";

/** 4MB — Vercel류 서버리스 요청 본문 한도를 고려한 상한. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

const PDF_MIME = "application/pdf";
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);

const EXT_MIME: Record<string, string> = {
  pdf: PDF_MIME,
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const UNSUPPORTED_MESSAGE = "PDF, PNG, JPG, WEBP만 지원해요. 텍스트를 직접 붙여넣어도 돼요.";

export interface ResolvedFileType {
  kind: FileKind;
  mime: string;
}

export interface UploadMeta {
  name: string;
  type: string;
  size: number;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

/** MIME을 우선 신뢰하고, 없거나 알 수 없으면 파일 확장자로 보완 판단한다. */
export function resolveFileType(name: string, mimeRaw: string | null | undefined): ResolvedFileType | null {
  const mime = mimeRaw?.toLowerCase().trim() ?? "";
  if (mime === PDF_MIME) return { kind: "pdf", mime: PDF_MIME };
  if (IMAGE_MIMES.has(mime)) return { kind: "image", mime };

  const extMime = EXT_MIME[extensionOf(name)];
  if (extMime === PDF_MIME) return { kind: "pdf", mime: extMime };
  if (extMime && IMAGE_MIMES.has(extMime)) return { kind: "image", mime: extMime };

  return null;
}

/** 크기·형식을 검사해 통과하면 판별된 종류를 반환하고, 아니면 FileExtractError를 던진다. */
export function validateUpload(meta: UploadMeta): ResolvedFileType {
  if (meta.size <= 0) {
    throw new FileExtractError("unreadable_file", "파일을 읽을 수 없어요. 손상된 파일일 수 있어요.", 400);
  }
  if (meta.size > MAX_FILE_BYTES) {
    throw new FileExtractError(
      "file_too_large",
      `파일은 ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))}MB 이하만 업로드할 수 있어요.`,
      413,
    );
  }
  const resolved = resolveFileType(meta.name, meta.type);
  if (!resolved) {
    throw new FileExtractError("unsupported_file", UNSUPPORTED_MESSAGE, 415);
  }
  return resolved;
}
