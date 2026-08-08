# New Purchase form: step wizard revamp

> **Superseded** by [2026-08-08-purchase-form-inline-table-design.md](2026-08-08-purchase-form-inline-table-design.md).
> After this spec was approved, the user supplied a reference mockup showing
> New Purchase as a single page with an inline item table, not a wizard.
> Nothing in this spec was implemented in code — only this doc and its
> plan existed. Kept for history.

## Problem

The New/Edit Purchase form (`PurchaseForm.tsx`) is a single long scroll: supplier
details, an items table, and payment fields all visible at once. Adding an item
requires opening `PurchaseItemModal` and filling up to 8 fields even for a
one-line entry. Feedback: the whole flow feels like too much before you can
save a purchase, and item entry is a chore.

## Goal

Restructure purchase creation/editing into a 3-step wizard with faster,
inline item entry. No changes to the API, payload shape, or underlying data
model — this is a UI/flow restructure only.

## Steps

1. **Supplier & Details** — Branch selector (shop_admin only), Supplier
   picker with "+ Add supplier" (existing `AddSupplierModal`, unchanged),
   Invoice number (optional), Purchase date. "Next" disabled until supplier
   and date are set.
2. **Items** — Inline quick-add row (Name, Qty, Purchase price + Add
   button/Enter-to-add) appends directly to the list below — no modal.
   Optional fields (brand, model, selling price, warranty, remarks, linked
   service) sit behind a per-row "+ More details" toggle, collapsed by
   default. Added rows are edited inline (click a field) and removable.
   Item name/brand/model datalist autocomplete from `suggestions` is
   preserved. "Next" disabled until at least one item exists.
3. **Payment & Review** — Read-only recap: supplier name, item list
   (compact), grand total. Then the existing payment controls: payment type
   (cash/UPI/bank/credit), amount paid (hidden for credit), live balance.
   "Save purchase" / "Update purchase" lives here only.

A step indicator ("1 Supplier · 2 Items · 3 Payment") sits at the top. Back
is always available and never discards entered data. Forward navigation is
gated by the validation above.

## Out of scope

- Discount / GST / transport charge: not editable in the current UI for new
  purchases (silently default to 0 / carried over unchanged on edit) — no
  change here.
- API routes, `PurchasePayload` shape, `computeTotals`, submit handling in
  `PurchaseFormHost` — unchanged.
- `PurchaseItemModal.tsx` is retired in favor of inline item rows; its
  `ItemFormValues` shape is reused for row state.

## Architecture

`PurchaseForm` becomes a thin wizard shell:
- Owns all existing state (supplierId, invoice no, date, item rows, payment
  fields) plus a `step: 1 | 2 | 3` index.
- Renders one of three step components, each receiving only the slice of
  state/handlers it needs (`SupplierDetailsStep`, `PurchaseItemsStep`,
  `PurchasePaymentStep`), colocated in the `purchase/` module folder.
- The footer (Back / Next / Save) is rendered by the wizard shell itself,
  and both consumers (`/purchases/new` full page, `/purchases` desktop
  slide-over via `PurchaseFormHost`) get it automatically — no changes
  needed in either page beyond what `PurchaseFormHost` already forwards
  (`hideSubmit`/`formId` continue to work: Save remains a `type="submit"`
  button on the step-3 view bound to the shared `formId`).
- `onCanSubmitChange` now reflects "can Save be pressed" only while on step
  3 with items present, matching current disable-until-items-exist behavior
  but scoped to the review step.

## Validation & error handling

- Step 1 → 2: require `supplierId` and `purchaseDate`.
- Step 2 → 3: require `rows.length > 0`.
- Submission errors (e.g. duplicate invoice 409 confirm-anyway prompt)
  continue to surface on step 3, where Save lives — unchanged from today.
- Back never clears state; only Save submits.

## Testing

Type-checking and lint are necessary but not sufficient for a UX-facing
change like this. Verification is a manual click-through of the real app:
- New Purchase, mobile full page (`/purchases/new`): step through all 3
  steps, back-and-forth, add an item inline with and without "more
  details", add a supplier mid-wizard, save.
- New Purchase, desktop slide-over (`/purchases?new=1`): same, confirming
  the slide-over footer swaps Back/Next/Save correctly per step.
- Edit Purchase: confirm existing purchase data pre-fills all 3 steps
  correctly, and edit-locked-after-payment behavior (handled at the page
  level, outside this component) still applies.
- Validation gates: confirm Next is disabled/enabled correctly at each
  boundary.
