# Persist Status History

**Date:** 2026-08-04  
**Status:** Approved  
**Scope:** Persist service status-change history on the Firestore service document and show it on the service details Status History panel.

## Problem

Service details already has a **Status History** UI, but entries only live in React page state. A status change (or reopen) adds a row for the current session; refreshing the page clears the list. Staff cannot see how a job moved through statuses over time.

## Goal

When a service’s **status** changes, append a history entry, store it on the service document, and reload it whenever details opens — so Status History means “status-change timeline,” not session-only UI state.

## Non-goals

- Recording payment Paid / Unpaid toggles in this history
- Recording reopen reason text on history rows (reopen fields remain separate)
- Backfilling or migrating history for existing services
- A Cloud Function / server-side status listener
- A new dedicated history screen or collection

## Behavior

1. Status History remains the existing toggleable panel on service details.
2. Each entry shows: status badge, who updated (`updatedBy`), and when (`timestamp`).
3. Entries are newest-first.
4. History is written only when status changes:
   - Status dropdown → new status
   - Reopen Service → `in_progress`
5. Payment changes, field edits, and other non-status updates do **not** append entries.
6. Services with no `statusHistory` (all existing docs until their next status change) show “No status history available.”
7. No one-time migration or seed-from-current-status on load.

## Data model

On `services/{id}`:

```ts
statusHistory?: StatusHistoryEntry[];

interface StatusHistoryEntry {
  status: string;      // value written for that change (same as stored service status for that write)
  timestamp: Date;     // when the change was saved
  updatedBy: string;   // actor display name (fallback "Unknown")
}
```

- Optional on `Service` in `src/types/index.ts`.
- Missing / non-array → treat as `[]` in the mapper.
- Invalid entries (missing status or unreadable timestamp) are dropped when mapping.

## Architecture

Keep the existing client `updateDoc` status writes on the details page.

1. **`mapServiceDoc`** — map `statusHistory` into `Service.statusHistory` (dates via `readOptionalDate`).
2. **Pure helper** (e.g. `appendStatusHistory(existing, entry)`) — prepends a validated entry; unit-tested.
3. **Details page** — on fetch, set local `statusHistory` from mapped service (newest-first). On status update and reopen, compute next array with the helper, include `statusHistory` in the same `updateDoc` as the status fields, then update local state.
4. **`ServiceDetailsView`** — no behavior change; continue rendering the `statusHistory` prop.

Rewrite the full array in each write (previous entries + new head). Concurrent double-updates on the same job are rare for this product; avoid `arrayUnion` complexity for v1.

## Error handling

- If the status/`updateDoc` write fails, do not append local history (same revert pattern as today’s failed status update).
- Mapper never throws on bad history shapes; skip bad rows.

## Testing

- Unit tests for `appendStatusHistory` (prepend, empty existing, reject empty status if validated).
- Mapper tests: missing field → `[]`; Timestamp entries map; invalid timestamp entries omitted.

## Success criteria

- Change status on details → refresh → Status History still shows that change.
- Reopen a completed service → history gains an `in_progress` entry that survives refresh.
- Toggle payment → status history unchanged.
- Existing service with never-changed status after this ships → empty history until first post-ship status update.
