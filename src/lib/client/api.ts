// GitHub Pages(정적) 버전: 서버 API 대신 이 브라우저의 localStorage(src/lib/local/store.ts)를 호출한다.
// 함수 이름·시그니처는 서버 버전(docs/implementation-contract.md 8장)과 동일하게 맞춰
// 화면 컴포넌트를 건드리지 않는다. 오류 형태(ApiRequestError/ApiConflictError)도 그대로 유지한다.
import type {
  AnalyzeResponse,
  DecideRequest,
  DecideResponse,
  DashboardResponse,
  ExtractedRequest,
  IsoDateTime,
  ProposalDetailResponse,
  RelationshipDetail,
  RelationshipSummary,
  TaskSnapshot,
  TaskStatus,
  TaskView,
  UserDecision,
} from "@/lib/types";
import { FileExtractError, type CapabilitiesResponse, type ExtractFileResponse } from "@/lib/files/types";
import {
  analyzeLocal,
  decideLocal,
  decidePendingLocal,
  deleteAllLocal,
  getDashboardLocal,
  getProposalViewLocal,
  getRelationshipDetailLocal,
  getRelationshipsLocal,
  LocalStoreError,
  LocalVersionConflictError,
  setTaskStatusLocal,
} from "@/lib/local/store";
import { extractPdfTextInBrowser } from "@/lib/files/pdf-browser";

export type { ProposalDetailResponse };
export type { CapabilitiesResponse, ExtractFileResponse };

export interface AnalyzeRequest {
  text: string;
  receivedAt: IsoDateTime;
  senderHint?: string | null;
  organizationHint?: string | null;
}

export interface ProposalDecideRequest {
  decision: UserDecision;
  target: DecideRequest["target"];
  confirmations: DecideRequest["confirmations"];
  extracted?: ExtractedRequest;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export class ApiConflictError extends ApiRequestError {
  readonly latest: TaskSnapshot;
  constructor(latest: TaskSnapshot) {
    super(409, "version_conflict", "다른 변경이 먼저 적용됐어요. 최신 상태를 확인하세요.");
    this.name = "ApiConflictError";
    this.latest = latest;
  }
}

/** 동기 로컬 함수를 이 파일의 공용 오류 형태로 감싼다. 컴포넌트는 실제 API였을 때와 동일하게 처리한다. */
async function run<T>(fn: () => T): Promise<T> {
  // 로컬 저장소 접근은 동기지만, 화면이 "저장 중…" 등 실제 API처럼 다루도록 한 틱 미룬다.
  await Promise.resolve();
  try {
    return fn();
  } catch (err) {
    if (err instanceof LocalVersionConflictError) throw new ApiConflictError(err.latest);
    if (err instanceof LocalStoreError) throw new ApiRequestError(err.status, err.code, err.message);
    throw new ApiRequestError(500, "internal_error", "처리 중 오류가 발생했어요.");
  }
}

export function analyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  return run(() => analyzeLocal(req));
}

export function decide(req: DecideRequest): Promise<DecideResponse> {
  return run(() => decideLocal(req));
}

export function getDashboard(): Promise<DashboardResponse> {
  return run(() => getDashboardLocal());
}

export function getRelationships(): Promise<RelationshipSummary[]> {
  return run(() => getRelationshipsLocal());
}

export function getRelationshipDetail(id: string): Promise<RelationshipDetail> {
  return run(() => {
    const detail = getRelationshipDetailLocal(id);
    if (!detail) throw new LocalStoreError("not_found", "관계를 찾을 수 없습니다.", 404);
    return detail;
  });
}

export function getProposal(id: string): Promise<ProposalDetailResponse> {
  return run(() => {
    const view = getProposalViewLocal(id);
    if (!view) throw new LocalStoreError("not_found", "제안을 찾을 수 없습니다.", 404);
    return view;
  });
}

export function decideProposal(id: string, req: ProposalDecideRequest): Promise<DecideResponse> {
  return run(() => decidePendingLocal(id, req));
}

export function setTaskStatus(id: string, status: TaskStatus, expectedVersion: number): Promise<TaskView> {
  return run(() => {
    setTaskStatusLocal(id, status, expectedVersion);
    const detail = getDashboardLocal();
    const found = [...detail.openTasks, ...detail.doneTasks].find((t) => t.id === id);
    if (!found) throw new LocalStoreError("not_found", "업무를 찾을 수 없습니다.", 404);
    return found;
  });
}

export function deleteSession(): Promise<{ ok: true }> {
  return run(() => {
    deleteAllLocal();
    return { ok: true as const };
  });
}

/** 이 버전은 서버 AI를 연결하지 않으므로 이미지 인식은 항상 꺼져 있다. PDF는 브라우저에서 직접 읽는다. */
export function getCapabilities(): Promise<CapabilitiesResponse> {
  return Promise.resolve({ pdfInput: true, imageInput: false });
}

/** PDF에서 글자를 추출한다. 서버가 없으므로 브라우저(pdfjs)에서 직접 처리하고, 어디에도 저장하지 않는다. */
export async function extractFile(file: File): Promise<ExtractFileResponse> {
  const kind = file.type === "application/pdf" ? "pdf" : null;
  if (!kind) {
    throw new ApiRequestError(415, "unsupported_file", "PDF만 지원해요. 텍스트를 직접 붙여넣어도 돼요.");
  }
  if (file.size > 4 * 1024 * 1024) {
    throw new ApiRequestError(413, "file_too_large", "4MB 이하 파일만 지원해요.");
  }
  try {
    return await extractPdfTextInBrowser(file);
  } catch (err) {
    if (err instanceof FileExtractError) throw new ApiRequestError(err.status, err.code, err.message);
    throw new ApiRequestError(400, "unreadable_file", "파일을 읽을 수 없어요. 텍스트를 직접 붙여넣어 주세요.");
  }
}
