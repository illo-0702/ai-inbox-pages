// GitHub Pages(정적) 버전의 저장 형태. 서버 DB 대신 브라우저 localStorage에 저장한다.
// 필드 이름은 src/lib/server의 Row 타입과 최대한 맞춰 judge.ts 등 순수 로직을 그대로 재사용한다.
import type {
  Decision,
  EventType,
  ExtractedRequest,
  FieldChange,
  IsoDateTime,
  Judgment,
  ReasonCode,
  TaskKind,
  TaskStatus,
} from "@/lib/types";

export interface RelationshipRow {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ContactRow {
  id: string;
  relationshipId: string;
  displayName: string;
  createdAt: IsoDateTime;
}

export interface TaskRow {
  id: string;
  relationshipId: string;
  kind: TaskKind;
  title: string;
  amount: number | null;
  currency: string | null;
  dueDate: string | null;
  status: TaskStatus;
  version: number;
  lastReceivedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  completedAt: IsoDateTime | null;
}

export interface ProposalRow {
  id: string;
  analysisId: string;
  itemIndex: number;
  createdAt: IsoDateTime;
  receivedAt: IsoDateTime;
  senderName: string | null;
  relationshipId: string | null;
  relationshipName: string | null;
  taskId: string | null;
  judgment: Judgment;
  reasonCodes: ReasonCode[];
  reasonText: string;
  changes: FieldChange[];
  extracted: ExtractedRequest;
  decision: Decision;
  decidedAt: IsoDateTime | null;
}

export interface EventRow {
  id: string;
  taskId: string | null;
  relationshipId: string | null;
  contactName: string | null;
  eventType: EventType;
  fieldChanges: FieldChange[];
  receivedAt: IsoDateTime | null;
  appliedAt: IsoDateTime;
  actor: "user";
}

export interface LocalData {
  version: 1;
  createdAt: IsoDateTime;
  relationships: RelationshipRow[];
  contacts: ContactRow[];
  tasks: TaskRow[];
  proposals: ProposalRow[];
  events: EventRow[];
}
