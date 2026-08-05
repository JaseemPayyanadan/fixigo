# Spare Purchases Module (Slice 1: Suppliers + Purchases)

**Date:** 2026-08-05
**Status:** Approved
**Scope:** A standalone Spare Purchases module — supplier profiles, purchase invoices with line items, supplier payments, and outstanding balances. Stock/inventory movement and the reports suite are explicitly deferred to later slices.

## Problem

The app has no way to record what the shop buys. The only spares data anywhere is `Service.partsUsed` (`src/types/index.ts:181`) — a free-text `{name, quantity, cost}` array that `ServiceDetailsView.tsx:520` merely displays. Nothing links a part to a supplier, nothing records what was paid for it, and nothing tracks what the shop still owes. Purchasing decisions, supplier dues and part costs are invisible to the business.

Putting purchase entry inside the Service Details screen would tie a supplier-and-money workflow to a single job, clutter an already dense screen, and make shop-wide questions ("what do we owe ABC Mobiles?") unanswerable.

## Goal

A separate, self-contained purchasing module where an admin can register suppliers, raise a purchase invoice with line items and totals, record full or partial payments against it, and see accurate per-supplier outstanding balances — without depending on an inventory module that does not yet exist.

## Non-goals

These are **not** in this slice. Each is a later, separately-specced piece of work.

- Stock levels, stock ledger, or "stock updated automatically" on purchase
- A spare-items catalogue / master data collection
- Low Stock Alerts (requires stock levels)
- The seven reports (Purchase, Supplier, Outstanding, Item Purchase, Profit Margin, Monthly Trend, Stock Valuation)
- Customers, Devices, Inventory and Payments modules shown in the pasted navigation — none exist today and none are created here
- Issuing a purchased part to a service (consumption); this slice only *links* a line to a service
- Migrating existing `Service.partsUsed` data
- Component/React testing infrastructure (see Testing)

## Context: current state of the app

Established before designing, and the design depends on it:

- **Navigation today** (`src/components/layout/SideNavBar.tsx:40-80`): Dashboard, Repairs, Technicians, Reports, Branches, Settings. There is no Customers, Devices, Inventory or Payments module.
- **No supplier, purchase or stock data exists** anywhere in the codebase.
- **Data layer:** Firestore via `firebase-admin` (`adminDb`), repo-per-domain in `src/lib/*Repo.ts`, HTTP in `src/app/api/*`, feature components in `src/modules/*`.
- **Multi-tenancy:** every document carries `shopId` and `branchId`. `adminDb` uses a service account and **bypasses `firestore.rules` entirely**, so the repo layer is the only real tenant boundary — the hazard `technicianRepo.assertBranchInShop` already documents.
- **Testing:** vitest, `include: ["src/**/*.test.ts"]`, `environment: "node"`. No component-test setup exists.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| First slice | Suppliers + Purchases, no stock | Ships usable value without the missing inventory module; is the prerequisite for every later slice |
| Tenancy | Suppliers per **shop**, purchases per **branch** | One vendor is the same vendor across branches; each bill belongs to the branch that bought it |
| Permissions | `shop_admin` + `branch_admin` only | Purchasing is money-handling; technicians have no access at all |
| Line items | Free text + autocomplete from this shop's history | No catalogue to maintain; the accumulated history seeds the later Inventory slice |
| Editability | Editable until first payment, then locked | Prevents a totals/paid mismatch silently corrupting supplier outstanding |
| Totals | Invoice-level discount, single invoice GST rate | Matches how local spare-supplier bills are actually written |
| Invoice number | App-generated `ref` + optional supplier bill number | Guarantees uniqueness without blocking entry on unnumbered handwritten bills |
| Service link | Optional, per line item | Answers "did the display for job #482 arrive?" with no stock module |
| Storage shape | Embedded items + payments, denormalized supplier totals | Bounded arrays; one read renders Purchase Details; supplier list and cards avoid per-render aggregation |

### Rejected alternatives

- **Normalized `payments` subcollection with outstanding computed on read.** Nothing can drift, but every supplier row and the "Pending Payments" card become collection scans that get slower as the business grows.
- **Embedded items with outstanding computed on read.** Simpler writes, same per-render read cost.

The chosen approach's drift risk is contained by making `purchaseRepo` the only writer of supplier totals, with tests asserting each mutation happens in a single transaction.

## Data model

Two new top-level collections, alongside `technicians` and `branches`.

### `suppliers/{id}` — shop-scoped

