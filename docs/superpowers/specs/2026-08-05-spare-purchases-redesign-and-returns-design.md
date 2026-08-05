# Spare Purchases Module (Slice 2: Simplified Flow + Supplier Returns)

**Date:** 2026-08-05
**Status:** Approved
**Scope:** Redesign the Add/Edit Purchase form and Purchase Details screen for less cognitive load, and add a supplier-return flow (partial-quantity, item-level) with refund tracking. Builds on the existing module described in `2026-08-05-spare-purchases-design.md`.

## Problem

The Add Purchase form and Purchase Details screen both work, but the person entering purchases finds the whole flow confusing: every field is visible at once regardless of relevance, the payment step is a dropdown plus a number field with no clear mental model, and the details page buries its actions below three permanently-expanded sections. Separately, there is no way to record that some purchased items were sent back to a supplier — today the only undo is `Cancel Purchase`, which is blocked the moment any payment exists, so a defective item discovered after paying has nowhere to go.

## Goal

Simplify the two screens without changing what data they capture, and add a `Return Items` flow that works at any payment state: pick a purchase, pick items and quantities up to what was bought, record why, and let the money side (balance owed or refund due) fall out automatically.

## Non-goals

- Stock/inventory movement — still deferred per the slice-1 non-goals; a return does not touch a stock ledger because none exists.
- Returning against a **cancelled** purchase, or editing a purchase that already has a return — both stay blocked, consistent with the existing payments guard.
- A wizard/multi-step form — rejected explicitly, see Decisions.
- Approval workflow for returns (e.g. a second admin sign-off) — a single `shop_admin`/`branch_admin` action, same trust level as recording a payment today.
- Reworking the summary cards, purchase list, or supplier screens — only the Add/Edit Purchase form and Purchase Details screen are in scope for the UI redesign.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Form shape | Single page, restructured — not a wizard | Purchase entry is a repetitive daily task; a multi-step wizard adds clicks for no benefit when the actual complaint is visual clutter, not step count |
| Payment input | Three tap cards: Paid in full / Partially paid / Pay later (credit) | Replaces a payment-type dropdown + amount field with the mental model the admin already has ("did I pay for this or not") |
| Totals visibility | Sticky bottom bar showing grand total + balance | Removes the need to scroll up to check totals while filling in later fields — the direct fix for "payment step is unclear" |
| Details page layout | Collapsible sections (items open, payments/returns collapsed unless non-empty); actions in a sticky bottom bar | Matches the sticky-bar pattern used on the form; actions no longer buried below three long sections |
| Return granularity | Per-item, partial quantity | Matches real defective/excess-stock returns; whole-line-only would force returning everything even when only some units are bad |
| Return storage | Embedded `returns: PurchaseReturn[]` array on the purchase, same shape as `payments` | Keeps the existing embedded-array pattern (bounded arrays, one document read renders the page) rather than introducing a new storage shape for one feature |
| Money on return | Return value first cancels unpaid balance; any excess becomes `refundDue` | Matches how a real supplier ledger works — a return either reduces what's owed or creates a credit if the purchase was already settled |
| Cancel vs Return | Both actions coexist | `Cancel Purchase` remains the full undo for a purchase with zero payments and zero returns (unchanged behavior); `Return Items` is the new path for anything with money or partial history already attached |

### Rejected alternatives

- **Multi-step wizard** (Supplier → Items → Payment → Review) — considered and rejected; see Decisions.
- **Two-column checkout layout** (form + live cart preview) — reads well on desktop but collapses awkwardly on the mobile-first layout the rest of the module already uses.
- **Returns as a delta on `grandTotal`** — rejected because it would make the original invoice total mutable; `grandTotal` stays the immutable as-billed figure, and `returnedAmount` is tracked alongside it so the original bill is always reconstructable.
- **Treating a return purely as a negative purchase against the supplier's outstanding**, with no per-purchase refund tracking — rejected per your answer; a fully-paid purchase with a later return needs its own "supplier owes you ₹X" state, not just a shop-wide number.

## Data model changes

Extends the `Purchase` and `PurchaseItem` types from slice 1; no new top-level collections.

