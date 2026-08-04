# Reopen Completed Service

**Date:** 2026-08-04  
**Status:** Approved  
**Scope:** Dedicated “Reopen Service” action when a completed job comes back unfixed (same customer / same issue).

## Problem

A service can be marked completed, but the customer may return because the device is not fixed. Staff need a clear way to put that job back into active work, with a visible mark and a recorded reason — without creating a new service or losing payment history.

## Goal

On a **completed** service, staff can reopen it so it:

- Returns to active work (`in_progress`)
- Shows a **Reopened** tag
- Stores a required reason and reopen timestamp
- Keeps payment status unchanged
- Clears completion dates so list/analytics treat it as active again

## Non-goals

- Creating a new linked follow-up service
- Reopening cancelled jobs via this button
- Changing payment to unpaid on reopen
- A full customer CRM / return-visit history module

## Behavior

1. On service details, when status is **Completed**, show a **Reopen Service** button.
2. Click opens a dialog with a required reason field (e.g. “Same issue came back”).
3. On confirm:
   - Set `status` to `in_progress`
   - Set `isReopened: true`
   - Store `reopenReason`, `reopenedAt`
   - Increment `reopenCount` (start at 1 on first reopen)
   - Clear `completedDate` and `actualCompletion` (same as today’s leave-completed behavior)
   - **Do not** change `paymentStatus` / `paidAt`
4. Job shows in active service lists again.
5. If completed again later, completion dates are stamped as today. Reopened badge + last reason remain for history.
6. If completed and reopened again, update reason/`reopenedAt` and increment `reopenCount`.

## Permissions

Same as who can update status today: shop admin, branch admin, or assigned technician.

## Data model

Add optional fields on the `services` Firestore document / `Service` type:

| Field | Type | Purpose |
|---|---|---|
| `isReopened` | `boolean` | Drives Reopened badge |
| `reopenReason` | `string` | Last required reason |
| `reopenedAt` | `Timestamp` / `Date` | Last reopen time |
| `reopenCount` | `number` | How many times reopened |

No separate status value for “reopened”; status stays the normal lifecycle (`in_progress` after reopen). Tag is orthogonal to status.

## UI

- **Details page:** Reopen button next to other primary actions when completed; dialog (reason required, Cancel / Confirm Reopen); **Reopened** badge in header/status area when `isReopened`.
- **Services list:** Show **Reopened** badge/chip when `isReopened` so staff can spot return jobs in the table.
- Prefer existing status chip / badge patterns (`getStatusConfig` / similar) rather than inventing a new visual language.

## Status writes

Prefer writing canonical snake_case `in_progress` (and other statuses where this path already touches them) so reopen aligns with create-service (`pending`) and analytics `normalizeStatus()`. Do not introduce a new `reopened` status enum value.

## Error handling

- Block confirm if reason is empty/whitespace; show inline validation.
- On Firestore write failure, keep dialog open, show error toast, do not change local status optimistically until success (or roll back if optimistic).
- Button hidden/disabled when status is not completed.

## Testing (manual)

- Complete a service → Reopen appears → reason required → confirms to In Progress + badge.
- Payment stays Paid if it was Paid.
- Completion dates cleared; job appears in active filters.
- Complete again → dates set; badge/reason still visible.
- Reopen a second time → count increments, reason updates.
- Cancelled job has no Reopen button.
