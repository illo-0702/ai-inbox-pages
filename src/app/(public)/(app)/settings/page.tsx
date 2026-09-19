"use client";

import { useEffect, useState } from "react";
import type { DashboardResponse, RelationshipSummary } from "@/lib/types";
import {
  loadNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from "@/lib/notifications";
import { getDashboard } from "@/lib/client/api";
import { ExportButton } from "@/components/ExportButton";

export default function SettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [relationships, setRelationships] = useState<RelationshipSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);

        // 알림 설정 로드
        const notificationSettings = loadNotificationSettings();
        setSettings(notificationSettings);

        // API에서 대시보드 데이터 가져오기
        try {
          const data = await getDashboard();
          setDashboardData(data);

          // 관계 목록 추출 (중복 제거)
          const uniqueRelationships = new Map<string, RelationshipSummary>();

          data.openTasks.forEach((task: any) => {
            if (!uniqueRelationships.has(task.relationshipId)) {
              uniqueRelationships.set(task.relationshipId, {
                id: task.relationshipId,
                name: task.relationshipName,
                contacts: [],
                openTaskCount: 0,
                pendingCount: 0,
                updatedAt: task.updatedAt,
              });
            }
          });

          data.doneTasks.forEach((task: any) => {
            if (!uniqueRelationships.has(task.relationshipId)) {
              uniqueRelationships.set(task.relationshipId, {
                id: task.relationshipId,
                name: task.relationshipName,
                contacts: [],
                openTaskCount: 0,
                pendingCount: 0,
                updatedAt: task.updatedAt,
              });
            }
          });

          setRelationships(Array.from(uniqueRelationships.values()));
        } catch (error) {
          console.error("Failed to load dashboard data:", error);
          // API 실패 시에도 계속 진행
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
    if (settings) {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      // 설정 저장
      saveNotificationSettings({
        ...settings,
        lastCheckedAt: new Date().toISOString(),
      });

      setSaveMessage("설정이 저장되었습니다");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 페이지 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">설정</h1>
          <p className="text-gray-600">알림 설정 및 데이터 관리</p>
        </div>

        {/* 저장 메시지 */}
        {saveMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {saveMessage}
          </div>
        )}

        {/* 알림 설정 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">알림 설정</h2>

          {/* 알림 전체 활성화 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-base font-medium text-gray-900">알림 활성화</label>
                <p className="text-sm text-gray-600 mt-1">
                  모든 알림을 활성화/비활성화합니다
                </p>
              </div>
              <button
                onClick={() =>
                  handleSettingChange("enabled", !settings.enabled)
                }
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                  settings.enabled ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? "translate-x-9" : "translate-x-1"
                  }`}
                ></span>
              </button>
            </div>
          </div>

          {/* 마감 알림 */}
          <div className="mb-6 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-base font-medium text-gray-900">
                  마감일 알림
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  오늘 마감하는 업무를 알림으로 받습니다
                </p>
              </div>
              <button
                onClick={() =>
                  handleSettingChange("deadline", !settings.deadline)
                }
                disabled={!settings.enabled}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                  settings.deadline ? "bg-blue-600" : "bg-gray-300"
                } ${!settings.enabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    settings.deadline ? "translate-x-9" : "translate-x-1"
                  }`}
                ></span>
              </button>
            </div>
          </div>

          {/* 확인필요 알림 */}
          <div className="mb-6 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-base font-medium text-gray-900">
                  확인필요 알림
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  7일 이상 미처리된 업무를 알림으로 받습니다
                </p>
              </div>
              <button
                onClick={() =>
                  handleSettingChange("pendingReview", !settings.pendingReview)
                }
                disabled={!settings.enabled}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                  settings.pendingReview ? "bg-blue-600" : "bg-gray-300"
                } ${!settings.enabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    settings.pendingReview ? "translate-x-9" : "translate-x-1"
                  }`}
                ></span>
              </button>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "저장 중..." : "설정 저장"}
            </button>
          </div>
        </div>

        {/* 데이터 백업 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">데이터 백업</h2>
          <p className="text-gray-600 mb-6">
            업무 목록을 CSV 또는 JSON 형식으로 내보내 백업하거나 다른 도구로 옮길 수 있습니다.
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-5a1 1 0 11-2 0 1 1 0 012 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-blue-900">자동 백업</h3>
                <p className="text-sm text-blue-800 mt-1">
                  지금 내보내기로 데이터를 다운로드하면, 나중에 import 기능으로 복원할 수
                  있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 데이터 통계 */}
          {dashboardData && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData.openTasks.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">진행 중인 업무</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData.doneTasks.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">완료된 업무</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData.pending.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">확인필요 제안</div>
              </div>
            </div>
          )}

          {/* 내보내기 버튼 */}
          <div className="flex gap-3">
            <ExportButton
              tasks={dashboardData?.openTasks ?? []}
              relationships={relationships}
            />
            <button className="px-4 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              가져오기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
