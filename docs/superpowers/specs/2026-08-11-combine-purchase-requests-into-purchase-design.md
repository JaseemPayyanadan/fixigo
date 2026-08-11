# Combine Purchase Requests into a Purchase

**Date:** 2026-08-11
**Status:** Approved
**Scope:** Let a branch/shop admin select multiple *approved* purchase requests (raised by technicians from repair details pages, possibly across different repairs and technicians) and combine them into a single itemized `Purchase`, instead of manually re-typing what was already requested.

## Problem

[[2026-08-10-purchase-requests-design]] built the request side: a technician raises a spare-part request from a repair, an admin approves or rejects it. Deliberately out of scope there: "Auto-generating a `Purchase` from an approved request... an admin has to fill all of that in regardless." That's still true, but today the admin fills it in via a *lump-sum* form (`PurchaseForm.tsx`) that asks for one supplier + one total amount — it has no item list at all, so the approved request's actual items (names, quantities, which repair each is for) don't carry over anywhere. The admin has to remember or re-check what was approved and manually reconcile it against a single number. There's also no way to buy for several approved requests (from different technicians/repairs) in one supplier trip and have that show up as one purchase.

## Goal

From the Purchase Requests tab, an admin can check off one or more `approved` requests, click "Combine into Purchase", and land on a purchase-creation screen that's pre-filled with every selected request's items (name, brand, model, quantity, and which repair/customer each line is for) as read-only rows. The admin picks a supplier and types a price per row — nothing else to re-enter. Submitting creates one itemized `Purchase` and marks all the source requests `purchased`, linked back to it.

## Non-goals

- Editing a combined purchase's items after creation through the existing lump-sum edit form (see Decisions — its "Edit" action is hidden for these purchases instead)
- Partial-item selection (checking individual items within a request) — selection is per-request, matching how requests are already displayed and approved as a unit
- Changing anything about how requests are raised, approved, or rejected — that flow is untouched
- A spares catalog, stock tracking, or notifications — same non-goals as the parent spec, still out of scope

## Context: current state of the app

