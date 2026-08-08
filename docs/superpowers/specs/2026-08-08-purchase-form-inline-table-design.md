# New Purchase form: single-page, inline item table

## Problem

The New/Edit Purchase form (`PurchaseForm.tsx`) is a single long scroll, and
adding an item requires opening `PurchaseItemModal` and filling up to 8
fields even for a one-line entry. A [3-step wizard design](2026-08-08-purchase-form-wizard-design.md)
was approved to address this, but the user then supplied a reference
mockup (Fixigo "Application Flow" diagram) showing New Purchase as a
**single page** with an **inline item table** — no wizard steps, no modal.
This spec replaces the wizard design with that direction.

## Goal

Keep New/Edit Purchase as one page (matching the mockup's structure), but
replace the item-entry modal with an always-visible, inline-editable table:
click "+ Add Item", a blank row appears in the table, fill it in directly.
No changes to the API, payload shape, or underlying data model.

## Scope decisions (from user clarification)

- **Layout only.** The mockup's item table shows HSN/Code, per-item
  Discount, and per-item Tax % columns, plus a "Payment Terms" dropdown.
  None of these exist today (discount/GST/transport are whole-bill, not
  per-item). **Do not add them.** Use only today's fields.
- **Keep the initial-payment section.** The mockup's New Purchase card has
  no payment section (payment happens later via the existing Record
  Payment modal). The user chose to keep today's optional "pay now" section
  instead, appended after the items/totals block, since it's a real,
  currently-used shortcut.

## Page structure

One page/slide-over, top to bottom (matches the mockup's section order):

1. **Supplier Information** — Branch selector (shop_admin only, existing
   behavior), Supplier picker with "+ Add supplier" (existing
   `AddSupplierModal`, unchanged), Invoice/bill number (optional),
   Purchase date. Same fields as today, same section grouping as the
   mockup.
2. **Items** — An inline-editable table. Each row has always-editable Name
   (with datalist autocomplete), Qty, and Purchase price inputs, plus a
   per-row "More" toggle that expands Brand, Model, Selling price,
   Warranty, Remarks, and linked Service ID inline (collapsed by default).
   A "+ Add Item" button appends a new blank row directly into the table —
   no popup. Each row has a Remove button.
3. **Totals** — Read-only breakdown: Subtotal, Discount, GST, Transport,
   Grand Total (all already computed by `computeTotals`; today's form only
   showed Grand Total — this adds the same breakdown `PurchaseDetails.tsx`
   already displays elsewhere in the app, no new computation).
4. **Payment details** (kept per the scope decision above) — Payment type
   (cash/UPI/bank/credit), Amount paid (hidden for credit), live balance —
   identical to today's fields and placement logic, just positioned after
   Totals instead of being its own section mixed into a longer scroll.
5. **Cancel / Save Purchase** (or "Update purchase" when editing) — single
   action, no step gating.

## Out of scope

- HSN/Code, per-item discount, per-item tax %, "Payment Terms" dropdown —
  explicitly excluded per the scope decision above.
- Discount / GST / transport charge inputs: still not editable in the UI
  for new purchases (silently default to 0 / carried over unchanged on
  edit) — unchanged from today.
- API routes, `PurchasePayload` shape, `computeTotals`, submit handling in
  `PurchaseFormHost` — unchanged.
- Rebuilding any other screen shown in the reference mockup (dashboard,
  purchases list, supplier list, branches, reports, settings, profile) —
  the mockup was supplied as context for this one form, not a request to
  rebuild the whole app.
- `PurchaseItemModal.tsx` is retired in favor of the inline table; its
  `ItemFormValues` shape is reused for row state.

## Architecture

`PurchaseForm.tsx` keeps its current shape (a single component owning all
form state — supplierId, invoice no, date, item rows, payment fields) and
does **not** gain step state. The item table becomes its own component,
`PurchaseFormItemsTable.tsx`, colocated in `src/modules/purchase/`, so the
now-sizeable item-entry markup isn't inline in `PurchaseForm.tsx`'s JSX.
Everything else (`PurchaseFormHost.tsx`, `AddSupplierModal.tsx`, the
`/purchases/new` full page, the `/purchases?new=1` desktop slide-over) is
unchanged — this is a smaller, more contained change than the wizard would
have been, since only item entry actually changes behavior.

## Validation & error handling

- Save stays disabled until at least one item row exists (unchanged from
  today's `rows.length === 0` check).
- Submission errors (e.g. duplicate invoice 409 confirm-anyway prompt)
  render at the top of the page as they do today — no change.

## Testing

Type-checking and lint are necessary but not sufficient for a UX-facing
change. Verification is a manual click-through of the real app:
- New Purchase, mobile full page (`/purchases/new`): fill supplier/date,
  click "+ Add Item" twice, fill both rows inline, expand "More" on one row
  and set a brand, edit a quantity inline, remove one row, confirm the
  totals breakdown updates live, set a cash payment, save.
- New Purchase, desktop slide-over (`/purchases?new=1`): repeat the same
  flow.
- Add supplier mid-form: click "+ Add supplier", create one in the popup,
  confirm it's selected without losing anything else already entered.
- Edit Purchase: confirm existing purchase data pre-fills correctly.
