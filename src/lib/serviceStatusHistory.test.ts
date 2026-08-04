import { describe, expect, it } from "vitest";

import { appendStatusHistory, mapStatusHistoryEntries } from "./serviceStatusHistory";

const NOW = new Date(2026, 7, 4, 12, 0, 0);
const EARLIER = new Date(2026, 7, 4, 10, 0, 0);

function ts(date: Date) {
  return { toDate: () => date };
}

describe("appendStatusHistory", () => {
  it("prepends an entry onto an empty list", () => {
    expect(
      appendStatusHistory(undefined, {
        status: "in_progress",
        timestamp: NOW,
        updatedBy: "Ada",
      })
    ).toEqual([
      { status: "in_progress", timestamp: NOW, updatedBy: "Ada" },
    ]);
  });

  it("prepends onto existing newest-first history", () => {
    const existing = [
      { status: "pending", timestamp: EARLIER, updatedBy: "Bob" },
    ];
    const next = appendStatusHistory(existing, {
      status: "completed",
      timestamp: NOW,
      updatedBy: "Ada",
    });
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual({ status: "completed", timestamp: NOW, updatedBy: "Ada" });
    expect(next[1]).toEqual(existing[0]);
  });

  it("trims status and updatedBy", () => {
    const [entry] = appendStatusHistory([], {
      status: "  completed  ",
      timestamp: NOW,
      updatedBy: "  Ada  ",
    });
    expect(entry.status).toBe("completed");
    expect(entry.updatedBy).toBe("Ada");
  });

  it("throws when status is empty or whitespace", () => {
    expect(() =>
      appendStatusHistory([], { status: "   ", timestamp: NOW, updatedBy: "Ada" })
    ).toThrow(/status/i);
    expect(() =>
      appendStatusHistory([], { status: "", timestamp: NOW, updatedBy: "Ada" })
    ).toThrow(/status/i);
  });

  it("defaults blank updatedBy to Unknown", () => {
    const [entry] = appendStatusHistory([], {
      status: "pending",
      timestamp: NOW,
      updatedBy: "  ",
    });
    expect(entry.updatedBy).toBe("Unknown");
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
      { status: "pending", timestamp: ts(EARLIER), updatedBy: "Bob" },
      { status: "completed", timestamp: ts(NOW), updatedBy: "Ada" },
    ]);
    expect(mapped).toEqual([
      { status: "completed", timestamp: NOW, updatedBy: "Ada" },
      { status: "pending", timestamp: EARLIER, updatedBy: "Bob" },
    ]);
  });

  it("drops entries with missing status or unreadable timestamp", () => {
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
