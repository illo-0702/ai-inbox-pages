// 알림 기능 — 마감/확인필요 업무 모니터링
import { todayInSeoul } from "@/lib/time";
import type { TaskView } from "@/lib/types";

export type NotificationType = "deadline" | "pending_review";

export interface Notification {
  id: string;
  type: NotificationType;
  taskId: string;
  taskTitle: string;
  relationshipName: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  deadline: boolean;
  pendingReview: boolean;
  lastCheckedAt: string | null;
}

const STORAGE_KEY_NOTIFICATIONS = "ai_inbox_notifications";
const STORAGE_KEY_SETTINGS = "ai_inbox_notification_settings";
const STORAGE_KEY_SHOWN = "ai_inbox_notifications_shown";

/**
 * 기본 알림 설정 반환
 */
export function getDefaultNotificationSettings(): NotificationSettings {
  return {
    enabled: true,
    deadline: true,
    pendingReview: true,
    lastCheckedAt: null,
  };
}

/**
 * localStorage에서 알림 설정 로드
 */
export function loadNotificationSettings(): NotificationSettings {
  if (typeof localStorage === "undefined") {
    return getDefaultNotificationSettings();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!stored) return getDefaultNotificationSettings();
    return JSON.parse(stored);
  } catch {
    return getDefaultNotificationSettings();
  }
}

/**
 * 알림 설정 저장
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // localStorage 쓰기 실패 — 무시
  }
}

/**
 * localStorage에서 알림 목록 로드
 */
export function loadNotifications(): Notification[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * 알림 저장
 */
export function saveNotifications(notifications: Notification[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
  } catch {
    // localStorage 쓰기 실패 — 무시
  }
}

/**
 * 보여준 알림 ID 목록 로드 (중복 방지용)
 */
export function loadShownNotificationIds(): Set<string> {
  if (typeof localStorage === "undefined") {
    return new Set();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY_SHOWN);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

/**
 * 보여준 알림 ID 저장
 */
export function saveShownNotificationIds(ids: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SHOWN, JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage 쓰기 실패 — 무시
  }
}

/**
 * 업무 목록에서 필요한 알림 생성
 */
export function generateNotifications(tasks: TaskView[]): Notification[] {
  const settings = loadNotificationSettings();
  if (!settings.enabled) return [];

  const now = new Date().toISOString();
  const today = todayInSeoul();
  const notifications: Notification[] = [];
  const shownIds = loadShownNotificationIds();

  // 오늘 마감 업무 알림
  if (settings.deadline) {
    for (const task of tasks) {
      if (task.dueState === "today" && task.status === "open") {
        const notificationId = `deadline_${task.id}`;
        if (!shownIds.has(notificationId)) {
          notifications.push({
            id: notificationId,
            type: "deadline",
            taskId: task.id,
            taskTitle: task.title,
            relationshipName: task.relationshipName,
            message: `${task.relationshipName} — ${task.title} 오늘 마감 (${task.dueDate})`,
            createdAt: now,
            isRead: false,
          });
          shownIds.add(notificationId);
        }
      }
    }
  }

  // 7일 이상 확인필요 업무 알림
  if (settings.pendingReview) {
    for (const task of tasks) {
      if (task.status === "open" && task.lastReceivedAt) {
        const lastReceivedDate = new Date(task.lastReceivedAt);
        const daysDiff = Math.floor((new Date(today + "T00:00:00+09:00").getTime() - lastReceivedDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 7) {
          const notificationId = `pending_${task.id}`;
          if (!shownIds.has(notificationId)) {
            notifications.push({
              id: notificationId,
              type: "pending_review",
              taskId: task.id,
              taskTitle: task.title,
              relationshipName: task.relationshipName,
              message: `${task.relationshipName} — ${task.title} ${daysDiff}일 동안 처리 안 됨`,
              createdAt: now,
              isRead: false,
            });
            shownIds.add(notificationId);
          }
        }
      }
    }
  }

  // 보여준 알림 ID 저장
  if (notifications.length > 0) {
    saveShownNotificationIds(shownIds);
  }

  return notifications;
}

/**
 * 모든 알림을 읽음으로 표시
 */
export function markAllAsRead(): void {
  const notifications = loadNotifications();
  const updated = notifications.map((n) => ({ ...n, isRead: true }));
  saveNotifications(updated);
}

/**
 * 알림 삭제
 */
export function deleteNotification(id: string): void {
  const notifications = loadNotifications();
  const updated = notifications.filter((n) => n.id !== id);
  saveNotifications(updated);
}

/**
 * 알림 초기화 (설정 리셋)
 */
export function clearAllNotifications(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEY_SHOWN);
  } catch {
    // localStorage 삭제 실패 — 무시
  }
}

/**
 * 미읽은 알림 개수
 */
export function getUnreadNotificationCount(): number {
  const notifications = loadNotifications();
  return notifications.filter((n) => !n.isRead).length;
}
