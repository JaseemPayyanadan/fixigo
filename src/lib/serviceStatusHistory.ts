import type { StatusHistoryEntry } from "@/types";
import { readOptionalDate } from "./dateUtils";

/**
 * A single normalized history entry, ready to be written on its own.
 *
 * Kept separate from `appendStatusHistory` so the Firestore write can append
 * this one entry with `arrayUnion` instead of replacing the whole array from a
 * client-side snapshot, which loses entries when two people have the same
 * service open.
 */
export function buildStatusHistoryEntry(entry: {
  status: string;
  timestamp: Date;
  updatedBy: string;
  note: string;
}): StatusHistoryEntry {
  const status = entry.status.trim();
  if (!status) {
    throw new Error("status is required");
  }
  const note = entry.note.trim();
  if (!note) {
    throw new Error("note is required");
  }
  return {
    status,
    timestamp: entry.timestamp,
    updatedBy: entry.updatedBy.trim() || "Unknown",
    note,
  };
}

export function appendStatusHistory(
  existing: StatusHistoryEntry[] | undefined,
  entry: StatusHistoryEntry
): StatusHistoryEntry[] {
  return [entry, ...(existing ?? [])];
}

export function mapStatusHistoryEntries(raw: unknown): StatusHistoryEntry[] {
  if (!Array.isArray(raw)) return [];

  const mapped: StatusHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const status = typeof row.status === "string" ? row.status.trim() : "";
    if (!status) continue;
    const timestamp = readOptionalDate(row.timestamp);
    if (!timestamp) continue;
    const updatedBy =
      typeof row.updatedBy === "string" && row.updatedBy.trim()
        ? row.updatedBy.trim()
        : "Unknown";
    const note = typeof row.note === "string" && row.note.trim() ? row.note.trim() : undefined;
    mapped.push({ status, timestamp, updatedBy, ...(note ? { note } : {}) });
  }

  return mapped.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