```ts
interface PurchaseItem {
  // ...existing fields unchanged...
  /** Sum of quantities already returned against this line. Never exceeds `quantity`. */
  returnedQuantity: number;
}

interface PurchaseReturnLine {
  itemId: string;
  name: string;
  quantity: number;
  /** Copied from the item's `purchasePrice` at return time, so a later price edit can't retroactively change a past return's value. */
  unitPrice: number;
  lineTotal: number;
}

interface PurchaseReturn {
  id: string;
  items: PurchaseReturnLine[];
  totalAmount: number;
  reason: string;
  returnedBy: { userId: string; name: string };
  returnedAt: Date;
  createdAt: Date;
}

interface PurchaseRefund {
  id: string;
  amount: number;
  method: "cash" | "upi" | "bank";
  receivedAt: Date;
  reference?: string;
  notes?: string;
  recordedBy: string;
  createdAt: Date;
}

interface Purchase {
  // ...existing fields unchanged...
  returns: PurchaseReturn[];
  /** Sum of every return's `totalAmount`. */
  returnedAmount: number;
  refunds: PurchaseRefund[];
  /** Sum of every refund's `amount`. */
  refundReceived: number;
  /** max(paidAmount - refundReceived - (grandTotal - returnedAmount), 0) — what the supplier still owes back. */
  refundDue: number;
}
```

### Derived figures, recomputed on every return or refund

1. `effectiveTotal = grandTotal - returnedAmount`
2. `netPaid = paidAmount - refundReceived`
3. `balance = max(effectiveTotal - netPaid, 0)` — unchanged meaning: what the shop still owes the supplier
4. `refundDue = max(netPaid - effectiveTotal, 0)` — new: what the supplier owes the shop
5. `paymentStatus` keeps its existing three values (`unpaid` / `partial` / `paid`), computed from `balance` and `netPaid` against `effectiveTotal` exactly as `purchasePayments.ts` computes it today from `paidAmount` against `grandTotal`. `refundDue` is surfaced separately in the UI, not folded into this enum.

Both existing fields keep their existing meaning — `balance` is still "what's owed," it's just computed from the post-return effective total rather than the original `grandTotal`.

## Screens

### Add/Edit Purchase (`/purchases/new`)

- **Supplier & invoice**: unchanged fields, but once a supplier is picked the block collapses to a single chip row (`Acme Traders · change`) instead of staying expanded, reclaiming vertical space for the items section.
- **Items**: unchanged — table + `PurchaseItemModal`, already extracted in the current in-progress refactor. No behavior change here; this section wasn't the confusing part once modal entry was added.
- **Payment**: replaces the `payment type` select + `amount paid` number input with three cards:
  - **Paid in full** — no amount field, `amountPaid` is set to the current grand total automatically, method (cash/UPI/bank) chosen inline.
  - **Partially paid** — reveals an amount field (capped at grand total) and method.
  - **Pay later (credit)** — reveals only the due-date field, exactly like today's `credit` option.
- **Sticky bottom bar**: grand total and balance-after-payment, visible while scrolling and while the on-screen keyboard is open on mobile, so the figures that used to require a scroll-up are always in view.
- Edit mode is unchanged: still 409s server-side once `payments` or `returns` is non-empty (see Flows), and the UI still doesn't render Edit in that case.

### Purchase Details (`/purchases/details?id=`)

- Header (ref, status, key totals) unchanged.
- **Items** section: open by default (this is what the admin usually came to check).
- **Payments** and **Returns** sections: collapsed by default, auto-expanded if non-empty, each with a count badge on the collapsed header (e.g. "Payments (2)").
- **Refund banner**: when `refundDue > 0`, a banner above the sections reads "Supplier owes you ₹X" with a `Record Refund` action.
- **Sticky bottom action bar**: `Record Payment` (when `balance > 0`), `Return Items` (when any item has `quantity > returnedQuantity` and `status === "active"`), `Record Refund` (when `refundDue > 0`), `Edit Purchase` / `Cancel Purchase` (only when `payments` and `returns` are both empty, same absent-not-disabled rule as today). Previously these lived at the bottom of a long scroll; now they're always reachable.

### Return Items (new modal, opened from Purchase Details)

Lists only items with `quantity - returnedQuantity > 0`. Each row: item name, a quantity stepper capped at the remaining returnable amount, and its resulting line value. A required `reason` field. A live total of the return being built. On submit, calls `POST /api/purchases/[id]/returns`; on success the details page re-fetches and shows the new return in the Returns section plus the updated balance/refund banner.

### Record Refund (new modal, mirrors `RecordPaymentModal`)

Amount field capped at `refundDue`, method, optional reference/notes. Calls `POST /api/purchases/[id]/refunds`.

## API and repo changes

### `POST /api/purchases/[id]/returns`

Body: `{ items: [{ itemId: string; quantity: number }], reason: string }`.

`purchaseRepo.returnPurchaseItems`, transactional like `recordPurchasePayment`:

