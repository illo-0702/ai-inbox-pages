// /api/* 호출 래퍼. 쿠키 세션 기반이므로 credentials: "same-origin"을 기본으로 쓴다.
// 계약: docs/implementation-contract.md 8장. 타입은 src/lib/types.ts를 따른다.
import type {
  AnalyzeResponse,
  ConflictResponse,
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
// P1 파일 입력 타입. "@/lib/files/types"는 unpdf 등 서버 전용 패키지를 참조하지 않는 순수 타입 모듈이라
// 클라이언트 번들에 안전하다(무거운 "@/lib/files/extract" 바렐은 여기서 import하지 않는다).
import type { CapabilitiesResponse, ExtractFileResponse } from "@/lib/files/types";

export type { ProposalDetailResponse };
export type { CapabilitiesResponse, ExtractFileResponse };

/** 계약 8장에는 없지만 요청 본문 형태를 명시하기 위한 로컬 타입 */
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

/** ApiError 형태를 유지하는 오류. 409 conflict는 ApiConflictError로 세분화한다. */
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      ...init,
    });
  } catch {
    throw new ApiRequestError(0, "network_error", "네트워크 연결을 확인해주세요.");
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // 본문이 없거나 JSON이 아님
  }

  if (!res.ok) {
    if (res.status === 409 && isConflictBody(body)) {
      throw new ApiConflictError(body.latest);
    }
    if (isApiErrorBody(body)) {
      throw new ApiRequestError(res.status, body.error, body.message);
    }
    throw new ApiRequestError(res.status, "unknown_error", "알 수 없는 오류가 발생했어요.");
  }

  return body as T;
}

function isApiErrorBody(v: unknown): v is { error: string; message: string } {
  return !!v && typeof v === "object" && "error" in v && "message" in v;
}

function isConflictBody(v: unknown): v is ConflictResponse {
  return !!v && typeof v === "object" && (v as ConflictResponse).error === "version_conflict";
}

export function analyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function decide(req: DecideRequest): Promise<DecideResponse> {
  return request<DecideResponse>("/api/decisions", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function getDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>("/api/dashboard");
}

export function getRelationships(): Promise<RelationshipSummary[]> {
  return request<RelationshipSummary[]>("/api/relationships");
}

export function getRelationshipDetail(id: string): Promise<RelationshipDetail> {
  return request<RelationshipDetail>(`/api/relationships/${encodeURIComponent(id)}`);
}

export function getProposal(id: string): Promise<ProposalDetailResponse> {
  return request<ProposalDetailResponse>(`/api/proposals/${encodeURIComponent(id)}`);
}

export function decideProposal(id: string, req: ProposalDecideRequest): Promise<DecideResponse> {
  return request<DecideResponse>(`/api/proposals/${encodeURIComponent(id)}/decide`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function setTaskStatus(
  id: string,
  status: TaskStatus,
  expectedVersion: number,
): Promise<TaskView> {
  return request<TaskView>(`/api/tasks/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: JSON.stringify({ status, expectedVersion }),
  });
}

export function deleteSession(): Promise<{ ok: true }> {
  return request<{ ok: true }>("/api/session", { method: "DELETE" });
}

/** GET /api/capabilities — PDF·이미지 입력 가능 여부. */
export function getCapabilities(): Promise<CapabilitiesResponse> {
  return request<CapabilitiesResponse>("/api/capabilities");
}

/**
 * POST /api/extract-file — PDF·이미지에서 텍스트만 추출한다(서버는 파일을 저장하지 않음).
 * multipart/form-data이므로 공용 request()의 강제 JSON Content-Type을 쓸 수 없어 별도로 호출한다.
 */
export async function extractFile(file: File): Promise<ExtractFileResponse> {
  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/extract-file", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });
  } catch {
    throw new ApiRequestError(0, "network_error", "네트워크 연결을 확인해주세요.");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // 본문이 없거나 JSON이 아님
  }

  if (!res.ok) {
    if (isApiErrorBody(body)) throw new ApiRequestError(res.status, body.error, body.message);
    throw new ApiRequestError(res.status, "unknown_error", "알 수 없는 오류가 발생했어요.");
  }

  return body as ExtractFileResponse;
}
