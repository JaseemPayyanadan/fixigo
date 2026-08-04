# Complete Status → Payment Modal

**Date:** 2026-08-04  
**Status:** Approved  
**Scope:** Service details page only — move Update Status to the top-right of the actions bar, and when status becomes Completed with unpaid outstanding, show a payment collection modal.

## Problem

On service details, Update Status sits on the left of the actions bar while payment actions sit on the right. Completing a job currently shows only an inline amber banner asking whether the customer paid, which is easy to miss at handover.

## Goal

1. Keep **Update Status** (label + dropdown) on the **top-right** of the actions bar alongside Reopen / Mark as Paid when present.
2. When staff set status to **Completed** and payment is not already paid, open a **modal** to update payment (Mark as Paid or Keep Unpaid).
3. Preserve existing status write + payment helper behavior; do not invent new payment statuses.

## Non-goals

- Services list page changes
- Payment modal for Ready for Pickup (stays button-only)
- Deferring the Completed status write until payment is chosen
- Changing reopen, analytics, or payment Firestore schema beyond today’s `paymentStatus` / `paidAt`

## Behavior

### Layout (actions bar)

- Card under the summary hero remains.
- **Right cluster:** Update Status label + `<select>`, then Reopen (when eligible), then Mark as Paid / Unpaid.
- Success / “Updating…” feedback stays near the status control.
- Left side of the bar has no status control.

### Complete → payment modal

1. Staff chooses **Completed** in the status dropdown.
2. Existing status update runs (completed dates stamped; if `paymentStatus` was absent, set to `pending` as today).
3. If payment is **not** already paid (`isPaid` is false / `paymentStatus !== "paid"`), open **Collect Payment** dialog.
4. If already paid, do **not** open the modal.
5. Dialog shows outstanding amount (`₹…`) and short handover copy.
6. Actions:
   - **Mark as Paid** → existing `setServicePayment(serviceId, true)`; close dialog on success.
   - **Keep Unpaid** → close dialog; status remains Completed; payment remains pending/unpaid.
7. Remove the amber inline `promptForPayment` banner for this Complete path (modal replaces it). Do not show that banner for Ready for Pickup either after this change (payment remains available via Mark as Paid).
8. Closing via backdrop / X is treated like Keep Unpaid (status already saved).

### Permissions

Unchanged: whoever can update status / toggle payment today can use this flow.

## UI

- New reusable dialog under `src/components/service/` (e.g. `CollectPaymentDialog.tsx`), styled like `ReopenServiceDialog` (overlay, `role="dialog"`, title, primary/secondary buttons).
- Wire from `ServiceDetailsView` props + details `page.tsx` open state (same pattern as reopen).
- Keep existing Mark as Paid / Unpaid button for non-Complete updates.

## Error handling

- If status write fails: revert status locally; do not open payment modal.
- If Mark as Paid fails: keep dialog open, surface error (inline or existing page error), leave status Completed.
- Disable dialog actions while payment write is in flight.

## Testing (manual)

- Non-completed → Completed, unpaid → modal opens; Mark as Paid → Paid badge; modal closes.
- Non-completed → Completed, unpaid → Keep Unpaid / dismiss → Completed + Unpaid.
- Already paid → Completed → no modal.
- Ready for Pickup → no payment modal.
- Update Status control remains on the right of the actions bar on desktop and usable on mobile.
