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
}): StatusHistoryEntry {
  const status = entry.status.trim();
  if (!status) {
    throw new Error("status is required");
  }
  return {
    status,
    timestamp: entry.timestamp,
    updatedBy: entry.updatedBy.trim() || "Unknown",
  };
}

export function appendStatusHistory(
  existing: StatusHistoryEntry[] | undefined,
  entry: { status: string; timestamp: Date; updatedBy: string }
): StatusHistoryEntry[] {
  return [buildStatusHistoryEntry(entry), ...(existing ?? [])];
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
    mapped.push({ status, timestamp, updatedBy });
  }

  return mapped.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