- **`PurchaseTabs.tsx`** already routes to `/purchases/requests` (list of `PurchaseRequest`s) and `/purchases` (list of `Purchase`s); both are `shop_admin`/`branch_admin`-only tabs (technicians only ever see Requests).
- **`purchases/requests/page.tsx`** renders `PurchaseRequestList.tsx` — a `@tanstack/react-table` list, no selection support today.
- **`PurchaseForm.tsx`** is deliberately a *lump-sum* form: one supplier, one "Purchase amount" field. On submit it hardcodes `items: [{ name: "Purchase amount", quantity: 1, purchasePrice: parsedAmount }]` — there is no itemized entry UI anywhere in the app today, even though the data layer supports it.
- **`purchaseValidation.ts`**'s `PurchaseItemInput` already accepts optional `serviceId`/`serviceRef` per item, and `purchasePrice` is required per item — the validation layer already supports multi-item, per-item-priced, service-linked purchases. Only the current form's UX is lump-sum, not the data model.
- **`purchaseRepo.ts`'s `createPurchase`** takes `branchId` explicitly (not derived from supplier) and cross-checks it against the chosen supplier's own `branchId`, rejecting a mismatch. Its transaction only touches `SUPPLIERS`, `PURCHASE_COUNTERS`, `PURCHASES` — never `PURCHASE_REQUESTS`.
- **`purchaseRequestRepo.ts`** has `approvePurchaseRequest`/`rejectPurchaseRequest`/`cancelPurchaseRequest`, each a `runTransaction` that only touches `PURCHASE_REQUESTS`. No existing function writes across both collections.
- Firestore transactions are document-level, not collection-scoped — reading several `PurchaseRequest` docs and writing a new `Purchase` doc plus updates to those `PurchaseRequest` docs in one `runTransaction` is a straightforward new function, following the same pattern both repos already use.
- `PurchaseItem` (`src/types/purchase.ts`) has no `purchaseRequestId` field; nothing links a purchase line back to the request it came from today.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Selectable statuses | Only `approved` requests get a checkbox; other statuses show one disabled | An admin already decided a `pending` request is legitimate at approval time — combining should build on that decision, not bypass it |
| Branch scoping | Checking a request from one branch disables checkboxes for every other branch until selection clears | A `Purchase` has exactly one `branchId`/`supplierId`; this keeps every valid selection combinable without an extra "which branch?" step |
| Post-combine status | New `purchased` status, with `purchaseId`/`purchaseRef` backlink | Removes the request from the selectable pool and gives its detail page something to link to, instead of silently staying `approved` forever |
| Item granularity | Whole requests are selected, not individual items within a request | Matches how requests are already displayed/approved as a unit; avoids new partial-item UI |
| Item merging | Never merge same-named items across requests — one purchase-item row per source request-item | Preserves the repair/customer link per row; a merged row couldn't say which repair(s) it was for |
| Pricing entry | One editable "Purchase price (₹)" per row; everything else on the row read-only from the request | Matches what's actually being asked for ("user has to enter the purchase amount") — no re-typing name/qty/brand |
| Form component | New `CombinedPurchaseForm.tsx`, not a rewrite of `PurchaseForm.tsx` | The two forms' data shapes are fundamentally different (lump-sum vs. itemized); forcing one component to do both would tangle unrelated logic |
| Editing after creation | Hide the "Edit" action for any purchase with more than one item | `PurchaseForm.tsx` (the only edit UI) collapses `items` back to a single generic line on save — editing through it would silently destroy a combined purchase's itemization. Building proper multi-item editing is a separate, materially bigger piece of work, deferred until there's a real need |
| Traceability | `PurchaseItem` gains optional `purchaseRequestId` | Nearly free given the source data is already on hand; lets a purchase line be traced back to the request it came from for audits/debugging |
| Server-side item trust | Item name/brand/model/quantity are re-read from the stored `PurchaseRequest` inside the transaction, never trusted from the client; only `purchasePrice` per item comes from the client | Consistent with the rest of the codebase's pattern of denormalizing from the authoritative source at write time, and closes an obvious tamper vector |

### Rejected alternatives

