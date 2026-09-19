"use client";

import { useEffect, useState } from "react";
import type { Notification } from "@/lib/notifications";
import {
  loadNotifications,
  getUnreadNotificationCount,
  markAllAsRead,
  deleteNotification,
} from "@/lib/notifications";

interface NotificationBellProps {
  onNotificationUpdate?: (count: number) => void;
}

export function NotificationBell({ onNotificationUpdate }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 알림 로드
  useEffect(() => {
    const loadNotificationsData = () => {
      const data = loadNotifications();
      setNotifications(data);
      const count = getUnreadNotificationCount();
      setUnreadCount(count);
      onNotificationUpdate?.(count);
    };

    loadNotificationsData();
    const interval = setInterval(loadNotificationsData, 30000); // 30초마다 갱신

    return () => clearInterval(interval);
  }, [onNotificationUpdate]);

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    onNotificationUpdate?.(0);
  };

  const handleDeleteNotification = (id: string) => {
    deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const count = Math.max(0, unreadCount - 1);
    setUnreadCount(count);
    onNotificationUpdate?.(count);
  };

  const typeLabel = (type: string) => {
    return type === "deadline" ? "마감" : "확인필요";
  };

  const typeBgColor = (type: string) => {
    return type === "deadline" ? "bg-red-50" : "bg-yellow-50";
  };

  const typeTextColor = (type: string) => {
    return type === "deadline" ? "text-red-700" : "text-yellow-700";
  };

  return (
    <div className="relative">
      {/* 알림 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="알림"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">알림</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-gray-100 last:border-b-0 ${
                    notification.isRead ? "" : "bg-blue-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${typeBgColor(
                            notification.type
                          )} ${typeTextColor(notification.type)}`}
                        >
                          {typeLabel(notification.type)}
                        </span>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 font-medium truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      aria-label="삭제"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 바닥글 */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <a
                href="/settings"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                알림 설정
              </a>
            </div>
          )}
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