```ts
interface Supplier {
  id: string;
  shopId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  status: "active" | "inactive";
  /** Denormalized. Maintained only by supplierRepo/purchaseRepo, inside transactions. */
  totalPurchased: number;
  totalPaid: number;
  outstanding: number;
  lastPurchaseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### `purchases/{id}` — branch-scoped

```ts
interface Purchase {
  id: string;
  shopId: string;
  branchId: string;
  /** App-generated, sequential per shop per year: "PUR-2026-0012". */
  ref: string;
  /** The number printed on the supplier's paper bill, if any. */
  supplierInvoiceNo?: string;
  supplierId: string;
  /** Denormalized so the list renders from one read. */
  supplierName: string;
  purchaseDate: Date;
  purchasedBy: { userId: string; name: string };

  items: PurchaseItem[];

  subtotal: number;
  discount: { mode: "amount" | "percent"; value: number; amount: number };
  gstRate: number;
  gstAmount: number;
  transportCharge: number;
  grandTotal: number;

  payments: PurchasePayment[];
  paidAmount: number;
  balance: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  /** Required when the purchase is raised on credit. "Overdue" is derived, never stored. */
  dueDate?: Date;

  status: "active" | "cancelled";
  cancelReason?: string;
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

interface PurchaseItem {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  remarks?: string;
  /** Optional link to the job this part was bought for. */
  serviceId?: string;
  serviceRef?: string;
  lineTotal: number;
}

interface PurchasePayment {
  id: string;
  amount: number;
  method: "cash" | "upi" | "bank";
  paidAt: Date;
  reference?: string;
  notes?: string;
  recordedBy: string;
  createdAt: Date;
}
```

### Model notes

- **"Credit" is not a payment method.** The mockup lists it beside Cash/UPI/Bank, but it means no money moved. Selecting Credit on Add Purchase records zero payments, requires `dueDate`, and opens the invoice as `unpaid`. Only real tenders become `PurchasePayment` rows, so `method` has three values.
- **Money is stored in rupees as `number`**, consistent with `Service.price`, with every computed figure passed through a single `roundMoney` helper. Integer paise would be more rigorous; mixing units across a codebase already denominated in rupees is the larger hazard.
- **Sequential `ref` requires a counter document**, `shops/{shopId}/counters/purchaseRef`, incremented inside the same transaction that writes the purchase so concurrent entry cannot collide.
- **`isOverdue` is derived** at read time: `dueDate` has passed **and** `balance > 0`. It is never a stored status value.

## Screens and navigation

One new `SideNavBar` entry, "Spare Purchases" → `/purchases`, shown only to `shop_admin` and `branch_admin` through the existing role filter. The bottom nav's primary five items are unchanged; Spare Purchases appears in its "More" sheet.

| Route | Screen |
|---|---|
| `/purchases` | Summary cards + purchase list |
| `/purchases/new` | Add Purchase |
| `/purchases/details?id=` | Purchase Details |
| `/purchases/suppliers` | Supplier list |
| `/purchases/suppliers/details?id=` | Supplier profile |

Query-param detail routes follow the existing `/services/details` pattern. Suppliers sit under `/purchases` rather than taking a second nav entry — a supporting entity, not a workflow.

**Summary cards — five, not six.** **Low Stock Alerts is omitted**: it requires stock levels, and a card that can only render `0` is worse than no card. The five, with their exact definitions over non-cancelled purchases in the caller's scope:

| Card | Definition |
|---|---|
| Today's Purchase | Sum of `grandTotal` where `purchaseDate` is today; subtitle shows the purchase count |
| This Month | Sum of `grandTotal` for the current calendar month |
| Pending Payments | Sum of `balance` where `balance > 0`; subtitle shows the bill count |
| Suppliers | Count of `suppliers` with `status: "active"` |
| Items Purchased Today | Sum of `items[].quantity` across today's purchases |

Day and month boundaries use the existing helpers in `src/lib/dateUtils.ts`, so the cards agree with the rest of the app rather than inventing their own notion of "today".

**Purchase list** reuses the `/services` responsive treatment — table on desktop, stacked cards on mobile. Search spans `ref`, `supplierInvoiceNo`, `supplierName` and item name. Filters: date range (Today / This Week / This Month / custom), supplier, payment status. Cancelled purchases are excluded by default.

**Purchase Details** renders from one document read: summary, items table, supplier block, payment history, derived balance. `Record Payment` opens a modal. `Edit Purchase` and `Cancel` render only while `payments` is empty — absent once locked, not disabled.

**Add Purchase** is a single scrolling form, not a wizard: supplier picker with inline "+ Add Supplier", repeatable item rows with history autocomplete on name/brand/model, then totals and payment blocks. Totals recompute live from the same pure module the server uses.

*Autocomplete source:* `GET /api/purchases/item-suggestions` returns the distinct `name` / `brand` / `model` values from this shop's most recent 200 purchases, fetched once when the form mounts and filtered client-side. No new collection, no per-keystroke query. If the request fails the fields still accept free text — suggestions are a convenience, never a gate.

**Supplier profile** shows the contact block, denormalized totals, and the supplier's purchase history with outstanding bills.

**One touch outside the module:** Service Details gains a read-only "Parts ordered" section listing purchase lines whose `serviceId` matches. Read-only — purchase entry stays in the purchases module.

**Components** live in `src/modules/purchase/`, mirroring `src/modules/technician/`: `PurchaseList`, `PurchaseForm`, `PurchaseDetails`, `RecordPaymentModal`, `SupplierList`, `SupplierForm`, `SupplierProfile`.

## Architecture

Layering follows the technician module: pure logic in `src/lib/*` (no I/O, unit-tested), Firestore access in repos, HTTP in API routes, React in `src/modules/*`. **API routes contain no business rules.**

Pure modules:

- `purchaseTotals.ts` — line totals → subtotal → discount → GST → transport → grand total, plus `roundMoney`. Used by both the form and the repo so client and server cannot disagree.
- `purchasePayments.ts` — `paidAmount`, `balance`, `paymentStatus`, `isOverdue`.
- `purchaseValidation.ts` — create/update/payment input rules.
- `purchaseRef.ts` — `PUR-{year}-{seq padded to 4}`.

Repos: `supplierRepo.ts`, `purchaseRepo.ts`.

API routes: `/api/suppliers` (+ `/[id]`), `/api/purchases` (+ `/[id]`, `/[id]/payments`, `/[id]/cancel`, `/item-suggestions`).

**Totals precedence**, in order, each step rounded to two decimals:

1. `lineTotal` = `quantity` × `purchasePrice`
2. `subtotal` = sum of `lineTotal`
3. `discount.amount` = `discount.value` when `mode` is `"amount"`, else `subtotal` × `discount.value` / 100
4. `gstAmount` = (`subtotal` − `discount.amount`) × `gstRate` / 100
5. `grandTotal` = `subtotal` − `discount.amount` + `gstAmount` + `transportCharge`

`discount.value` is always what the admin typed; `discount.amount` is always the rupee figure derived from it, so the stored document never requires re-deriving the mode to be read.

## Flows

### Create purchase — one transaction

1. Read `suppliers/{supplierId}`; reject if missing or `shopId` mismatch.
2. Read and increment `shops/{shopId}/counters/purchaseRef`; reset the sequence on year rollover.
3. **Recompute all totals server-side** from the submitted line items. Client figures are compared, never trusted; a mismatch returns 400, catching both a stale form and tampering.
4. Write the purchase. If the payload carries an initial payment, embed it and set `paidAmount` / `balance` / `paymentStatus`.
5. Update the supplier: `totalPurchased += grandTotal`, `totalPaid += initialPayment`, `outstanding += balance`, `lastPurchaseAt`.

### Record payment — one transaction

Reload the purchase inside the transaction (this is what makes two admins paying the same bill concurrently safe). Reject if `cancelled`, if `amount <= 0`, or if `amount > balance`. Append the payment, recompute `paidAmount` / `balance` / `paymentStatus`, then `totalPaid += amount` and `outstanding -= amount` on the supplier.

### Edit purchase

409 if `payments` is non-empty. The UI hides the button; the API is the real gate. Otherwise recompute totals and apply the **delta** to supplier `totalPurchased` and `outstanding` — never a recomputed absolute.

### Cancel purchase

Allowed only while unpaid. Requires a reason. Sets `status: "cancelled"`, `cancelReason`, `cancelledAt`, and reverses the supplier deltas. Excluded from lists, cards and totals by default. **Nothing is ever hard-deleted.**

## Validation

- Supplier required; must belong to the caller's shop.
- At least one line item.
- Per line: `name` non-empty, `quantity >= 1`, `purchasePrice >= 0`.
- `discount.amount` cannot exceed `subtotal`.
- `gstRate` between 0 and 28.
- `transportCharge >= 0`.
- Initial payment cannot exceed `grandTotal`; a later payment cannot exceed `balance`.
- Credit requires `dueDate`.
- `dueDate` cannot precede `purchaseDate`.
- Phone and GST number reuse the existing helpers in `src/lib/validation.ts` rather than growing new ones.

## Permissions and tenancy

Add `purchase:read`, `purchase:write`, `purchase:delete` to `Permission` in `src/types/index.ts` and to `ROLE_PERMISSIONS` in `src/lib/rbac.ts`:

- `shop_admin` — all three.
- `branch_admin` — `purchase:read`, `purchase:write`; scoped to its own `branchId` for purchases.
- `technician` — none. The nav entry is hidden and the API returns 403.

`purchase:delete` gates **cancellation**, not deletion — no code path removes a purchase document. The permission keeps the naming consistent with the existing `*:delete` entries in `Permission`.

Every read and write filters by `shopId`. An `assertSupplierInShop` guard mirrors `technicianRepo.assertBranchInShop` and **fails closed** on a supplier with no `shopId`.

## Error handling

`ApiError` with existing status conventions: 400 validation, 403 tenancy/role, 404 missing, 409 locked-or-cancelled. Surfaced as inline field errors on forms and a toast for transaction failures.

One deliberate exception: a duplicate `supplierInvoiceNo` for the same supplier is a **warning the admin can override**, not an error — genuine duplicate bill numbers do occur in practice.

## Firestore indexes

Add to `firestore.indexes.json`:

- `purchases`: `(shopId, branchId, purchaseDate desc)`
- `purchases`: `(shopId, supplierId, purchaseDate desc)`
- `purchases`: `(shopId, paymentStatus, dueDate)`
- `suppliers`: `(shopId, name)`

`firestore.rules` gains read rules for both collections consistent with existing collections; writes continue to go through `adminDb`.

## Testing

TDD per the house style — tests first for every pure module and repo operation.

**Extract the existing fake first.** `technicianRepo.test.ts` already contains an in-memory Firestore fake supporting `collection().doc()`, `.get()`, `.where()` and `runTransaction`, and it records every transaction write so tests can assert single-transaction behavior. Move it to `src/lib/testing/fakeFirestore.ts` and reuse it rather than duplicating it.

- `purchaseTotals.test.ts` — line math; percent vs amount discount; GST applied to the discounted subtotal; transport; rounding at each boundary; discount equal to subtotal.
- `purchasePayments.test.ts` — `unpaid` → `partial` → `paid` transitions; an exact-balance payment landing on `paid`; `isOverdue` only when `dueDate` has passed **and** balance remains.
- `purchaseValidation.test.ts` — one test per rule above, asserting the specific error rather than mere failure.
- `purchaseRef.test.ts` — padding; year rollover resetting the sequence.
- `purchaseRepo.test.ts` — create writes purchase + counter + supplier totals in a **single** transaction; concurrent `recordPayment` calls cannot overdraw the balance; payment beyond balance rejects; edit on a paid purchase 409s; cancel reverses supplier deltas exactly; a supplier from another shop 403s and writes nothing.
- `supplierRepo.test.ts` — shop scoping; outstanding never drifting negative across create → pay → cancel.

**Known limitation.** `vitest.config.ts` includes only `src/**/*.test.ts` in a `node` environment; this project has no component-test setup, and adding React Testing Library is a separate decision deliberately kept out of this branch. The design's defence is thin components: all arithmetic, status derivation and validation live in the pure modules, and `PurchaseForm` only wires them to inputs. What remains untested is layout and wiring, verified by running the app.

## Manual verification

1. Create a supplier.
2. Raise a 3-line purchase paid partly by UPI; confirm the supplier's outstanding matches the balance.
3. Record the remaining balance; confirm the status flips to `paid` and outstanding reaches zero.
4. Confirm Edit and Cancel disappear once a payment exists.
5. Cancel an unpaid invoice; confirm supplier totals return to their prior values.
6. Sign in as `branch_admin`; confirm another branch's purchases are invisible in both the list and the summary cards.
7. Confirm a technician sees no nav entry and gets 403 from `/api/purchases`.

## Later slices

In dependency order, each its own spec:

1. **Inventory / stock ledger** — spare-item catalogue seeded from purchase history; stock in on purchase; stock out on service; Low Stock Alerts.
2. **Reports** — the seven reports, which need both purchase and stock data to be meaningful.
3. **Supplier returns / debit notes** — surfaced by the "never hard-delete" rule but out of scope here.
