"use client";

import { useState } from "react";
import type { TaskView, RelationshipSummary } from "@/lib/types";
import { downloadCSV, downloadJSON } from "@/lib/export";

interface ExportButtonProps {
  tasks: TaskView[];
  relationships: RelationshipSummary[];
}

export function ExportButton({ tasks, relationships }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // RelationshipSummary를 Map으로 변환
  const relationshipMap = new Map(relationships.map((rel) => [rel.id, rel]));

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100)); // UI 업데이트 대기
      downloadCSV(tasks, relationshipMap);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100)); // UI 업데이트 대기
      downloadJSON(tasks, relationshipMap);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      {/* 내보내기 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="내보내기"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {isExporting ? "내보내는 중..." : "지금 내보내기"}
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden">
          <button
            onClick={handleExportCSV}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
          >
            <div className="font-medium text-gray-900">CSV로 내보내기</div>
            <div className="text-xs text-gray-500 mt-1">Excel에서 열 수 있음</div>
          </button>

          <button
            onClick={handleExportJSON}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
          >
            <div className="font-medium text-gray-900">JSON으로 내보내기</div>
            <div className="text-xs text-gray-500 mt-1">전체 데이터 복원용</div>
          </button>
        </div>
      )}

      {/* 바깥쪽 클릭 시 닫기 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
}
