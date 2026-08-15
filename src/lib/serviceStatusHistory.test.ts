import { describe, expect, it } from "vitest";

import { appendStatusHistory, buildStatusHistoryEntry, mapStatusHistoryEntries } from "./serviceStatusHistory";

const NOW = new Date(2026, 7, 4, 12, 0, 0);
const EARLIER = new Date(2026, 7, 4, 10, 0, 0);

function ts(date: Date) {
  return { toDate: () => date };
}

describe("buildStatusHistoryEntry", () => {
  it("trims status, updatedBy, and note", () => {
    const entry = buildStatusHistoryEntry({
      status: "  completed  ",
      timestamp: NOW,
      updatedBy: "  Ada  ",
      note: "  Job finished  ",
    });
    expect(entry.status).toBe("completed");
    expect(entry.updatedBy).toBe("Ada");
    expect(entry.note).toBe("Job finished");
  });

  it("throws when status is empty or whitespace", () => {
    expect(() =>
      buildStatusHistoryEntry({ status: "   ", timestamp: NOW, updatedBy: "Ada", note: "why" })
    ).toThrow(/status/i);
    expect(() =>
      buildStatusHistoryEntry({ status: "", timestamp: NOW, updatedBy: "Ada", note: "why" })
    ).toThrow(/status/i);
  });

  it("throws when note is empty or whitespace", () => {
    expect(() =>
      buildStatusHistoryEntry({ status: "pending", timestamp: NOW, updatedBy: "Ada", note: "   " })
    ).toThrow(/note/i);
    expect(() =>
      buildStatusHistoryEntry({ status: "pending", timestamp: NOW, updatedBy: "Ada", note: "" })
    ).toThrow(/note/i);
  });

  it("defaults blank updatedBy to Unknown", () => {
    const entry = buildStatusHistoryEntry({
      status: "pending",
      timestamp: NOW,
      updatedBy: "  ",
      note: "why",
    });
    expect(entry.updatedBy).toBe("Unknown");
  });
});

describe("appendStatusHistory", () => {
  it("prepends an entry onto an empty list", () => {
    const entry = buildStatusHistoryEntry({
      status: "in_progress",
      timestamp: NOW,
      updatedBy: "Ada",
      note: "Started work",
    });
    expect(appendStatusHistory(undefined, entry)).toEqual([entry]);
  });

  it("prepends onto existing newest-first history", () => {
    const existing = [
      { status: "pending", timestamp: EARLIER, updatedBy: "Bob", note: "Registered" },
    ];
    const entry = buildStatusHistoryEntry({
      status: "completed",
      timestamp: NOW,
      updatedBy: "Ada",
      note: "Job finished",
    });
    const next = appendStatusHistory(existing, entry);
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(entry);
    expect(next[1]).toEqual(existing[0]);
  });
});

describe("mapStatusHistoryEntries", () => {
  it("returns [] when missing or not an array", () => {
    expect(mapStatusHistoryEntries(undefined)).toEqual([]);
    expect(mapStatusHistoryEntries(null)).toEqual([]);
    expect(mapStatusHistoryEntries("nope")).toEqual([]);
  });

  it("maps Timestamp entries and sorts newest-first", () => {
    const mapped = mapStatusHistoryEntries([
      { status: "pending", timestamp: ts(EARLIER), updatedBy: "Bob", note: "Registered" },
      { status: "completed", timestamp: ts(NOW), updatedBy: "Ada", note: "Job finished" },
    ]);
    expect(mapped).toEqual([
      { status: "completed", timestamp: NOW, updatedBy: "Ada", note: "Job finished" },
      { status: "pending", timestamp: EARLIER, updatedBy: "Bob", note: "Registered" },
    ]);
  });

  it("omits note when missing, and drops entries with missing status or unreadable timestamp", () => {
    const mapped = mapStatusHistoryEntries([
      { status: "pending", timestamp: ts(NOW), updatedBy: "Ada" },
      { status: "", timestamp: ts(NOW), updatedBy: "Ada" },
      { status: "completed", timestamp: "not-a-date", updatedBy: "Ada" },
      { status: "cancelled", updatedBy: "Ada" },
    ]);
    expect(mapped).toEqual([
      { status: "pending", timestamp: NOW, updatedBy: "Ada" },
    ]);
  });

  it("defaults missing updatedBy to Unknown", () => {
    const mapped = mapStatusHistoryEntries([
      { status: "pending", timestamp: ts(NOW) },
    ]);
    expect(mapped[0]?.updatedBy).toBe("Unknown");
  });
});
