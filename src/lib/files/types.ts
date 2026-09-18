// P1 파일 입력 전용 타입. src/lib/types.ts(공유 계약, 지휘자 소유)는 건드리지 않는다.
// 이 파일은 클라이언트(src/lib/client/api.ts)에서도 import하므로 unpdf 등 서버 전용 패키지를
// 참조해서는 안 된다(브라우저 번들에 섞여 들어가는 것을 막기 위함).
import type { ProviderId } from "@/lib/types";

export type FileKind = "pdf" | "image";

/** POST /api/extract-file 응답 (구현 설계 2번). */
export interface ExtractFileResponse {
  kind: FileKind;
  text: string;
  /** PDF일 때만 채움 */
  pages?: number;
  truncated: boolean;
  notice: string | null;
  /** 이미지일 때만 채움(어떤 비전 제공자가 인식했는지) */
  provider?: ProviderId;
}

/** GET /api/capabilities 응답 (구현 설계 3번). */
export interface CapabilitiesResponse {
  pdfInput: boolean;
  imageInput: boolean;
}

/**
 * 파일 추출 실패를 나타내는 에러. code/status는 API 응답에 그대로 쓰고,
 * message는 사용자에게 보여줄 한국어 문장이다. 원문·파일 내용은 담지 않는다.
 */
export class FileExtractError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "FileExtractError";
    this.code = code;
    this.status = status;
  }
}
