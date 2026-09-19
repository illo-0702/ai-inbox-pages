import { describe, it, expect } from "vitest";
import {
  exportToCSV,
  exportToJSON,
  generateFileName,
} from "@/lib/export";
import type { TaskView, RelationshipSummary } from "@/lib/types";

describe("Export", () => {
  const mockTasks: TaskView[] = [
    {
      id: "task1",
      relationshipId: "rel1",
      relationshipName: "Test Company",
      kind: "remittance",
      title: "Send Invoice",
      amount: 100000,
      currency: "KRW",
      dueDate: "2026-09-20",
      status: "open",
      version: 1,
      lastReceivedAt: "2026-09-18T10:00:00+09:00",
      createdAt: "2026-09-18T10:00:00+09:00",
      updatedAt: "2026-09-18T10:00:00+09:00",
      completedAt: null,
      dueState: "upcoming",
      pendingProposalCount: 0,
      lastChange: null,
    } as TaskView,
  ];

  const mockRelationships = new Map<string, RelationshipSummary>([
    [
      "rel1",
      {
        id: "rel1",
        name: "Test Company",
        contacts: ["john@example.com"],
        openTaskCount: 1,
        pendingCount: 0,
        updatedAt: "2026-09-18T10:00:00+09:00",
      },
    ],
  ]);

  it("should export to CSV format", () => {
    const csv = exportToCSV(mockTasks, mockRelationships);

    expect(csv).toBeDefined();
    expect(csv).toContain("업무명");
    expect(csv).toContain("관계명");
    expect(csv).toContain("Send Invoice");
    expect(csv).toContain("Test Company");
    // Check BOM
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("should export to JSON format", () => {
    const json = exportToJSON(mockTasks, mockRelationships);

    expect(json).toBeDefined();
    const parsed = JSON.parse(json);
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].title).toBe("Send Invoice");
    expect(parsed.relationships).toHaveLength(1);
    expect(parsed.relationships[0].name).toBe("Test Company");
  });

  it("should generate correct file name with date and time", () => {
    const fileName = generateFileName("csv");
    expect(fileName).toMatch(/^ai-inbox-backup-\d{4}-\d{2}-\d{2}-\d{6}\.csv$/);

    const jsonFileName = generateFileName("json");
    expect(jsonFileName).toMatch(/^ai-inbox-backup-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
  });

  it("should escape CSV cells with commas", () => {
    const tasks: TaskView[] = [
      {
        id: "task1",
        relationshipId: "rel1",
        relationshipName: "Company, Inc.",
        kind: "remittance",
        title: 'Invoice "123"',
        amount: 1000,
        currency: "KRW",
        dueDate: "2026-09-20",
        status: "open",
        version: 1,
        lastReceivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        dueState: "upcoming",
        pendingProposalCount: 0,
        lastChange: null,
      } as TaskView,
    ];

    const csv = exportToCSV(tasks, mockRelationships);

    // Should be properly escaped
    expect(csv).toContain('"Company, Inc."');
    expect(csv).toContain('"Invoice ""123"""');
  });

  it("should include all task fields in JSON export", () => {
    const json = exportToJSON(mockTasks, mockRelationships);
    const parsed = JSON.parse(json);

    const task = parsed.tasks[0];
    expect(task.id).toBe("task1");
    expect(task.kind).toBe("remittance");
    expect(task.title).toBe("Send Invoice");
    expect(task.amount).toBe(100000);
    expect(task.currency).toBe("KRW");
    expect(task.dueDate).toBe("2026-09-20");
    expect(task.status).toBe("open");
  });

  it("should handle empty task list", () => {
    const emptyCSV = exportToCSV([], mockRelationships);
    expect(emptyCSV).toContain("업무명");

    const emptyJSON = exportToJSON([], mockRelationships);
    const parsed = JSON.parse(emptyJSON);
    expect(parsed.tasks).toHaveLength(0);
  });

  it("should include export metadata in JSON", () => {
    const json = exportToJSON(mockTasks, mockRelationships);
    const parsed = JSON.parse(json);

    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.version).toBe(1);
    expect(new Date(parsed.exportedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
