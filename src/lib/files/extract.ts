// PDF/이미지 파일 → 텍스트 추출의 공개 진입점(순수 함수 계층).
// 라우트(src/app/api/extract-file/route.ts)는 이 모듈과 src/lib/ai/vision.ts만 조합한다.
// 주의: unpdf를 참조하므로 서버 전용이다. 클라이언트 코드는 대신 "@/lib/files/types"를 import한다.

export { MAX_FILE_BYTES, resolveFileType, validateUpload } from "./validate";
export type { ResolvedFileType, UploadMeta } from "./validate";

export { MAX_PDF_PAGES, extractPdfText } from "./pdf";
export type { PdfExtractResult } from "./pdf";

export { finalizeExtractedText, truncationNotice, UNREADABLE_MARK } from "./text";
export type { FinalizedText } from "./text";

export { FileExtractError } from "./types";
export type { FileKind, ExtractFileResponse, CapabilitiesResponse } from "./types";