- **Reuse `PurchaseForm.tsx` with a conditional itemized mode.** Considered, but the lump-sum path and the itemized path share almost no state (one amount field vs. a per-row price table; totals computed differently) — a shared component would need branching through most of its body. A sibling component is smaller and easier to reason about independently.
- **Auto-select branch/supplier from the request instead of requiring a pick.** Requests carry a `branchId` but never a supplier (that's deliberately not modeled on a request — see parent spec). The branch narrows the supplier dropdown; the supplier itself still has to be a real choice.
- **Allow editing combined purchases with a new itemized edit form.** Real need, but a bigger scope than this slice — deferred (see Decisions row above).

## Data model

```ts
// src/types/purchaseRequest.ts
export type PurchaseRequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "purchased";

export interface PurchaseRequest {
  // ...existing fields unchanged...
  /** Set when status is "purchased". */
  purchaseId?: string;
  purchaseRef?: string;
}
```

```ts
// src/types/purchase.ts
export interface PurchaseItem {
  // ...existing fields unchanged...
  /** Set when this line came from a combined purchase-request. */
  purchaseRequestId?: string;
}
```

No new Firestore collections — writes land in the existing `purchases`/`purchaseRequests` collections and their existing counters.

## API

- `POST /api/purchases/from-requests` — new route. Body: `{ supplierId, purchaseRequestIds: string[], prices: Record<itemId, number>, supplierInvoiceNo?, purchaseDate, initialPayment? }`. `branch_admin`/`shop_admin` only (same guard as `assertCanWritePurchase`).
  - Loads every named `PurchaseRequest`, in the same transaction as the write:
    - 404 if any id doesn't resolve within the caller's `shopId`.
    - 409 if any request's `status !== "approved"`, or if the requests don't all share one `branchId`.
    - 400 if any request-item is missing a price in `prices`.
  - Builds `PurchaseItem[]` from each request's own `items` (name/brand/model/quantity/serviceId/serviceRef — authoritative from the stored request) plus the matching client-supplied `purchasePrice`, tagged with `purchaseRequestId`.
  - Computes totals via the existing `computeTotals` (already handles arbitrary multi-item arrays — no changes there), no discount/GST/transport inputs on this screen (default to zero, same as today's lump-sum flow leaves them for manual purchases without those fields shown).
  - Advances the existing `PUR-2026-####` counter and writes the `Purchase`.
  - Updates every selected `PurchaseRequest`: `status: "purchased"`, `purchaseId`, `purchaseRef`.
  - Returns the created `Purchase`, same shape as `POST /api/purchases`.

`GET /api/purchases`, `GET/PATCH /api/purchase-requests/[id]` are unchanged; the `PurchaseRequest` mapper (`mapPurchaseRequest`) picks up the two new optional fields the same way it already handles `decidedBy`/`decidedAt`.

## UI

- **`PurchaseRequestList.tsx`**: new optional `selection` prop (selected ids, toggle handler, disabled-branch id) — adds a checkbox column when active, disabled for non-`approved` rows and for rows outside the locked branch. Mobile card view gets the same checkbox affordance.
- **`purchases/requests/page.tsx`**: "Create Purchase" button (hidden for `technician`, matching the tab visibility rule already in `purchaseTabsForRole`) toggles selection mode. A sticky bottom bar shows "N selected" + "Combine into Purchase", enabled once ≥1 is checked; navigates to the purchase-creation surface carrying the selected ids (query param, e.g. `/purchases?new=1&fromRequests=id1,id2`; mobile bounces to `/purchases/new?fromRequests=...` same as the existing slide-over/full-page split).
- **New `CombinedPurchaseForm.tsx`** (`src/modules/purchase/`), rendered by `PurchaseFormHost.tsx` instead of `PurchaseForm.tsx` when `fromRequests` ids are present:
  - Fetches the named requests, locks to their shared `branchId`, filters the supplier dropdown to that branch.
  - Read-only item table: one row per source item — name, brand/model, quantity, and a link to its repair (reusing `formatRepairLabel`) — plus an editable "Purchase price (₹)" input per row.
  - Grand total computed live from the row prices via `computeTotals`.
  - Same payment section as `PurchaseForm.tsx` today (payment type, amount paid), reused via a small shared sub-component to avoid duplicating that block.
  - Submits to `POST /api/purchases/from-requests`.
- **`PurchaseList.tsx`** / purchase details: "Edit" action hidden when `purchase.items.length > 1` (i.e., any combined purchase). Purchase details page shows each item's linked repair (already possible via `serviceId`/`serviceRef` on the item, now also populated for these purchases) — no new UI needed there beyond what per-item service links already render, if anything.
- **`purchases/requests/details/page.tsx`**: when status is `purchased`, shows a link to the resulting purchase (`purchaseRef` → `/purchases/details?id=purchaseId`), same pattern as the existing repair link.

## Testing

- New repo function's unit tests (alongside `purchaseRequestRepo.test.ts` / `purchaseRepo.test.ts` conventions): rejects non-`approved` requests, rejects mixed-branch selections, rejects a missing price for any item, correctly re-reads item name/qty from the stored request rather than trusting the client, advances the purchase ref counter once per call, marks all source requests `purchased` with the right backlink, rolls back cleanly (nothing written) if any check fails mid-transaction.
- API route tests for `POST /api/purchases/from-requests`, mirroring the existing `purchases` route test shape (auth guard, shop/branch scoping, 404/409/400 cases above).
- Component test / manual check for `PurchaseRequestList`'s new selection mode: branch-lock disabling, non-approved rows disabled, mobile card checkbox parity.
