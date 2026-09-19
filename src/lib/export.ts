// 데이터 내보내기 기능 — CSV/JSON 형식
import type { TaskView } from "@/lib/types";
import type { RelationshipSummary } from "@/lib/types";

interface ExportTask {
  업무명: string;
  관계명: string;
  담당자: string;
  금액: string;
  마감: string;
  상태: string;
  생성일: string;
}

/**
 * 날짜 형식화 (ISO → 한국 형식)
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  if (dateString.includes("T")) {
    // ISO datetime
    return new Date(dateString).toLocaleDateString("ko-KR");
  }
  // YYYY-MM-DD 형식
  return new Date(dateString + "T00:00:00").toLocaleDateString("ko-KR");
}

/**
 * 통화 형식화
 */
function formatAmount(amount: number | null, currency: string | null): string {
  if (amount === null) return "";
  if (currency === "KRW" || !currency) {
    return new Intl.NumberFormat("ko-KR").format(amount);
  }
  return `${amount} ${currency}`;
}

/**
 * 상태 한글 변환
 */
function formatStatus(status: string): string {
  return status === "open" ? "진행 중" : "완료";
}

/**
 * CSV로 내보내기
 */
export function exportToCSV(
  tasks: TaskView[],
  relationships: Map<string, RelationshipSummary>
): string {
  // CSV 헤더
  const headers = ["업무명", "관계명", "담당자", "금액", "마감", "상태", "생성일"];

  // CSV 본문
  const rows: ExportTask[] = tasks.map((task) => {
    const relationship = relationships.get(task.relationshipId);
    const contacts = relationship?.contacts.join(", ") || "";

    return {
      업무명: task.title,
      관계명: task.relationshipName,
      담당자: contacts,
      금액: formatAmount(task.amount, task.currency),
      마감: formatDate(task.dueDate),
      상태: formatStatus(task.status),
      생성일: formatDate(task.createdAt),
    };
  });

  // CSV 문자열 생성 (BOM 추가 — Excel에서 한글 인코딩 자동 감지)
  const csv = [
    "﻿", // UTF-8 BOM
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCSV(row[header as keyof ExportTask] || "")).join(",")
    ),
  ].join("\n");

  return csv;
}

/**
 * CSV 셀 이스케이프 (따옴표 포함)
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * JSON으로 내보내기
 */
export function exportToJSON(
  tasks: TaskView[],
  relationships: Map<string, RelationshipSummary>
): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: 1,
    tasks: tasks.map((task) => ({
      id: task.id,
      relationshipId: task.relationshipId,
      relationshipName: task.relationshipName,
      kind: task.kind,
      title: task.title,
      amount: task.amount,
      currency: task.currency,
      dueDate: task.dueDate,
      status: task.status,
      version: task.version,
      lastReceivedAt: task.lastReceivedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
      dueState: task.dueState,
      pendingProposalCount: task.pendingProposalCount,
    })),
    relationships: Array.from(relationships.values()).map((rel) => ({
      id: rel.id,
      name: rel.name,
      contacts: rel.contacts,
      openTaskCount: rel.openTaskCount,
      pendingCount: rel.pendingCount,
      updatedAt: rel.updatedAt,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * 파일명 생성 (타임스탬프 포함)
 */
export function generateFileName(format: "csv" | "json"): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const time = new Date().toTimeString().split(" ")[0].replace(/:/g, ""); // HHMMSS
  return `ai-inbox-backup-${today}-${time}.${format}`;
}

/**
 * 다운로드 트리거
 */
export function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 메모리 해제
  URL.revokeObjectURL(url);
}

/**
 * CSV 다운로드
 */
export function downloadCSV(tasks: TaskView[], relationships: Map<string, RelationshipSummary>): void {
  const csv = exportToCSV(tasks, relationships);
  const fileName = generateFileName("csv");
  downloadFile(csv, fileName, "text/csv;charset=utf-8");
}

/**
 * JSON 다운로드
 */
export function downloadJSON(tasks: TaskView[], relationships: Map<string, RelationshipSummary>): void {
  const json = exportToJSON(tasks, relationships);
  const fileName = generateFileName("json");
  downloadFile(json, fileName, "application/json;charset=utf-8");
}
