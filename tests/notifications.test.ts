import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generateNotifications,
  loadNotificationSettings,
  saveNotificationSettings,
  getDefaultNotificationSettings,
  loadNotifications,
  saveNotifications,
  loadShownNotificationIds,
  saveShownNotificationIds,
  markAllAsRead,
  deleteNotification,
  getUnreadNotificationCount,
} from "@/lib/notifications";
import type { TaskView } from "@/lib/types";

describe("Notifications", () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};

    (global as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
    };
  });

  afterEach(() => {
    (global as any).localStorage.clear();
  });

  it("should get default notification settings", () => {
    const settings = getDefaultNotificationSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.deadline).toBe(true);
    expect(settings.pendingReview).toBe(true);
  });

  it("should save and load notification settings", () => {
    const settings = {
      enabled: true,
      deadline: false,
      pendingReview: true,
      lastCheckedAt: new Date().toISOString(),
    };

    saveNotificationSettings(settings);
    const loaded = loadNotificationSettings();

    expect(loaded.enabled).toBe(true);
    expect(loaded.deadline).toBe(false);
    expect(loaded.pendingReview).toBe(true);
  });

  it("should generate deadline notifications for today's tasks", () => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const tasks: TaskView[] = [
      {
        id: "1",
        relationshipId: "rel1",
        relationshipName: "Test Company",
        kind: "remittance",
        title: "Send Invoice",
        amount: 1000,
        currency: "KRW",
        dueDate: today,
        status: "open",
        version: 1,
        lastReceivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        dueState: "today",
        pendingProposalCount: 0,
        lastChange: null,
      } as TaskView,
    ];

    const settings = getDefaultNotificationSettings();
    saveNotificationSettings(settings);

    const notifications = generateNotifications(tasks);

    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0].type).toBe("deadline");
    expect(notifications[0].taskId).toBe("1");
  });

  it("should not generate notifications when disabled", () => {
    const today = new Date().toISOString().split("T")[0];

    const tasks: TaskView[] = [
      {
        id: "1",
        relationshipId: "rel1",
        relationshipName: "Test Company",
        kind: "remittance",
        title: "Send Invoice",
        amount: 1000,
        currency: "KRW",
        dueDate: today,
        status: "open",
        version: 1,
        lastReceivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        dueState: "today",
        pendingProposalCount: 0,
        lastChange: null,
      } as TaskView,
    ];

    const settings = {
      enabled: false,
      deadline: true,
      pendingReview: true,
      lastCheckedAt: null,
    };
    saveNotificationSettings(settings);

    const notifications = generateNotifications(tasks);
    expect(notifications.length).toBe(0);
  });

  it("should save and load notifications", () => {
    const testNotifications = [
      {
        id: "notif1",
        type: "deadline" as const,
        taskId: "task1",
        taskTitle: "Test Task",
        relationshipName: "Test Rel",
        message: "Test message",
        createdAt: new Date().toISOString(),
        isRead: false,
      },
    ];

    saveNotifications(testNotifications);
    const loaded = loadNotifications();

    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe("notif1");
    expect(loaded[0].isRead).toBe(false);
  });

  it("should mark all notifications as read", () => {
    const testNotifications = [
      {
        id: "notif1",
        type: "deadline" as const,
        taskId: "task1",
        taskTitle: "Test Task",
        relationshipName: "Test Rel",
        message: "Test message",
        createdAt: new Date().toISOString(),
        isRead: false,
      },
      {
        id: "notif2",
        type: "pending_review" as const,
        taskId: "task2",
        taskTitle: "Test Task 2",
        relationshipName: "Test Rel 2",
        message: "Test message 2",
        createdAt: new Date().toISOString(),
        isRead: false,
      },
    ];

    saveNotifications(testNotifications);
    markAllAsRead();

    const loaded = loadNotifications();
    expect(loaded.every((n) => n.isRead)).toBe(true);
  });

  it("should get unread notification count", () => {
    const testNotifications = [
      {
        id: "notif1",
        type: "deadline" as const,
        taskId: "task1",
        taskTitle: "Test Task",
        relationshipName: "Test Rel",
        message: "Test message",
        createdAt: new Date().toISOString(),
        isRead: false,
      },
      {
        id: "notif2",
        type: "pending_review" as const,
        taskId: "task2",
        taskTitle: "Test Task 2",
        relationshipName: "Test Rel 2",
        message: "Test message 2",
        createdAt: new Date().toISOString(),
        isRead: true,
      },
    ];

    saveNotifications(testNotifications);
    const count = getUnreadNotificationCount();

    expect(count).toBe(1);
  });

  it("should delete a notification", () => {
    const testNotifications = [
      {
        id: "notif1",
        type: "deadline" as const,
        taskId: "task1",
        taskTitle: "Test Task",
        relationshipName: "Test Rel",
        message: "Test message",
        createdAt: new Date().toISOString(),
        isRead: false,
      },
    ];

    saveNotifications(testNotifications);
    deleteNotification("notif1");

    const loaded = loadNotifications();
    expect(loaded.length).toBe(0);
  });
});
