// 공유 계약 타입 — 모든 모듈(AI·도메인·API·UI)이 이 파일을 기준으로 맞춘다.
// 변경이 필요하면 docs/implementation-contract.md와 함께 고친다.

/** 날짜는 Asia/Seoul 기준 달력 날짜 문자열 "YYYY-MM-DD". 시각 정보 없음. */
export type DateString = string;
/** ISO-8601 시각 문자열(오프셋 포함, 예: "2026-09-18T09:00:00+09:00"). */
export type IsoDateTime = string;

export type TaskKind = "remittance" | "document" | "schedule" | "other";
export type TaskStatus = "open" | "done";

/** AI 판단 상태 (기획서 10장) */
export type Judgment = "confirmed" | "possible" | "needs_check";
/** 제안 처리 결과 (기획서 10장). draft는 저장되지 않은 분석 결과에만 쓰인다. */
export type Decision = "pending" | "applied" | "kept";

/** 후속 요청의 의도 — AI가 추정, 서버가 최종 판별 */
export type Intent = "new" | "change" | "unclear" | "none";

export type ReasonCode =
  | "tentative_expression" // 잠정 표현(될 것 같다, 확인해보겠다)
  | "relationship_unknown" // 업체·관계 미상
  | "relationship_new" // 처음 보는 업체 (정보성)
  | "multiple_task_candidates" // 같은 관계에 후보 업무가 여러 건
  | "date_ambiguous" // 날짜 해석 불명확
  | "date_missing_for_change" // 변경 의도인데 바뀐 값이 없음
  | "older_message" // 기존 적용 메시지보다 과거에 받은 메시지
  | "task_completed" // 후보 업무가 이미 완료됨
  | "no_changes" // 기존 값과 동일 → 중복 가능성
  | "currency_unclear" // 통화 불명확 (KRW 외)
  | "cancellation_or_removal" // 취소·철회 표현 → 자동 삭제 금지
  | "no_actionable_request" // 실행 요청 없음
  | "sender_missing"; // 발신자 누락

export type FieldName = "dueDate" | "amount" | "currency" | "title";

export interface FieldChange {
  field: FieldName;
  before: string | number | null;
  after: string | number | null;
}

// ─────────────────────────────── AI 추출 결과 ───────────────────────────────

/** AI(또는 데모 규칙 엔진)가 원문 한 건에서 뽑아낸 요청 하나. 없는 값은 null. */
export interface ExtractedRequest {
  senderName: string | null; // "김과장", "이영호 대리"
  organization: string | null; // "A창호" — 메시지에 명시된 업체명만
  kind: TaskKind | null; // null = 실행 요청 아님
  title: string | null; // 짧은 할 일 제목. 예: "송금", "견적서 전달"
  amount: number | null; // 정수, 통화 최소단위(원)
  currency: string | null; // "KRW" 등. 금액 없으면 null
  dueText: string | null; // 원문 속 기한 표현 그대로 짧게 ("22일까지", "내일")
  dueDate: DateString | null; // 받은 날짜 기준 해석 결과 (서버가 재검증)
  dueAmbiguous: boolean; // 해석이 여러 개 가능
  tentative: boolean; // 잠정·조건부 표현
  cancellation: boolean; // 취소·철회 표현
  intent: Intent; // 새 요청인지, 기존 업무 변경인지
}

export type ProviderId = "omniroute" | "gemini" | "openrouter" | "demo";

export interface ExtractionResult {
  provider: ProviderId;
  model: string | null;
  requests: ExtractedRequest[]; // 실행 요청이 없으면 빈 배열
  /** 앞선 제공자가 실패해 대체되었을 때의 기록(내용 없는 코드만) */
  fallbacks: { provider: ProviderId; errorCode: string }[];
}

export interface ExtractionInput {
  text: string; // 원문 (메모리에서만 사용, 저장 금지)
  receivedAt: IsoDateTime;
  senderHint: string | null; // 사용자가 입력 단계에서 보완한 발신자
  organizationHint: string | null; // 사용자가 입력 단계에서 보완한 업체
  /** 연결 후보 판단을 돕는 최소 구조화 문맥 — 원문 이력 아님 */
  knownRelationships: { name: string; contacts: string[] }[];
}

// ─────────────────────────────── 분석 제안(초안) ───────────────────────────────

export interface TaskSnapshot {
  id: string;
  relationshipId: string;
  relationshipName: string;
  kind: TaskKind;
  title: string;
  amount: number | null;
  currency: string | null;
  dueDate: DateString | null;
  status: TaskStatus;
  version: number;
  /** 가장 최근에 적용된 사건의 받은 시각 */
  lastReceivedAt: IsoDateTime | null;
}

export interface RelationshipRef {
  id: string;
  name: string;
  contacts: string[];
}