1. Reload the purchase inside the transaction; reject if `status === "cancelled"` (409).
2. For each requested line, find the matching item by `itemId`; reject (400) if `quantity <= 0` or `quantity > item.quantity - item.returnedQuantity`.
3. Reject (400) if `items` is empty or `reason` is blank.
4. Compute each line's `unitPrice` from the item's current `purchasePrice`, sum to `totalAmount`.
5. Update each returned item's `returnedQuantity`; append the `PurchaseReturn` record; recompute `returnedAmount`, `balance`, `refundDue`, `paymentStatus` per the formulas above.
6. Update the supplier in the same transaction: `totalPurchased -= totalAmount`; `outstanding += (newBalance - newRefundDue) - (oldBalance - oldRefundDue)` — the net delta, so a supplier already in credit from another purchase isn't double-counted.

### `POST /api/purchases/[id]/refunds`

Body: `{ amount: number; method: "cash" | "upi" | "bank"; receivedAt: string; reference?: string; notes?: string }`.

`purchaseRepo.recordPurchaseRefund`, transactional, mirroring `recordPurchasePayment`:

1. Reload the purchase; reject (409) if cancelled; reject (400) if `amount <= 0` or `amount > refundDue`.
2. Append the `PurchaseRefund`; recompute `refundReceived`, `balance`, `refundDue`.
3. Update supplier: same net-delta update as above.

### Existing endpoints, guard changes

- `updatePurchase`: add `returns.length > 0` to the existing "cannot edit" 409 condition (currently only checks `payments.length > 0`).
- `cancelPurchase`: add the same `returns.length > 0` check to its existing 409 condition.

### New validation (`purchaseValidation.ts`)

- `parseReturnPurchaseInput`: `items` non-empty array, each `itemId` non-blank string and `quantity` a positive integer; `reason` non-blank, trimmed.
- `parseRecordRefundInput`: same shape as the existing `parseRecordPaymentInput`, reused rather than duplicated where the fields match (`amount`, `method`, `receivedAt`/`paidAt`, `reference`, `notes`).

## Validation summary

- A return's per-item quantity can never exceed `quantity - returnedQuantity` for that item — enforced server-side inside the transaction, not just client-side, since the client's view of `returnedQuantity` can be stale.
- A refund's amount can never exceed the current `refundDue` — same reload-inside-transaction reasoning as the existing payment-vs-balance check.
- Reason is required on a return, consistent with the existing required reason on cancel.

## Error handling

Reuses the existing `ApiError` conventions from slice 1: 400 for the validation cases above, 403 for tenancy, 404 for a missing purchase, 409 for cancelled/locked states. No new status conventions introduced.

## Testing

TDD per the house style, extending the existing suites rather than adding parallel ones where possible.

- `purchasePayments.test.ts` (or a new `purchaseReturns.test.ts` alongside it): the five derived-figure formulas — full return of an unpaid line, return exceeding the unpaid balance (produces `refundDue`), return after a full refund already recorded, return leaving `paymentStatus` correctly recomputed.
- `purchaseValidation.test.ts`: one test per new rule (`parseReturnPurchaseInput`, `parseRecordRefundInput`), asserting the specific error.
- `purchaseRepo.test.ts`: return updates `returnedQuantity` and appends the record in a single transaction; a return exceeding remaining quantity rejects and writes nothing; a return on a cancelled purchase 409s; a refund exceeding `refundDue` rejects; edit and cancel both 409 once a return exists; supplier `totalPurchased`/`outstanding` move by the exact net delta across a return-then-refund sequence.
- Existing `purchaseRepo.test.ts` cases for create/pay/edit/cancel are unaffected and must still pass unchanged — this slice only adds guard conditions, it doesn't change existing behavior.

**Known limitation**, inherited from slice 1: no component-test setup exists, so `PurchaseForm`'s new payment cards and `PurchaseDetails`' new sections/sticky bar are verified by running the app, not by an automated UI test. All arithmetic and validation stay in pure/repo modules that are unit-tested; the components only wire them to inputs.

## Manual verification

1. Raise a purchase, pay it in full using the new "Paid in full" card; confirm `paymentStatus` is `paid` and the sticky bar reflects zero balance before submit.
2. From its details page, open Return Items, return part of one line's quantity with a reason; confirm the item row now shows reduced returnable quantity, a Returns section appears, and — since the purchase was fully paid — a "Supplier owes you" banner appears with the correct amount.
3. Record a refund for less than the full `refundDue`; confirm the banner amount decreases and doesn't disappear until the refund is recorded in full.
4. Raise a second, unpaid purchase; return one item; confirm `balance` drops by the return value and no refund banner appears (return absorbed by the unpaid balance).
5. Confirm `Edit Purchase` and `Cancel Purchase` are both absent once any return exists on a purchase, even if it has no payments.
6. Confirm a return request for more than an item's remaining returnable quantity is rejected with a 400 and nothing is written.
7. Confirm the supplier's `outstanding` figure after steps 2–4 matches the sum of every one of its purchases' `balance - refundDue`.