/** 서버가 결정적 규칙으로 만든, 요청 하나에 대한 제안 초안. 저장 전 상태. */
export interface ProposalDraft {
  index: number; // 분석 결과 내 순번
  extracted: ExtractedRequest;
  action: "create" | "update" | "none";
  judgment: Judgment;
  reasonCodes: ReasonCode[];
  /** 짧은 판단 이유(원문 인용 금지). 예: "같은 업체의 송금 요청이며, 기존 후보가 한 건입니다" */
  reasonText: string;
  relationship: RelationshipRef | null; // 매칭된 기존 관계
  relationshipCandidates: RelationshipRef[]; // 관계 미상 시 선택지
  suggestedRelationshipName: string | null; // 새 관계로 만들 때 이름
  task: TaskSnapshot | null; // 매칭된 기존 업무
  taskCandidates: TaskSnapshot[]; // 복수 후보일 때 선택지
  changes: FieldChange[]; // update일 때 필드별 기존→제안
  /** create일 때 저장될 초기 값 */
  newTask: {
    kind: TaskKind;
    title: string;
    amount: number | null;
    currency: string | null;
    dueDate: DateString | null;
  } | null;
}

export interface AnalyzeResponse {
  analysisId: string; // 멱등 키 겸 식별자 (UUID)
  receivedAt: IsoDateTime;
  provider: ProviderId;
  model: string | null;
  usedFallback: boolean;
  drafts: ProposalDraft[]; // 빈 배열이면 "등록할 할 일을 찾지 못했어요"
}

// ─────────────────────────────── 결정 요청 ───────────────────────────────

export type UserDecision = "apply" | "keep" | "defer";

/** 사용자가 초안에 대해 내린 결정. 서버는 extracted와 target으로 변경을 재계산한다. */
export interface DecideRequest {
  analysisId: string;
  index: number;
  receivedAt: IsoDateTime;
  decision: UserDecision;
  extracted: ExtractedRequest; // 사용자가 미리보기에서 수정한 값 포함
  target: {
    relationship: { id: string } | { newName: string } | null;
    task: { id: string; expectedVersion: number } | "new" | null;
  };
  /** 사용자가 날짜 해석 등 확인 질문에 "맞음"으로 답했는지 */
  confirmations: { date?: boolean; tentativeAccepted?: boolean };
}

export interface DecideResponse {
  decision: Decision; // applied | kept | pending
  proposalId: string;
  task: TaskSnapshot | null;
  duplicate: boolean; // 같은 멱등 키 재전송이었는지
}

/** 409 응답 본문 — 화면을 연 뒤 업무가 다른 결정으로 바뀐 경우 */
export interface ConflictResponse {
  error: "version_conflict";
  latest: TaskSnapshot;
}

// ─────────────────────────────── 조회 모델 ───────────────────────────────

export interface TaskView extends TaskSnapshot {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  completedAt: IsoDateTime | null;
  lastChange: { changes: FieldChange[]; appliedAt: IsoDateTime; contactName: string | null } | null;
  pendingProposalCount: number;
  dueState: "overdue" | "today" | "upcoming" | "none"; // Asia/Seoul 오늘 기준
}

export interface PendingProposalView {
  id: string;
  createdAt: IsoDateTime;
  receivedAt: IsoDateTime;
  judgment: Judgment;
  reasonCodes: ReasonCode[];
  reasonText: string;
  senderName: string | null;
  relationshipId: string | null;
  relationshipName: string | null; // 매칭 관계 또는 제안된 새 이름
  taskId: string | null;
  taskTitle: string | null;
  changes: FieldChange[];
  extracted: ExtractedRequest;
}

export type EventType =
  | "task_created"
  | "task_updated"
  | "change_kept"
  | "change_deferred"
  | "completed"
  | "reopened";

export interface EventView {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  relationshipId: string | null;
  eventType: EventType;
  contactName: string | null;
  fieldChanges: FieldChange[];
  receivedAt: IsoDateTime | null;
  appliedAt: IsoDateTime;
  actor: "user";
}

export interface RelationshipSummary {
  id: string;
  name: string;
  contacts: string[];
  openTaskCount: number;
  pendingCount: number;
  updatedAt: IsoDateTime;
}

export interface RelationshipDetail extends RelationshipSummary {
  tasks: TaskView[];
  pending: PendingProposalView[];
  events: EventView[]; // 최신순
}

export interface DashboardResponse {
  today: DateString;
  openTasks: TaskView[]; // 정렬: overdue → today → upcoming(날짜순) → none
  doneTasks: TaskView[]; // 완료 시각 최신순
  pending: PendingProposalView[];
  sessionExpiresAt: IsoDateTime;
}

export interface ApiError {
  error: string; // 기계용 코드
  message: string; // 사용자에게 보여줄 한국어 문장
}
