# Spare Purchases Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Spare Purchases module — supplier profiles, purchase invoices with line items, supplier payments, and accurate outstanding balances — without touching stock or reports.

**Architecture:** Pure logic modules in `src/lib/*` hold all arithmetic, status derivation and input validation with no I/O. Two repos (`supplierRepo`, `purchaseRepo`) own Firestore access and are the only writers of denormalized supplier totals, mutating them inside single transactions. API routes in `src/app/api/*` carry no business rules — they authenticate, authorize, parse, delegate. React components in `src/modules/purchase/*` are thin and call the same pure modules the server uses.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS v4, Firestore via `firebase-admin` (`adminDb`), vitest (node environment).

**Spec:** `docs/superpowers/specs/2026-08-05-spare-purchases-design.md`

## Global Constraints

- **No `any` types.** `CODING_RULES.md` forbids it outright. Use `unknown` plus narrowing, exactly as `technicianValidation.ts` does.
- **Money is `number` in rupees**, never paise. Every computed figure passes through `roundMoney`.
- **`shopId` and `branchId` always come from the session**, never from a request body. This mirrors the comment in `src/app/api/technicians/route.ts:44`.
- **`adminDb` bypasses `firestore.rules`.** The repo layer is the only real tenant boundary. Every read and write filters by `shopId`.
- **Nothing is hard-deleted.** Cancellation sets `status: "cancelled"`; no code path calls `.delete()` on a purchase.
- **Components are `React.memo`'d function components** with `useMemo`/`useCallback` for derived values and handlers, per `CODING_RULES.md`.
- **Every task ends with a commit.** Run `npm run type-check` before each commit; run `npm test` for tasks that touch `src/lib`.
- **Test files are `src/**/*.test.ts`** — `vitest.config.ts` includes only `.ts` in a `node` environment. Do not write `.test.tsx`; there is no component-test setup and adding one is out of scope.

## Deviations from the spec

Corrections found while reading the codebase, plus amendments made during execution. The spec is authoritative on behavior; these override it on mechanism.

1. **Counter path.** The spec says `shops/{shopId}/counters/purchaseRef`. Use a **top-level `purchaseCounters/{shopId}`** instead. Nested subcollections would force the Firestore test fake to model full document paths for no behavioral gain.
2. **Date helpers.** The spec says day/month boundaries "use the existing helpers in `src/lib/dateUtils.ts`". That file exports only `readOptionalDate` — the helpers do not exist and are added in Task 2.
3. **GST number validation.** The spec says phone and GST "reuse the existing helpers in `src/lib/validation.ts`". `validatePhone` exists; there is no GST validator, so Task 5 adds `validateGstNumber` to that file.
4. **Phone length (found during execution).** The shared `validatePhone` is `/^[\+]?[1-9][\d]{0,15}$/` — no minimum length, so `"123"` passes. Task 6 therefore adds a 10–15 digit check **inside the purchases module**, leaving the shared validator and the technician/registration flows that use it untouched. Note also that `validatePhone` is duplicated verbatim in `src/lib/validation.ts:115` and `src/lib/utils.ts:192`; that pre-existing duplication is out of scope here.
5. **Reference counter shape (found during execution).** See the amendment note under Task 5 — the counter is a per-year map, not `{ year, seq }`.

## File structure

**Created — pure logic (all unit-tested):**

| File | Responsibility |
|---|---|
| `src/types/purchase.ts` | `Supplier`, `Purchase`, `PurchaseItem`, `PurchasePayment` and their input types |
| `src/lib/purchaseTotals.ts` | Line totals → subtotal → discount → GST → transport → grand total; `roundMoney` |
| `src/lib/purchasePayments.ts` | `paidAmount`, `balance`, `paymentStatus`, `isOverdue` |
| `src/lib/purchaseRef.ts` | `PUR-{year}-{seq}` formatting and counter rollover |
| `src/lib/purchaseValidation.ts` | Request-body parsing and business rules for every purchase/supplier endpoint |
| `src/lib/purchaseSummary.ts` | The five dashboard card figures |

**Created — data access:**

| File | Responsibility |
|---|---|
| `src/lib/supplierRepo.ts` | Supplier CRUD, shop scoping, `assertSupplierInShop` |
| `src/lib/purchaseRepo.ts` | Purchase CRUD, the ref counter, and every supplier-total mutation |
| `src/lib/testing/fakeFirestore.ts` | In-memory Firestore fake, extracted from `technicianRepo.test.ts` and extended |

**Created — HTTP:** `src/app/api/suppliers/route.ts`, `src/app/api/suppliers/[id]/route.ts`, `src/app/api/purchases/route.ts`, `src/app/api/purchases/[id]/route.ts`, `src/app/api/purchases/[id]/payments/route.ts`, `src/app/api/purchases/[id]/cancel/route.ts`, `src/app/api/purchases/item-suggestions/route.ts`

**Created — UI:** `src/modules/purchase/{PurchaseList,PurchaseForm,PurchaseDetails,RecordPaymentModal,SupplierList,SupplierForm,SupplierProfile,PurchaseSummaryCards}.tsx` and pages under `src/app/(dashboard)/purchases/`

**Modified:** `src/types/index.ts` (Permission entries, re-exports), `src/lib/rbac.ts` (role grants), `src/lib/apiAuth.ts` (purchase guards), `src/lib/dateUtils.ts` (boundary helpers), `src/lib/validation.ts` (`validateGstNumber`), `src/lib/technicianRepo.test.ts` (use the extracted fake), `src/components/layout/SideNavBar.tsx`, `src/components/layout/BottomNavBar.tsx`, `src/components/service/ServiceDetailsView.tsx`, `firestore.indexes.json`, `firestore.rules`

## Task order and dependencies

**Tasks 1–11 are the tested core** and must land in order — types, pure logic, the test fake, both repos, and the permission guards. **Tasks 12–13 (HTTP)** depend on all of them. **Tasks 14–17 (UI)** depend on the API surface existing. **Task 18 (navigation)** must come after 14–17, because `SideNavBar` carries a standing rule against nav entries whose pages do not yet exist. **Task 19** is Firestore configuration and end-to-end verification, and closes the module.

Nineteen tasks in total. Tasks 3–11 each carry a full test cycle; Tasks 12–19 are verified by `type-check`, `build`, and the manual walkthrough in Task 19, because the project has no HTTP-route or component test setup.

---

### Task 1: Purchase domain types

**Files:**
- Create: `src/types/purchase.ts`
- Modify: `src/types/index.ts` (append re-export at end of file)

**Interfaces:**
- Consumes: nothing.
- Produces: `Supplier`, `Purchase`, `PurchaseItem`, `PurchasePayment`, `PurchaseDiscount`, `PurchasePaymentMethod`, `PurchasePaymentStatus`, `PurchaseStatus`, `SupplierStatus`. Every later task imports these from `@/types/purchase`.

There is no test in this task — types have no runtime behavior, and `npm run type-check` is the verification.

- [ ] **Step 1: Create the types file**

```typescript
// src/types/purchase.ts

export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: string;
  shopId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  status: SupplierStatus;
  /**
   * Denormalized running totals. Written ONLY by purchaseRepo/supplierRepo
   * inside transactions — nothing else may touch them, or they drift.
   */
  totalPurchased: number;
  totalPaid: number;
  outstanding: number;
  lastPurchaseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type PurchasePaymentMethod = "cash" | "upi" | "bank";

/**
 * "Credit" is deliberately absent: on the Add Purchase form it means no money
 * moved, so it produces zero payments rather than a payment with this method.
 */
export interface PurchasePayment {
  id: string;
  amount: number;
  method: PurchasePaymentMethod;
  paidAt: Date;
  reference?: string;
  notes?: string;
  recordedBy: string;
  createdAt: Date;
}

export interface PurchaseItem {
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

export interface PurchaseDiscount {
  mode: "amount" | "percent";
  /** What the admin typed. */
  value: number;
  /** The rupee figure derived from `value`, so readers never re-derive it. */
  amount: number;
}

export type PurchasePaymentStatus = "unpaid" | "partial" | "paid";
export type PurchaseStatus = "active" | "cancelled";

export interface Purchase {
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
  discount: PurchaseDiscount;
  gstRate: number;
  gstAmount: number;
  transportCharge: number;
  grandTotal: number;

  payments: PurchasePayment[];
  paidAmount: number;
  balance: number;
  paymentStatus: PurchasePaymentStatus;
  /** Required when raised on credit. "Overdue" is derived, never stored. */
  dueDate?: Date;

  status: PurchaseStatus;
  cancelReason?: string;
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Re-export from the types barrel**

Append to the end of `src/types/index.ts`:

```typescript
export type {
  Supplier,
  SupplierStatus,
  Purchase,
  PurchaseItem,
  PurchaseDiscount,
  PurchasePayment,
  PurchasePaymentMethod,
  PurchasePaymentStatus,
  PurchaseStatus,
} from "./purchase";
```

- [ ] **Step 3: Verify types compile**

Run: `npm run type-check`
Expected: exits 0 with no output.

- [ ] **Step 4: Commit**

```bash
git add src/types/purchase.ts src/types/index.ts
git commit -m "feat: add spare purchase domain types"
```

---

### Task 2: Date boundary helpers

**Files:**
- Modify: `src/lib/dateUtils.ts`
- Test: `src/lib/dateUtils.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `startOfDay(date: Date): Date`, `startOfMonth(date: Date): Date`, `isSameDay(a: Date, b: Date): boolean`, `isSameMonth(a: Date, b: Date): boolean`. Task 8 (`purchaseSummary`) is the only consumer.

These are local-time boundaries, matching how a shop owner thinks about "today". The existing `dashboardAnalytics.dst.test.ts` shows this codebase already cares about DST correctness, so the tests cover a DST transition.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/dateUtils.test.ts
import { describe, expect, it } from "vitest";

import { isSameDay, isSameMonth, startOfDay, startOfMonth } from "@/lib/dateUtils";

describe("startOfDay", () => {
  it("zeroes the time components", () => {
    const result = startOfDay(new Date(2026, 7, 5, 14, 33, 12, 456));
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(5);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it("does not mutate its argument", () => {
    const input = new Date(2026, 7, 5, 14, 33);
    startOfDay(input);
    expect(input.getHours()).toBe(14);
  });
});

describe("startOfMonth", () => {
  it("returns midnight on the first of the month", () => {
    const result = startOfMonth(new Date(2026, 7, 22, 9, 15));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(7);
    expect(result.getHours()).toBe(0);
  });
});

describe("isSameDay", () => {
  it("is true for two times on the same calendar day", () => {
    expect(isSameDay(new Date(2026, 7, 5, 0, 1), new Date(2026, 7, 5, 23, 59))).toBe(true);
  });

  it("is false one millisecond across midnight", () => {
    expect(
      isSameDay(new Date(2026, 7, 5, 23, 59, 59, 999), new Date(2026, 7, 6, 0, 0, 0, 0))
    ).toBe(false);
  });

  it("is false for the same day number in different months", () => {
    expect(isSameDay(new Date(2026, 6, 5), new Date(2026, 7, 5))).toBe(false);
  });
});

describe("isSameMonth", () => {
  it("is true across the whole month", () => {
    expect(isSameMonth(new Date(2026, 7, 1), new Date(2026, 7, 31))).toBe(true);
  });

  it("is false for the same month in different years", () => {
    expect(isSameMonth(new Date(2025, 7, 5), new Date(2026, 7, 5))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/dateUtils.test.ts`
Expected: FAIL — `startOfDay is not a function` (the module exports only `readOptionalDate`).

- [ ] **Step 3: Write the implementation**

Append to `src/lib/dateUtils.ts`:

```typescript
/** Midnight local time on the same calendar day. Never mutates the input. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Midnight local time on the first of the same month. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/dateUtils.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dateUtils.ts src/lib/dateUtils.test.ts
git commit -m "feat: add local-time date boundary helpers"
```

---

### Task 3: Purchase totals arithmetic

**Files:**
- Create: `src/lib/purchaseTotals.ts`
- Test: `src/lib/purchaseTotals.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `roundMoney(value: number): number`
  - `lineTotalOf(quantity: number, purchasePrice: number): number`
  - `computeTotals(input: TotalsInput): PurchaseTotals`
  - `interface TotalsInput { items: Array<{ quantity: number; purchasePrice: number }>; discount: { mode: "amount" | "percent"; value: number }; gstRate: number; transportCharge: number }`
  - `interface PurchaseTotals { subtotal: number; discountAmount: number; gstAmount: number; transportCharge: number; grandTotal: number }`

`computeTotals` is called by `purchaseRepo` (Task 7) and `PurchaseForm` (Task 13), which is what guarantees the displayed grand total and the persisted one are the same number.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/purchaseTotals.test.ts
import { describe, expect, it } from "vitest";

import { computeTotals, lineTotalOf, roundMoney } from "@/lib/purchaseTotals";

describe("roundMoney", () => {
  it("rounds to two decimals", () => {
    expect(roundMoney(1234.5678)).toBe(1234.57);
  });

  it("removes binary float noise", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it("rounds half away from zero rather than to even", () => {
    expect(roundMoney(2.675)).toBe(2.68);
  });

  it("returns 0 for a non-finite input rather than NaN", () => {
    expect(roundMoney(Number.NaN)).toBe(0);
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("lineTotalOf", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineTotalOf(3, 1800)).toBe(5400);
  });

  it("rounds a fractional product", () => {
    expect(lineTotalOf(3, 33.333)).toBe(100);
  });
});

describe("computeTotals", () => {
  const items = [
    { quantity: 3, purchasePrice: 1800 }, // 5400
    { quantity: 5, purchasePrice: 550 }, //  2750
    { quantity: 2, purchasePrice: 350 }, //   700
  ];

  it("sums line totals into the subtotal", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "amount", value: 0 },
      gstRate: 0,
      transportCharge: 0,
    });
    expect(totals.subtotal).toBe(8850);
    expect(totals.grandTotal).toBe(8850);
  });

  it("treats an amount discount as rupees", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "amount", value: 200 },
      gstRate: 0,
      transportCharge: 0,
    });
    expect(totals.discountAmount).toBe(200);
    expect(totals.grandTotal).toBe(8650);
  });

  it("treats a percent discount as a share of the subtotal", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "percent", value: 10 },
      gstRate: 0,
      transportCharge: 0,
    });
    expect(totals.discountAmount).toBe(885);
    expect(totals.grandTotal).toBe(7965);
  });

  it("applies GST to the DISCOUNTED subtotal, not the raw subtotal", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "amount", value: 850 },
      gstRate: 18,
      transportCharge: 0,
    });
    // (8850 - 850) * 0.18 = 1440, not 8850 * 0.18 = 1593
    expect(totals.gstAmount).toBe(1440);
    expect(totals.grandTotal).toBe(9440);
  });

  it("adds transport after GST, untaxed", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "amount", value: 850 },
      gstRate: 18,
      transportCharge: 100,
    });
    expect(totals.gstAmount).toBe(1440);
    expect(totals.transportCharge).toBe(100);
    expect(totals.grandTotal).toBe(9540);
  });

  it("handles a discount equal to the subtotal", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "percent", value: 100 },
      gstRate: 18,
      transportCharge: 50,
    });
    expect(totals.discountAmount).toBe(8850);
    expect(totals.gstAmount).toBe(0);
    expect(totals.grandTotal).toBe(50);
  });

  it("returns all zeros for an empty item list", () => {
    const totals = computeTotals({
      items: [],
      discount: { mode: "amount", value: 0 },
      gstRate: 18,
      transportCharge: 0,
    });
    expect(totals).toEqual({
      subtotal: 0,
      discountAmount: 0,
      gstAmount: 0,
      transportCharge: 0,
      grandTotal: 0,
    });
  });

  it("never lets a discount larger than the subtotal drive the total negative", () => {
    const totals = computeTotals({
      items: [{ quantity: 1, purchasePrice: 100 }],
      discount: { mode: "amount", value: 500 },
      gstRate: 0,
      transportCharge: 0,
    });
    expect(totals.discountAmount).toBe(100);
    expect(totals.grandTotal).toBe(0);
  });

  it("rounds at each step so the parts sum to the whole", () => {
    const totals = computeTotals({
      items: [{ quantity: 3, purchasePrice: 33.33 }],
      discount: { mode: "percent", value: 7 },
      gstRate: 12,
      transportCharge: 0,
    });
    const recomputed = roundMoney(
      totals.subtotal - totals.discountAmount + totals.gstAmount + totals.transportCharge
    );
    expect(recomputed).toBe(totals.grandTotal);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/purchaseTotals.test.ts`
Expected: FAIL — cannot resolve `@/lib/purchaseTotals`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/purchaseTotals.ts

export interface TotalsLine {
  quantity: number;
  purchasePrice: number;
}

export interface TotalsDiscount {
  mode: "amount" | "percent";
  value: number;
}

export interface TotalsInput {
  items: TotalsLine[];
  discount: TotalsDiscount;
  gstRate: number;
  transportCharge: number;
}

export interface PurchaseTotals {
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  transportCharge: number;
  grandTotal: number;
}

/**
 * Two-decimal rupees, rounded half away from zero. `Math.round` alone rounds
 * 2.675 down because the float is really 2.67499…, so nudge by an epsilon
 * proportional to the value before rounding. Non-finite input collapses to 0
 * rather than poisoning every downstream total with NaN.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const scaled = value * 100;
  const nudged = scaled + (scaled >= 0 ? Number.EPSILON : -Number.EPSILON) * Math.abs(scaled);
  return Math.sign(nudged) * Math.round(Math.abs(nudged)) / 100;
}

export function lineTotalOf(quantity: number, purchasePrice: number): number {
  return roundMoney(quantity * purchasePrice);
}

/**
 * The single source of truth for purchase arithmetic, used by both the form
 * and the repo so the number on screen and the number persisted cannot differ.
 *
 * Order matters: discount applies to the subtotal, GST applies to the
 * DISCOUNTED subtotal, and transport is added afterwards untaxed.
 */
export function computeTotals(input: TotalsInput): PurchaseTotals {
  const subtotal = roundMoney(
    input.items.reduce((sum, item) => sum + lineTotalOf(item.quantity, item.purchasePrice), 0)
  );

  const rawDiscount =
    input.discount.mode === "percent"
      ? (subtotal * input.discount.value) / 100
      : input.discount.value;

  // Clamped so an over-large discount can never produce a negative bill.
  const discountAmount = roundMoney(Math.min(Math.max(rawDiscount, 0), subtotal));

  const taxable = roundMoney(subtotal - discountAmount);
  const gstAmount = roundMoney((taxable * input.gstRate) / 100);
  const transportCharge = roundMoney(Math.max(input.transportCharge, 0));
  const grandTotal = roundMoney(taxable + gstAmount + transportCharge);

  return { subtotal, discountAmount, gstAmount, transportCharge, grandTotal };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/purchaseTotals.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/purchaseTotals.ts src/lib/purchaseTotals.test.ts
git commit -m "feat: add purchase totals arithmetic"
```

---

### Task 4: Payment status derivation

**Files:**
- Create: `src/lib/purchasePayments.ts`
- Test: `src/lib/purchasePayments.test.ts`

**Interfaces:**
- Consumes: `roundMoney` from `@/lib/purchaseTotals`.
- Produces:
  - `paidAmountOf(payments: Array<{ amount: number }>): number`
  - `summarizePayments(grandTotal: number, payments: Array<{ amount: number }>): PaymentSummary`
  - `interface PaymentSummary { paidAmount: number; balance: number; paymentStatus: PurchasePaymentStatus }`
  - `isOverdue(balance: number, dueDate: Date | undefined, now: Date): boolean`

`summarizePayments` is the only way any code derives these three fields — Task 7's repo calls it on create, on payment, and on edit.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/purchasePayments.test.ts
import { describe, expect, it } from "vitest";

import { isOverdue, paidAmountOf, summarizePayments } from "@/lib/purchasePayments";

describe("paidAmountOf", () => {
  it("is 0 for no payments", () => {
    expect(paidAmountOf([])).toBe(0);
  });

  it("sums and rounds", () => {
    expect(paidAmountOf([{ amount: 10000 }, { amount: 5000 }, { amount: 0.005 }])).toBe(15000.01);
  });
});

describe("summarizePayments", () => {
  it("reports unpaid when nothing has been paid", () => {
    expect(summarizePayments(8500, [])).toEqual({
      paidAmount: 0,
      balance: 8500,
      paymentStatus: "unpaid",
    });
  });

  it("reports partial when some has been paid", () => {
    expect(summarizePayments(8500, [{ amount: 6000 }])).toEqual({
      paidAmount: 6000,
      balance: 2500,
      paymentStatus: "partial",
    });
  });

  it("reports paid when the exact balance is settled", () => {
    expect(summarizePayments(8500, [{ amount: 6000 }, { amount: 2500 }])).toEqual({
      paidAmount: 8500,
      balance: 0,
      paymentStatus: "paid",
    });
  });

  it("treats a sub-paisa remainder as paid rather than stranding a partial bill", () => {
    const result = summarizePayments(100, [{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.34 }]);
    expect(result.balance).toBe(0);
    expect(result.paymentStatus).toBe("paid");
  });

  it("never reports a negative balance", () => {
    const result = summarizePayments(1000, [{ amount: 1500 }]);
    expect(result.balance).toBe(0);
    expect(result.paymentStatus).toBe("paid");
  });

  it("reports paid for a zero-value purchase with no payments", () => {
    expect(summarizePayments(0, []).paymentStatus).toBe("paid");
  });
});

describe("isOverdue", () => {
  const due = new Date(2026, 7, 1);

  it("is false when there is no due date", () => {
    expect(isOverdue(2500, undefined, new Date(2026, 7, 5))).toBe(false);
  });

  it("is false when the balance is settled, however old the due date", () => {
    expect(isOverdue(0, due, new Date(2026, 11, 31))).toBe(false);
  });

  it("is true when the due date has passed and a balance remains", () => {
    expect(isOverdue(2500, due, new Date(2026, 7, 5))).toBe(true);
  });

  it("is false on the due date itself", () => {
    expect(isOverdue(2500, due, new Date(2026, 7, 1, 23, 59))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/purchasePayments.test.ts`
Expected: FAIL — cannot resolve `@/lib/purchasePayments`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/purchasePayments.ts
import { roundMoney } from "@/lib/purchaseTotals";
import type { PurchasePaymentStatus } from "@/types/purchase";

export interface AmountOnly {
  amount: number;
}

export interface PaymentSummary {
  paidAmount: number;
  balance: number;
  paymentStatus: PurchasePaymentStatus;
}

export function paidAmountOf(payments: AmountOnly[]): number {
  return roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
}

/**
 * The single derivation of paidAmount / balance / paymentStatus. Every write
 * path calls this rather than computing the three fields independently, which
 * is what keeps a purchase's stored status consistent with its payments array.
 *
 * The balance is floored at 0: an overpayment is a data-entry problem to be
 * caught by validation, not a reason to show a negative bill.
 */
export function summarizePayments(grandTotal: number, payments: AmountOnly[]): PaymentSummary {
  const paidAmount = paidAmountOf(payments);
  const balance = roundMoney(Math.max(grandTotal - paidAmount, 0));

  // Compare on the rounded balance so a sub-paisa remainder reads as settled.
  const paymentStatus: PurchasePaymentStatus =
    balance === 0 ? "paid" : paidAmount === 0 ? "unpaid" : "partial";

  return { paidAmount, balance, paymentStatus };
}

/** Overdue is always derived, never stored — it changes with the clock alone. */
export function isOverdue(balance: number, dueDate: Date | undefined, now: Date): boolean {
  if (!dueDate) return false;
  if (balance <= 0) return false;
  return now.getTime() > endOfDueDay(dueDate);
}

/** A bill is not overdue until the due date has fully elapsed. */
function endOfDueDay(dueDate: Date): number {
  return new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/purchasePayments.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/purchasePayments.ts src/lib/purchasePayments.test.ts
git commit -m "feat: add purchase payment status derivation"
```

---

### Task 5: Reference numbering and GST validation

**Files:**
- Create: `src/lib/purchaseRef.ts`
- Test: `src/lib/purchaseRef.test.ts`
- Modify: `src/lib/validation.ts` (append `validateGstNumber`)
- Test: `src/lib/validation.test.ts` (create — the file currently has no test)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `formatPurchaseRef(year: number, seq: number): string`
  - `nextRefCounter(current: RefCounters | undefined, year: number): { counters: RefCounters; seq: number }`
  - `interface RefCounters { [year: string]: number }`
  - `validateGstNumber(value: string): boolean` from `@/lib/validation`

Task 9 stores `RefCounters` at `purchaseCounters/{shopId}` and calls `nextRefCounter` inside the create transaction.

**Amended during execution.** The original design kept a single `{ year, seq }` counter that reset the sequence on any year change. Review found that re-issues a reference when backdated and current-year entries interleave: 2026 entries reach seq 5, one backdated 2025 entry resets the counter to `{2025, 1}`, and the next 2026 entry resets it again to `{2026, 1}` — minting `PUR-2026-0001` twice. The counter is therefore a **map of year to last-issued sequence**, so every year keeps its own high-water mark.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/purchaseRef.test.ts
import { describe, expect, it } from "vitest";

import { formatPurchaseRef, nextRefCounter } from "@/lib/purchaseRef";

describe("formatPurchaseRef", () => {
  it("pads the sequence to four digits", () => {
    expect(formatPurchaseRef(2026, 12)).toBe("PUR-2026-0012");
  });

  it("pads the first reference of a year", () => {
    expect(formatPurchaseRef(2026, 1)).toBe("PUR-2026-0001");
  });

  it("does not truncate a sequence beyond four digits", () => {
    expect(formatPurchaseRef(2026, 12345)).toBe("PUR-2026-12345");
  });
});

describe("nextRefCounter", () => {
  it("starts at 1 when no counter exists yet", () => {
    expect(nextRefCounter(undefined, 2026)).toEqual({ counters: { "2026": 1 }, seq: 1 });
  });

  it("increments within the same year", () => {
    expect(nextRefCounter({ "2026": 11 }, 2026)).toEqual({
      counters: { "2026": 12 },
      seq: 12,
    });
  });

  it("starts a new year at 1 without disturbing the previous year", () => {
    expect(nextRefCounter({ "2025": 480 }, 2026)).toEqual({
      counters: { "2025": 480, "2026": 1 },
      seq: 1,
    });
  });

  it("continues a backdated year's own run rather than restarting it", () => {
    expect(nextRefCounter({ "2025": 480, "2026": 5 }, 2025)).toEqual({
      counters: { "2025": 481, "2026": 5 },
      seq: 481,
    });
  });

  it("never re-issues a reference when backdated and current entries interleave", () => {
    // The regression this design exists for.
    let counters: RefCounters | undefined;
    const issued: string[] = [];

    for (const year of [2026, 2026, 2026, 2025, 2026]) {
      const next = nextRefCounter(counters, year);
      counters = next.counters;
      issued.push(formatPurchaseRef(year, next.seq));
    }

    expect(issued).toEqual([
      "PUR-2026-0001",
      "PUR-2026-0002",
      "PUR-2026-0003",
      "PUR-2025-0001",
      "PUR-2026-0004",
    ]);
    expect(new Set(issued).size).toBe(issued.length);
  });
});
```

```typescript
// src/lib/validation.test.ts
import { describe, expect, it } from "vitest";

import { validateGstNumber } from "@/lib/validation";

describe("validateGstNumber", () => {
  it("accepts a well-formed 15-character GSTIN", () => {
    expect(validateGstNumber("29ABCDE1234F1Z5")).toBe(true);
  });

  it("accepts lowercase input", () => {
    expect(validateGstNumber("29abcde1234f1z5")).toBe(true);
  });

  it("tolerates surrounding whitespace", () => {
    expect(validateGstNumber("  29ABCDE1234F1Z5  ")).toBe(true);
  });

  it("rejects the wrong length", () => {
    expect(validateGstNumber("29ABCDE1234F1Z")).toBe(false);
  });

  it("rejects a non-numeric state code", () => {
    expect(validateGstNumber("2XABCDE1234F1Z5")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateGstNumber("")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/purchaseRef.test.ts src/lib/validation.test.ts`
Expected: FAIL — cannot resolve `@/lib/purchaseRef`; `validateGstNumber is not a function`.

- [ ] **Step 3: Write the implementations**

```typescript
// src/lib/purchaseRef.ts

/** Last-issued sequence per year, e.g. `{ "2025": 480, "2026": 12 }`. */
export interface RefCounters {
  [year: string]: number;
}

/** "PUR-2026-0012". Four-digit padding is a minimum, not a cap. */
export function formatPurchaseRef(year: number, seq: number): string {
  return `PUR-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Advances the sequence for `year` alone, leaving every other year's
 * high-water mark intact. Keeping one counter per year is what makes the
 * reference safe under backdating: entering a December bill in January
 * continues December's run, and the next current-year entry still picks up
 * where the current year left off, so no reference is ever re-issued.
 */
export function nextRefCounter(
  current: RefCounters | undefined,
  year: number
): { counters: RefCounters; seq: number } {
  const seq = (current?.[String(year)] ?? 0) + 1;
  return { counters: { ...current, [String(year)]: seq }, seq };
}
```

Append to `src/lib/validation.ts`:

```typescript
/**
 * Indian GSTIN: 2-digit state code, 10-character PAN, entity digit,
 * a literal "Z", then a checksum character. Format only — the checksum digit
 * itself is not verified, which is the usual trade-off for data entry.
 */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstNumber(value: string): boolean {
  return GSTIN_PATTERN.test(value.trim().toUpperCase());
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/purchaseRef.test.ts src/lib/validation.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/purchaseRef.ts src/lib/purchaseRef.test.ts src/lib/validation.ts src/lib/validation.test.ts
git commit -m "feat: add purchase reference numbering and GSTIN validation"
```

---

### Task 6: Request validation

**Files:**
- Create: `src/lib/purchaseValidation.ts`
- Test: `src/lib/purchaseValidation.test.ts`

**Interfaces:**
- Consumes: `ApiError` from `@/lib/apiAuth`; `computeTotals` from `@/lib/purchaseTotals`; `validatePhone`, `validateGstNumber` from `@/lib/validation`; `PurchasePaymentMethod` from `@/types/purchase`.
- Produces:
  - `parseCreateSupplierInput(body: unknown): CreateSupplierInput`
  - `parseUpdateSupplierInput(body: unknown): UpdateSupplierInput`
  - `parseCreatePurchaseInput(body: unknown): CreatePurchaseInput`
  - `parseUpdatePurchaseInput(body: unknown): CreatePurchaseInput` (same shape; the repo decides whether editing is allowed)
  - `parseRecordPaymentInput(body: unknown): RecordPaymentInput`
  - `parseCancelPurchaseInput(body: unknown): { reason: string }`
  - Input interfaces listed in Step 3.

This module mirrors `technicianValidation.ts` exactly: small private helpers, `ApiError(400, ...)` on every failure, and no I/O. Follow its shape rather than inventing a new one.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/purchaseValidation.test.ts
import { describe, expect, it } from "vitest";

import {
  parseCancelPurchaseInput,
  parseCreatePurchaseInput,
  parseCreateSupplierInput,
  parseRecordPaymentInput,
} from "@/lib/purchaseValidation";

function validPurchaseBody(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: "sup-1",
    purchaseDate: "2026-08-05T00:00:00.000Z",
    items: [{ name: "Display", quantity: 3, purchasePrice: 1800 }],
    discount: { mode: "amount", value: 0 },
    gstRate: 18,
    transportCharge: 0,
    initialPayment: { amount: 1000, method: "upi", paidAt: "2026-08-05T00:00:00.000Z" },
    ...overrides,
  };
}

describe("parseCreateSupplierInput", () => {
  it("accepts a minimal supplier", () => {
    const input = parseCreateSupplierInput({
      name: "  ABC Mobiles  ",
      contactPerson: "Rahul",
      phone: "9876543210",
    });
    expect(input.name).toBe("ABC Mobiles");
    expect(input.status).toBe("active");
  });

  it("rejects a missing name", () => {
    expect(() => parseCreateSupplierInput({ contactPerson: "R", phone: "9876543210" })).toThrow(
      /name is required/i
    );
  });

  it("rejects an invalid phone", () => {
    expect(() =>
      parseCreateSupplierInput({ name: "ABC", contactPerson: "R", phone: "123" })
    ).toThrow(/valid phone/i);
  });

  it("rejects a malformed GST number when one is supplied", () => {
    expect(() =>
      parseCreateSupplierInput({
        name: "ABC",
        contactPerson: "R",
        phone: "9876543210",
        gstNumber: "NOTAGST",
      })
    ).toThrow(/valid GST/i);
  });

  it("accepts an omitted GST number", () => {
    const input = parseCreateSupplierInput({
      name: "ABC",
      contactPerson: "R",
      phone: "9876543210",
    });
    expect(input.gstNumber).toBeUndefined();
  });
});

describe("parseCreatePurchaseInput", () => {
  it("accepts a valid purchase", () => {
    const input = parseCreatePurchaseInput(validPurchaseBody());
    expect(input.supplierId).toBe("sup-1");
    expect(input.items).toHaveLength(1);
    expect(input.items[0].quantity).toBe(3);
  });

  it("rejects a missing supplier", () => {
    expect(() => parseCreatePurchaseInput(validPurchaseBody({ supplierId: "" }))).toThrow(
      /supplierId is required/i
    );
  });

  it("rejects an empty item list", () => {
    expect(() => parseCreatePurchaseInput(validPurchaseBody({ items: [] }))).toThrow(
      /at least one item/i
    );
  });

  it("rejects an item with a blank name", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({ items: [{ name: "  ", quantity: 1, purchasePrice: 10 }] })
      )
    ).toThrow(/item name is required/i);
  });

  it("rejects a quantity below 1", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({ items: [{ name: "Display", quantity: 0, purchasePrice: 10 }] })
      )
    ).toThrow(/quantity must be at least 1/i);
  });

  it("rejects a fractional quantity", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({ items: [{ name: "Display", quantity: 1.5, purchasePrice: 10 }] })
      )
    ).toThrow(/whole number/i);
  });

  it("rejects a negative purchase price", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({ items: [{ name: "Display", quantity: 1, purchasePrice: -5 }] })
      )
    ).toThrow(/purchase price cannot be negative/i);
  });

  it("rejects a discount larger than the subtotal", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({ discount: { mode: "amount", value: 99999 } })
      )
    ).toThrow(/discount cannot exceed/i);
  });

  it("rejects a GST rate above 28", () => {
    expect(() => parseCreatePurchaseInput(validPurchaseBody({ gstRate: 30 }))).toThrow(
      /GST rate must be between 0 and 28/i
    );
  });

  it("rejects a negative transport charge", () => {
    expect(() => parseCreatePurchaseInput(validPurchaseBody({ transportCharge: -1 }))).toThrow(
      /transport charge cannot be negative/i
    );
  });

  it("rejects an initial payment larger than the grand total", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({
          initialPayment: { amount: 999999, method: "cash", paidAt: "2026-08-05T00:00:00.000Z" },
        })
      )
    ).toThrow(/cannot exceed the grand total/i);
  });

  it("rejects an unknown payment method", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({
          initialPayment: { amount: 10, method: "credit", paidAt: "2026-08-05T00:00:00.000Z" },
        })
      )
    ).toThrow(/payment method/i);
  });

  it("requires a due date when there is no initial payment", () => {
    expect(() =>
      parseCreatePurchaseInput(validPurchaseBody({ initialPayment: undefined }))
    ).toThrow(/due date is required/i);
  });

  it("accepts a credit purchase that supplies a due date", () => {
    const input = parseCreatePurchaseInput(
      validPurchaseBody({
        initialPayment: undefined,
        dueDate: "2026-09-05T00:00:00.000Z",
      })
    );
    expect(input.initialPayment).toBeUndefined();
    expect(input.dueDate).toBeInstanceOf(Date);
  });

  it("rejects a due date before the purchase date", () => {
    expect(() =>
      parseCreatePurchaseInput(
        validPurchaseBody({
          initialPayment: undefined,
          dueDate: "2026-08-01T00:00:00.000Z",
        })
      )
    ).toThrow(/due date cannot be before/i);
  });

  it("rejects an unparseable purchase date", () => {
    expect(() => parseCreatePurchaseInput(validPurchaseBody({ purchaseDate: "yesterday" }))).toThrow(
      /valid purchase date/i
    );
  });
});

describe("parseRecordPaymentInput", () => {
  it("accepts a valid payment", () => {
    const input = parseRecordPaymentInput({
      amount: 2500,
      method: "upi",
      paidAt: "2026-08-05T00:00:00.000Z",
      reference: "UPI-4587963210",
    });
    expect(input.amount).toBe(2500);
    expect(input.method).toBe("upi");
    expect(input.reference).toBe("UPI-4587963210");
  });

  it("rejects a zero amount", () => {
    expect(() =>
      parseRecordPaymentInput({ amount: 0, method: "cash", paidAt: "2026-08-05T00:00:00.000Z" })
    ).toThrow(/greater than zero/i);
  });

  it("rejects a negative amount", () => {
    expect(() =>
      parseRecordPaymentInput({ amount: -100, method: "cash", paidAt: "2026-08-05T00:00:00.000Z" })
    ).toThrow(/greater than zero/i);
  });
});

describe("parseCancelPurchaseInput", () => {
  it("requires a reason", () => {
    expect(() => parseCancelPurchaseInput({ reason: "   " })).toThrow(/reason is required/i);
  });

  it("trims an accepted reason", () => {
    expect(parseCancelPurchaseInput({ reason: "  wrong supplier  " }).reason).toBe(
      "wrong supplier"
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/purchaseValidation.test.ts`
Expected: FAIL — cannot resolve `@/lib/purchaseValidation`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/purchaseValidation.ts
import { ApiError } from "@/lib/apiAuth";
import { computeTotals } from "@/lib/purchaseTotals";
import { validateGstNumber, validatePhone } from "@/lib/validation";
import type { PurchasePaymentMethod, SupplierStatus } from "@/types/purchase";

export interface CreateSupplierInput {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  status: SupplierStatus;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export interface PurchaseItemInput {
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  remarks?: string;
  serviceId?: string;
  serviceRef?: string;
}

export interface RecordPaymentInput {
  amount: number;
  method: PurchasePaymentMethod;
  paidAt: Date;
  reference?: string;
  notes?: string;
}

export interface CreatePurchaseInput {
  supplierId: string;
  supplierInvoiceNo?: string;
  purchaseDate: Date;
  items: PurchaseItemInput[];
  discount: { mode: "amount" | "percent"; value: number };
  gstRate: number;
  transportCharge: number;
  dueDate?: Date;
  /** Absent means the bill was raised on credit. */
  initialPayment?: RecordPaymentInput;
}

const PAYMENT_METHODS: readonly PurchasePaymentMethod[] = ["cash", "upi", "bank"];
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function asObject(body: unknown, label = "Request body"): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError(400, `${label} must be an object`);
  }
  return body as Record<string, unknown>;
}

function requireString(raw: Record<string, unknown>, field: string): string {
  const value = raw[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, `${field} is required`);
  }
  return value.trim();
}

function optionalString(raw: Record<string, unknown>, field: string): string | undefined {
  const value = raw[field];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${field} must be text`);
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function requireNumber(raw: Record<string, unknown>, field: string, label: string): number {
  const value = raw[field];
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    throw new ApiError(400, `${label} must be a number`);
  }
  return parsed;
}

function optionalNumber(raw: Record<string, unknown>, field: string, label: string): number | undefined {
  if (raw[field] === undefined || raw[field] === null || raw[field] === "") return undefined;
  return requireNumber(raw, field, label);
}

function requireDate(raw: Record<string, unknown>, field: string, label: string): Date {
  const value = raw[field];
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new ApiError(400, `A valid ${label} is required`);
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `A valid ${label} is required`);
  }
  return parsed;
}

function optionalDate(raw: Record<string, unknown>, field: string, label: string): Date | undefined {
  if (raw[field] === undefined || raw[field] === null || raw[field] === "") return undefined;
  return requireDate(raw, field, label);
}

function parsePaymentMethod(value: unknown): PurchasePaymentMethod {
  if (typeof value !== "string" || !PAYMENT_METHODS.includes(value as PurchasePaymentMethod)) {
    throw new ApiError(400, "payment method must be cash, upi or bank");
  }
  return value as PurchasePaymentMethod;
}

function parseSupplierFields(raw: Record<string, unknown>): Omit<CreateSupplierInput, "status"> {
  const phone = requireString(raw, "phone");
  if (!validatePhone(phone)) {
    throw new ApiError(400, "A valid phone number is required");
  }
  // The shared validatePhone has no minimum length, and a supplier you cannot
  // dial is not a usable supplier. Enforced here rather than in the shared
  // validator so technician and registration flows keep their looser rule.
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    throw new ApiError(400, "A valid phone number is required");
  }

  const email = optionalString(raw, "email");
  if (email && !EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "A valid email address is required");
  }

  const gstNumber = optionalString(raw, "gstNumber");
  if (gstNumber && !validateGstNumber(gstNumber)) {
    throw new ApiError(400, "A valid GST number is required");
  }

  return {
    name: requireString(raw, "name"),
    contactPerson: requireString(raw, "contactPerson"),
    phone,
    email,
    gstNumber: gstNumber?.toUpperCase(),
    address: optionalString(raw, "address"),
  };
}

export function parseCreateSupplierInput(body: unknown): CreateSupplierInput {
  const raw = asObject(body);
  return { ...parseSupplierFields(raw), status: "active" };
}

export function parseUpdateSupplierInput(body: unknown): UpdateSupplierInput {
  const raw = asObject(body);
  const status = raw.status;
  if (status !== undefined && status !== "active" && status !== "inactive") {
    throw new ApiError(400, "status must be active or inactive");
  }

  // Reuses the same field rules so an update cannot bypass them.
  const fields = parseSupplierFields(raw);
  return status === undefined ? fields : { ...fields, status };
}

function parseItem(value: unknown, index: number): PurchaseItemInput {
  const raw = asObject(value, `Item ${index + 1}`);

  const name = raw.name;
  if (typeof name !== "string" || name.trim() === "") {
    throw new ApiError(400, `Item ${index + 1}: item name is required`);
  }

  const quantity = requireNumber(raw, "quantity", `Item ${index + 1} quantity`);
  if (!Number.isInteger(quantity)) {
    throw new ApiError(400, `Item ${index + 1}: quantity must be a whole number`);
  }
  if (quantity < 1) {
    throw new ApiError(400, `Item ${index + 1}: quantity must be at least 1`);
  }

  const purchasePrice = requireNumber(raw, "purchasePrice", `Item ${index + 1} purchase price`);
  if (purchasePrice < 0) {
    throw new ApiError(400, `Item ${index + 1}: purchase price cannot be negative`);
  }

  const sellingPrice = optionalNumber(raw, "sellingPrice", `Item ${index + 1} selling price`);
  if (sellingPrice !== undefined && sellingPrice < 0) {
    throw new ApiError(400, `Item ${index + 1}: selling price cannot be negative`);
  }

  const warrantyMonths = optionalNumber(raw, "warrantyMonths", `Item ${index + 1} warranty`);
  if (warrantyMonths !== undefined && (warrantyMonths < 0 || !Number.isInteger(warrantyMonths))) {
    throw new ApiError(400, `Item ${index + 1}: warranty must be a whole number of months`);
  }

  return {
    name: name.trim(),
    brand: optionalString(raw, "brand"),
    model: optionalString(raw, "model"),
    quantity,
    purchasePrice,
    sellingPrice,
    warrantyMonths,
    remarks: optionalString(raw, "remarks"),
    serviceId: optionalString(raw, "serviceId"),
    serviceRef: optionalString(raw, "serviceRef"),
  };
}

function parsePaymentFields(raw: Record<string, unknown>): RecordPaymentInput {
  const amount = requireNumber(raw, "amount", "Payment amount");
  if (amount <= 0) {
    throw new ApiError(400, "Payment amount must be greater than zero");
  }

  return {
    amount,
    method: parsePaymentMethod(raw.method),
    paidAt: requireDate(raw, "paidAt", "payment date"),
    reference: optionalString(raw, "reference"),
    notes: optionalString(raw, "notes"),
  };
}

export function parseRecordPaymentInput(body: unknown): RecordPaymentInput {
  return parsePaymentFields(asObject(body));
}

export function parseCreatePurchaseInput(body: unknown): CreatePurchaseInput {
  const raw = asObject(body);

  const supplierId = requireString(raw, "supplierId");
  const purchaseDate = requireDate(raw, "purchaseDate", "purchase date");

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    throw new ApiError(400, "A purchase needs at least one item");
  }
  const items = raw.items.map(parseItem);

  const discountRaw = asObject(raw.discount ?? { mode: "amount", value: 0 }, "discount");
  const discountMode = discountRaw.mode === "percent" ? "percent" : "amount";
  const discountValue = requireNumber(discountRaw, "value", "Discount");
  if (discountValue < 0) {
    throw new ApiError(400, "Discount cannot be negative");
  }
  if (discountMode === "percent" && discountValue > 100) {
    throw new ApiError(400, "Discount cannot exceed 100%");
  }

  const gstRate = raw.gstRate === undefined ? 0 : requireNumber(raw, "gstRate", "GST rate");
  if (gstRate < 0 || gstRate > 28) {
    throw new ApiError(400, "GST rate must be between 0 and 28");
  }

  const transportCharge =
    raw.transportCharge === undefined ? 0 : requireNumber(raw, "transportCharge", "Transport charge");
  if (transportCharge < 0) {
    throw new ApiError(400, "Transport charge cannot be negative");
  }

  const discount = { mode: discountMode as "amount" | "percent", value: discountValue };
  const totals = computeTotals({ items, discount, gstRate, transportCharge });

  // Checked against the raw figure, because computeTotals clamps the discount
  // to the subtotal and would otherwise silently swallow the mistake.
  const rawDiscountAmount =
    discountMode === "percent" ? (totals.subtotal * discountValue) / 100 : discountValue;
  if (rawDiscountAmount > totals.subtotal) {
    throw new ApiError(400, "Discount cannot exceed the subtotal");
  }

  const initialPayment =
    raw.initialPayment === undefined || raw.initialPayment === null
      ? undefined
      : parsePaymentFields(asObject(raw.initialPayment, "initialPayment"));

  if (initialPayment && initialPayment.amount > totals.grandTotal) {
    throw new ApiError(400, "Payment cannot exceed the grand total");
  }

  const dueDate = optionalDate(raw, "dueDate", "due date");
  if (!initialPayment && !dueDate) {
    throw new ApiError(400, "A due date is required for a credit purchase");
  }
  if (dueDate && dueDate.getTime() < purchaseDate.getTime()) {
    throw new ApiError(400, "Due date cannot be before the purchase date");
  }

  return {
    supplierId,
    supplierInvoiceNo: optionalString(raw, "supplierInvoiceNo"),
    purchaseDate,
    items,
    discount,
    gstRate,
    transportCharge,
    dueDate,
    initialPayment,
  };
}

/** An edit carries the same shape; whether it is permitted is the repo's call. */
export function parseUpdatePurchaseInput(body: unknown): CreatePurchaseInput {
  return parseCreatePurchaseInput(body);
}

export function parseCancelPurchaseInput(body: unknown): { reason: string } {
  const raw = asObject(body);
  const reason = raw.reason;
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new ApiError(400, "A cancellation reason is required");
  }
  return { reason: reason.trim() };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/purchaseValidation.test.ts`
Expected: PASS, 26 tests.

- [ ] **Step 5: Verify types and commit**

```bash
npm run type-check
git add src/lib/purchaseValidation.ts src/lib/purchaseValidation.test.ts
git commit -m "feat: add purchase and supplier request validation"
```

---

### Task 7: Extract and extend the Firestore test fake

**Files:**
- Create: `src/lib/testing/fakeFirestore.ts`
- Modify: `src/lib/technicianRepo.test.ts` (replace its inline fake with an import)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `createFakeFirestore(): FakeFirestoreModule`
  - `interface FakeWrite { op: "set" | "update" | "delete"; collection: string; id: string; data: Record<string, unknown> }`
  - The mocked module exposes `adminDb`, `FieldValue`, and the test hooks `__reset()`, `__seed(collection, id, data)`, `__writes(): FakeWrite[]`, `__transactionCount(): number`, `__doc(collection, id)`, `__hasKeyContaining(needle)`.

**Amended during execution.** Two additions review found necessary. (1) `__hasKeyContaining` scans the whole store keyed by `${collection}/${id}` — `technicianRepo.test.ts` depends on that reach, and narrowing it to the transaction write log silently weakens the assertion. (2) The fake **enforces Firestore's read-before-write rule**: `tx.get` after any `tx.set`/`update`/`delete` throws `FAILED_PRECONDITION`, as the real SDK does. Without it, Task 9's money-moving transaction could pass its tests and still fail in production. All 29 pre-existing technician tests pass under the rule, confirming `technicianRepo.ts` already reads before writing.

**Why this task exists:** `technicianRepo.test.ts` already contains a working in-memory Firestore fake, but it is trapped inside a `vi.mock` factory and supports only a single `.where()` with no `orderBy` or `limit`. `purchaseRepo` needs chained `where`, `orderBy` and `limit`. Extract rather than copy.

**The hoisting trap — read before writing any code.** `vi.mock` factories are hoisted above imports, so a factory **cannot** reference a module-scope variable; doing so throws "Cannot access before initialization". The only correct form is an **async factory with a dynamic `import` inside it**:

```typescript
vi.mock("@/lib/firebaseAdmin", async () => {
  const { createFakeFirestore } = await import("@/lib/testing/fakeFirestore");
  return createFakeFirestore();
});
```

- [ ] **Step 1: Write the failing test for the fake itself**

```typescript
// src/lib/testing/fakeFirestore.test.ts
import { beforeEach, describe, expect, it } from "vitest";

import { createFakeFirestore } from "@/lib/testing/fakeFirestore";

const fake = createFakeFirestore();
const { adminDb } = fake;

beforeEach(() => fake.__reset());

describe("document access", () => {
  it("reads a seeded document", async () => {
    fake.__seed("suppliers", "s1", { name: "ABC Mobiles", shopId: "shop-1" });
    const snap = await adminDb.collection("suppliers").doc("s1").get();
    expect(snap.exists).toBe(true);
    expect(snap.data()).toEqual({ name: "ABC Mobiles", shopId: "shop-1" });
  });

  it("reports a missing document as not existing", async () => {
    const snap = await adminDb.collection("suppliers").doc("nope").get();
    expect(snap.exists).toBe(false);
    expect(snap.data()).toBeUndefined();
  });

  it("mints an id when doc() is called without one", () => {
    const a = adminDb.collection("purchases").doc();
    const b = adminDb.collection("purchases").doc();
    expect(a.id).not.toBe(b.id);
  });
});

describe("queries", () => {
  beforeEach(() => {
    fake.__seed("purchases", "p1", { shopId: "s", branchId: "b1", total: 100, date: 3 });
    fake.__seed("purchases", "p2", { shopId: "s", branchId: "b1", total: 200, date: 1 });
    fake.__seed("purchases", "p3", { shopId: "s", branchId: "b2", total: 300, date: 2 });
    fake.__seed("purchases", "p4", { shopId: "other", branchId: "b1", total: 400, date: 4 });
  });

  it("filters on a single where", async () => {
    const result = await adminDb.collection("purchases").where("shopId", "==", "s").get();
    expect(result.docs.map((d) => d.id).sort()).toEqual(["p1", "p2", "p3"]);
  });

  it("chains two wheres", async () => {
    const result = await adminDb
      .collection("purchases")
      .where("shopId", "==", "s")
      .where("branchId", "==", "b1")
      .get();
    expect(result.docs.map((d) => d.id).sort()).toEqual(["p1", "p2"]);
  });

  it("orders descending", async () => {
    const result = await adminDb
      .collection("purchases")
      .where("shopId", "==", "s")
      .orderBy("date", "desc")
      .get();
    expect(result.docs.map((d) => d.id)).toEqual(["p1", "p3", "p2"]);
  });

  it("orders ascending by default", async () => {
    const result = await adminDb.collection("purchases").where("shopId", "==", "s").orderBy("date").get();
    expect(result.docs.map((d) => d.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("limits after ordering", async () => {
    const result = await adminDb
      .collection("purchases")
      .where("shopId", "==", "s")
      .orderBy("date", "desc")
      .limit(2)
      .get();
    expect(result.docs.map((d) => d.id)).toEqual(["p1", "p3"]);
  });

  it("reports an empty result", async () => {
    const result = await adminDb.collection("purchases").where("shopId", "==", "missing").get();
    expect(result.empty).toBe(true);
    expect(result.docs).toHaveLength(0);
  });
});

describe("transactions", () => {
  it("records every write and counts one transaction", async () => {
    fake.__seed("suppliers", "s1", { outstanding: 0 });

    await adminDb.runTransaction(async (tx) => {
      const ref = adminDb.collection("purchases").doc("p1");
      tx.set(ref, { grandTotal: 500 });
      tx.update(adminDb.collection("suppliers").doc("s1"), { outstanding: 500 });
    });

    expect(fake.__transactionCount()).toBe(1);
    expect(fake.__writes()).toHaveLength(2);
    expect(fake.__doc("suppliers", "s1")).toEqual({ outstanding: 500 });
  });

  it("throws when updating a document that does not exist", async () => {
    await expect(
      adminDb.runTransaction(async (tx) => {
        tx.update(adminDb.collection("suppliers").doc("ghost"), { outstanding: 1 });
      })
    ).rejects.toThrow(/NOT_FOUND/);
  });

  it("rolls back every write when the callback throws", async () => {
    fake.__seed("suppliers", "s1", { outstanding: 0 });

    await expect(
      adminDb.runTransaction(async (tx) => {
        tx.update(adminDb.collection("suppliers").doc("s1"), { outstanding: 999 });
        throw new Error("business rule rejected");
      })
    ).rejects.toThrow("business rule rejected");

    expect(fake.__doc("suppliers", "s1")).toEqual({ outstanding: 0 });
  });
});

describe("FieldValue array operations", () => {
  it("appends with arrayUnion", async () => {
    fake.__seed("branches", "b1", { members: ["u1"] });
    await adminDb.runTransaction(async (tx) => {
      tx.update(adminDb.collection("branches").doc("b1"), {
        members: fake.FieldValue.arrayUnion("u2"),
      });
    });
    expect(fake.__doc("branches", "b1")).toEqual({ members: ["u1", "u2"] });
  });

  it("does not duplicate an existing arrayUnion value", async () => {
    fake.__seed("branches", "b1", { members: ["u1"] });
    await adminDb.runTransaction(async (tx) => {
      tx.update(adminDb.collection("branches").doc("b1"), {
        members: fake.FieldValue.arrayUnion("u1"),
      });
    });
    expect(fake.__doc("branches", "b1")).toEqual({ members: ["u1"] });
  });

  it("removes with arrayRemove", async () => {
    fake.__seed("branches", "b1", { members: ["u1", "u2"] });
    await adminDb.runTransaction(async (tx) => {
      tx.update(adminDb.collection("branches").doc("b1"), {
        members: fake.FieldValue.arrayRemove("u1"),
      });
    });
    expect(fake.__doc("branches", "b1")).toEqual({ members: ["u2"] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/testing/fakeFirestore.test.ts`
Expected: FAIL — cannot resolve `@/lib/testing/fakeFirestore`.

- [ ] **Step 3: Write the fake**

```typescript
// src/lib/testing/fakeFirestore.ts

/**
 * In-memory stand-in for the subset of firebase-admin our repos use, extracted
 * from technicianRepo.test.ts so purchaseRepo can share it. Beyond the original
 * it supports chained where(), orderBy(), limit(), and transaction rollback.
 *
 * Because vi.mock factories are hoisted above imports, they cannot close over
 * module-scope values. Always mock through an async factory with an inner
 * dynamic import:
 *
 *   vi.mock("@/lib/firebaseAdmin", async () => {
 *     const { createFakeFirestore } = await import("@/lib/testing/fakeFirestore");
 *     return createFakeFirestore();
 *   });
 */

export interface FakeWrite {
  op: "set" | "update" | "delete";
  collection: string;
  id: string;
  data: Record<string, unknown>;
}

interface ArrayOp {
  __op: "arrayUnion" | "arrayRemove";
  value: unknown;
}

interface WhereClause {
  field: string;
  value: unknown;
}

type DocData = Record<string, unknown>;

function isArrayOp(value: unknown): value is ArrayOp {
  return !!value && typeof value === "object" && "__op" in (value as DocData);
}

function applyUpdate(current: DocData | undefined, updates: DocData): DocData {
  const result: DocData = { ...(current ?? {}) };
  for (const [field, raw] of Object.entries(updates)) {
    if (!isArrayOp(raw)) {
      result[field] = raw;
      continue;
    }
    const existing = Array.isArray(result[field]) ? [...(result[field] as unknown[])] : [];
    if (raw.__op === "arrayUnion") {
      if (!existing.some((item) => JSON.stringify(item) === JSON.stringify(raw.value))) {
        existing.push(raw.value);
      }
      result[field] = existing;
    } else {
      result[field] = existing.filter(
        (item) => JSON.stringify(item) !== JSON.stringify(raw.value)
      );
    }
  }
  return result;
}

function compare(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function createFakeFirestore() {
  const store = new Map<string, DocData>();
  let autoId = 0;
  let writes: FakeWrite[] = [];
  let transactionCount = 0;

  const key = (collection: string, id: string) => `${collection}/${id}`;

  function makeDocRef(collection: string, id: string) {
    return {
      id,
      collectionName: collection,
      async get() {
        const data = store.get(key(collection, id));
        return { id, exists: data !== undefined, data: () => data };
      },
      async set(data: DocData) {
        writes.push({ op: "set", collection, id, data });
        store.set(key(collection, id), data);
      },
      async update(data: DocData) {
        const current = store.get(key(collection, id));
        if (current === undefined) {
          throw new Error(`NOT_FOUND: No document to update: ${key(collection, id)}`);
        }
        writes.push({ op: "update", collection, id, data });
        store.set(key(collection, id), applyUpdate(current, data));
      },
    };
  }

  /** A query builder that accumulates clauses and only evaluates on get(). */
  function makeQuery(
    collection: string,
    clauses: WhereClause[],
    order?: { field: string; direction: "asc" | "desc" },
    max?: number
  ) {
    const query = {
      where(field: string, _op: string, value: unknown) {
        return makeQuery(collection, [...clauses, { field, value }], order, max);
      },
      orderBy(field: string, direction: "asc" | "desc" = "asc") {
        return makeQuery(collection, clauses, { field, direction }, max);
      },
      limit(count: number) {
        return makeQuery(collection, clauses, order, count);
      },
      async get() {
        const prefix = `${collection}/`;
        let rows = [...store.entries()]
          .filter(([docKey]) => docKey.startsWith(prefix))
          .map(([docKey, data]) => ({ id: docKey.slice(prefix.length), data }))
          .filter((row) => clauses.every((clause) => row.data[clause.field] === clause.value));

        if (order) {
          const direction = order.direction === "desc" ? -1 : 1;
          rows = rows.sort(
            (a, b) => compare(a.data[order.field], b.data[order.field]) * direction
          );
        }

        if (max !== undefined) rows = rows.slice(0, max);

        const docs = rows.map((row) => ({ id: row.id, data: () => row.data }));
        return { docs, empty: docs.length === 0 };
      },
    };
    return query;
  }

  function makeCollectionRef(collection: string) {
    return {
      doc(id?: string) {
        return makeDocRef(collection, id ?? `auto-${++autoId}`);
      },
      where(field: string, op: string, value: unknown) {
        return makeQuery(collection, []).where(field, op, value);
      },
      orderBy(field: string, direction: "asc" | "desc" = "asc") {
        return makeQuery(collection, []).orderBy(field, direction);
      },
      limit(count: number) {
        return makeQuery(collection, []).limit(count);
      },
      async get() {
        return makeQuery(collection, []).get();
      },
    };
  }

  const adminDb = {
    collection: (name: string) => makeCollectionRef(name),

    async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
      transactionCount += 1;
      writes = [];

      // Snapshot for rollback: a real transaction that throws commits nothing.
      const snapshot = new Map(store);
      const staged: FakeWrite[] = [];
      let hasWritten = false;

      const tx: FakeTransaction = {
        get: async (ref: { get: () => Promise<unknown> }) => {
          // Real Firestore requires every read to precede every write in a
          // transaction, and throws FAILED_PRECONDITION otherwise. The fake
          // enforces it so a repo cannot pass its tests and fail in production.
          if (hasWritten) {
            throw new Error(
              "FAILED_PRECONDITION: Firestore transactions require all reads to be executed before all writes."
            );
          }
          return ref.get();
        },
        set: (ref, data) => {
          hasWritten = true;
          staged.push({ op: "set", collection: ref.collectionName, id: ref.id, data });
          store.set(key(ref.collectionName, ref.id), data);
        },
        update: (ref, data) => {
          const docKey = key(ref.collectionName, ref.id);
          const current = store.get(docKey);
          if (current === undefined) {
            throw new Error(`NOT_FOUND: No document to update: ${docKey}`);
          }
          // Set after the existence check, so a failed update does not wrongly
          // close the read window.
          hasWritten = true;
          staged.push({ op: "update", collection: ref.collectionName, id: ref.id, data });
          store.set(docKey, applyUpdate(current, data));
        },
        delete: (ref) => {
          hasWritten = true;
          staged.push({ op: "delete", collection: ref.collectionName, id: ref.id, data: {} });
          store.delete(key(ref.collectionName, ref.id));
        },
      };

      try {
        const result = await fn(tx);
        writes = staged;
        return result;
      } catch (error) {
        store.clear();
        for (const [k, v] of snapshot) store.set(k, v);
        writes = [];
        throw error;
      }
    },
  };

  const FieldValue = {
    arrayUnion: (value: unknown): ArrayOp => ({ __op: "arrayUnion", value }),
    arrayRemove: (value: unknown): ArrayOp => ({ __op: "arrayRemove", value }),
    serverTimestamp: () => new Date(),
  };

  return {
    adminDb,
    FieldValue,
    __reset() {
      store.clear();
      writes = [];
      transactionCount = 0;
      autoId = 0;
    },
    __seed(collection: string, id: string, data: DocData) {
      store.set(key(collection, id), data);
    },
    __doc(collection: string, id: string): DocData | undefined {
      return store.get(key(collection, id));
    },
    /**
     * True when any document key — `${collection}/${id}` — contains `needle`.
     * Scans the whole store rather than the write log, so it catches a stray
     * document whatever wrote it and whenever.
     */
    __hasKeyContaining(needle: string): boolean {
      return [...store.keys()].some((key) => key.includes(needle));
    },
    __writes(): FakeWrite[] {
      return [...writes];
    },
    __transactionCount(): number {
      return transactionCount;
    },
  };
}

interface FakeDocRef {
  collectionName: string;
  id: string;
}

export interface FakeTransaction {
  get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
  set: (ref: FakeDocRef, data: Record<string, unknown>) => void;
  update: (ref: FakeDocRef, data: Record<string, unknown>) => void;
  delete: (ref: FakeDocRef) => void;
}

export type FakeFirestore = ReturnType<typeof createFakeFirestore>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/testing/fakeFirestore.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 5: Rewire `technicianRepo.test.ts` to the shared fake**

Delete the inline `applyUpdate`, `isArrayOp`, `ArrayOp` and the entire `vi.mock("@/lib/firebaseAdmin", () => {...})` factory from the top of `src/lib/technicianRepo.test.ts`, and replace them with:

```typescript
import { createFakeFirestore } from "@/lib/testing/fakeFirestore";

const fake = createFakeFirestore();

vi.mock("@/lib/firebaseAdmin", async () => {
  const { createFakeFirestore: create } = await import("@/lib/testing/fakeFirestore");
  return create();
});
```

Then, wherever the existing tests reach into the old fake's hooks (`__reset`, seeding, write assertions), point them at the mocked module instead:

```typescript
import * as firebaseAdmin from "@/lib/firebaseAdmin";

type TestHooks = {
  __reset: () => void;
  __seed: (collection: string, id: string, data: Record<string, unknown>) => void;
  __doc: (collection: string, id: string) => Record<string, unknown> | undefined;
  __writes: () => Array<{ op: string; collection: string; id: string }>;
  __transactionCount: () => number;
};

const hooks = firebaseAdmin as unknown as TestHooks;
```

Leave `const fake = createFakeFirestore();` out if it ends up unused — the mocked module instance is the one the repo actually talks to.

- [ ] **Step 6: Run the whole suite to prove nothing regressed**

Run: `npm test`
Expected: PASS. `technicianRepo.test.ts` must have the same test count and all green as before this task. If any technician test fails, the extraction changed behavior — fix the fake, not the test.

- [ ] **Step 7: Commit**

```bash
git add src/lib/testing/fakeFirestore.ts src/lib/testing/fakeFirestore.test.ts src/lib/technicianRepo.test.ts
git commit -m "refactor: extract and extend the Firestore test fake"
```

---

### Task 8: Supplier repository

**Files:**
- Create: `src/lib/supplierRepo.ts`
- Test: `src/lib/supplierRepo.test.ts`

**Interfaces:**
- Consumes: `adminDb` from `@/lib/firebaseAdmin`; `ApiError` from `@/lib/apiAuth`; `CreateSupplierInput`, `UpdateSupplierInput` from `@/lib/purchaseValidation`; `Supplier` from `@/types/purchase`.
- Produces:
  - `const SUPPLIERS = "suppliers"`
  - `mapSupplier(id: string, data: Record<string, unknown>): Supplier`
  - `toDate(value: unknown): Date` and `toOptionalDate(value: unknown): Date | undefined` (Task 9 imports both)
  - `assertSupplierInShop(data: Record<string, unknown> | undefined, shopId: string, supplierId: string): void` — takes the document **data**, not a snapshot, so it works identically inside and outside a transaction
  - `listSuppliers(shopId: string): Promise<Supplier[]>`
  - `getSupplier(shopId: string, id: string): Promise<Supplier>`
  - `createSupplier(input: CreateSupplierInput & { shopId: string; createdBy: string }): Promise<Supplier>`
  - `updateSupplier(shopId: string, id: string, input: UpdateSupplierInput): Promise<Supplier>`

Note the deliberate omission: **there is no `updateSupplierTotals` export.** Totals are mutated only inside `purchaseRepo`'s transactions, so no caller can move them independently of a purchase.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/supplierRepo.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseAdmin", async () => {
  const { createFakeFirestore } = await import("@/lib/testing/fakeFirestore");
  return createFakeFirestore();
});

import * as firebaseAdmin from "@/lib/firebaseAdmin";
import {
  createSupplier,
  getSupplier,
  listSuppliers,
  mapSupplier,
  updateSupplier,
} from "@/lib/supplierRepo";

type TestHooks = {
  __reset: () => void;
  __seed: (collection: string, id: string, data: Record<string, unknown>) => void;
  __doc: (collection: string, id: string) => Record<string, unknown> | undefined;
};
const hooks = firebaseAdmin as unknown as TestHooks;

const baseInput = {
  name: "ABC Mobiles",
  contactPerson: "Rahul",
  phone: "9876543210",
  status: "active" as const,
  shopId: "shop-1",
  createdBy: "user-1",
};

beforeEach(() => hooks.__reset());

describe("createSupplier", () => {
  it("stores the supplier with zeroed running totals", async () => {
    const supplier = await createSupplier(baseInput);

    expect(supplier.name).toBe("ABC Mobiles");
    expect(supplier.shopId).toBe("shop-1");
    expect(supplier.totalPurchased).toBe(0);
    expect(supplier.totalPaid).toBe(0);
    expect(supplier.outstanding).toBe(0);
    expect(supplier.status).toBe("active");
  });

  it("persists the document under the suppliers collection", async () => {
    const supplier = await createSupplier(baseInput);
    expect(hooks.__doc("suppliers", supplier.id)).toBeDefined();
  });
});

describe("listSuppliers", () => {
  it("returns only this shop's suppliers", async () => {
    await createSupplier(baseInput);
    await createSupplier({ ...baseInput, name: "Other Shop Vendor", shopId: "shop-2" });

    const suppliers = await listSuppliers("shop-1");
    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toBe("ABC Mobiles");
  });

  it("sorts by name", async () => {
    await createSupplier({ ...baseInput, name: "Zenith Spares" });
    await createSupplier({ ...baseInput, name: "ABC Mobiles" });

    const suppliers = await listSuppliers("shop-1");
    expect(suppliers.map((s) => s.name)).toEqual(["ABC Mobiles", "Zenith Spares"]);
  });

  it("returns an empty array when the shop has no suppliers", async () => {
    expect(await listSuppliers("shop-1")).toEqual([]);
  });
});

describe("getSupplier", () => {
  it("returns the supplier", async () => {
    const created = await createSupplier(baseInput);
    expect((await getSupplier("shop-1", created.id)).name).toBe("ABC Mobiles");
  });

  it("404s for a missing supplier", async () => {
    await expect(getSupplier("shop-1", "ghost")).rejects.toMatchObject({ status: 404 });
  });

  it("403s for a supplier belonging to another shop", async () => {
    const created = await createSupplier(baseInput);
    await expect(getSupplier("shop-2", created.id)).rejects.toMatchObject({ status: 403 });
  });

  it("fails closed on a supplier document with no shopId", async () => {
    hooks.__seed("suppliers", "legacy", { name: "Legacy Vendor" });
    await expect(getSupplier("shop-1", "legacy")).rejects.toMatchObject({ status: 403 });
  });
});

describe("updateSupplier", () => {
  it("changes editable fields", async () => {
    const created = await createSupplier(baseInput);
    const updated = await updateSupplier("shop-1", created.id, { phone: "9000011122" });
    expect(updated.phone).toBe("9000011122");
  });

  it("cannot overwrite the running totals even if they are passed in", async () => {
    const created = await createSupplier(baseInput);
    await updateSupplier("shop-1", created.id, {
      outstanding: 999999,
      totalPurchased: 999999,
    } as never);

    const after = await getSupplier("shop-1", created.id);
    expect(after.outstanding).toBe(0);
    expect(after.totalPurchased).toBe(0);
  });

  it("403s across shops", async () => {
    const created = await createSupplier(baseInput);
    await expect(updateSupplier("shop-2", created.id, { phone: "9000011122" })).rejects.toMatchObject(
      { status: 403 }
    );
  });
});

describe("mapSupplier", () => {
  it("defaults absent running totals to 0 rather than undefined", () => {
    const supplier = mapSupplier("s1", { name: "ABC", shopId: "shop-1" });
    expect(supplier.totalPurchased).toBe(0);
    expect(supplier.outstanding).toBe(0);
    expect(supplier.status).toBe("active");
  });

  it("converts Firestore timestamps to Dates", () => {
    const stamp = { toDate: () => new Date(2026, 7, 5) };
    const supplier = mapSupplier("s1", { shopId: "shop-1", createdAt: stamp, lastPurchaseAt: stamp });
    expect(supplier.createdAt).toBeInstanceOf(Date);
    expect(supplier.lastPurchaseAt).toBeInstanceOf(Date);
  });

  it("leaves lastPurchaseAt undefined when absent", () => {
    expect(mapSupplier("s1", { shopId: "shop-1" }).lastPurchaseAt).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/supplierRepo.test.ts`
Expected: FAIL — cannot resolve `@/lib/supplierRepo`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/supplierRepo.ts
import { ApiError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import type { CreateSupplierInput, UpdateSupplierInput } from "@/lib/purchaseValidation";
import type { Supplier } from "@/types/purchase";

export const SUPPLIERS = "suppliers";

export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function toOptionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === null) return undefined;
  return toDate(value);
}

/**
 * `adminDb` bypasses firestore.rules, so this is the only thing standing
 * between a caller and another shop's supplier. Fails closed on a document
 * with no `shopId`: ownership that cannot be established is not ours.
 */
export function assertSupplierInShop(
  data: Record<string, unknown> | undefined,
  shopId: string,
  supplierId: string
): void {
  if (!data?.shopId || data.shopId !== shopId) {
    throw new ApiError(403, `Supplier ${supplierId} does not belong to this shop`);
  }
}

/** The single Firestore -> Supplier mapper for the whole codebase. */
export function mapSupplier(id: string, data: Record<string, unknown>): Supplier {
  return {
    id,
    shopId: (data.shopId as string) || "",
    name: (data.name as string) || "",
    contactPerson: (data.contactPerson as string) || "",
    phone: (data.phone as string) || "",
    email: (data.email as string) || undefined,
    gstNumber: (data.gstNumber as string) || undefined,
    address: (data.address as string) || undefined,
    status: (data.status as Supplier["status"]) || "active",
    totalPurchased: (data.totalPurchased as number) || 0,
    totalPaid: (data.totalPaid as number) || 0,
    outstanding: (data.outstanding as number) || 0,
    lastPurchaseAt: toOptionalDate(data.lastPurchaseAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: (data.createdBy as string) || "",
  };
}

export async function listSuppliers(shopId: string): Promise<Supplier[]> {
  const snap = await adminDb.collection(SUPPLIERS).where("shopId", "==", shopId).get();
  return snap.docs
    .map((doc) => mapSupplier(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSupplier(shopId: string, id: string): Promise<Supplier> {
  const snap = await adminDb.collection(SUPPLIERS).doc(id).get();
  if (!snap.exists) {
    throw new ApiError(404, "Supplier not found");
  }
  const data = snap.data() as Record<string, unknown>;
  assertSupplierInShop(data, shopId, id);
  return mapSupplier(id, data);
}

export async function createSupplier(
  input: CreateSupplierInput & { shopId: string; createdBy: string }
): Promise<Supplier> {
  const now = new Date();
  const ref = adminDb.collection(SUPPLIERS).doc();

  const data: Record<string, unknown> = {
    shopId: input.shopId,
    name: input.name,
    contactPerson: input.contactPerson,
    phone: input.phone,
    email: input.email ?? null,
    gstNumber: input.gstNumber ?? null,
    address: input.address ?? null,
    status: input.status,
    // Running totals always start at zero; only purchaseRepo moves them.
    totalPurchased: 0,
    totalPaid: 0,
    outstanding: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  };

  await ref.set(data);
  return mapSupplier(ref.id, data);
}

/**
 * Editable profile fields only. `totalPurchased`, `totalPaid`, `outstanding`
 * and `lastPurchaseAt` are intentionally unreachable here — they are derived
 * from purchases, and letting an update body set them would let the UI
 * fabricate a balance.
 */
export async function updateSupplier(
  shopId: string,
  id: string,
  input: UpdateSupplierInput
): Promise<Supplier> {
  const ref = adminDb.collection(SUPPLIERS).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new ApiError(404, "Supplier not found");
  }
  const current = snap.data() as Record<string, unknown>;
  assertSupplierInShop(current, shopId, id);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const editable = [
    "name",
    "contactPerson",
    "phone",
    "email",
    "gstNumber",
    "address",
    "status",
  ] as const;

  for (const field of editable) {
    const value = input[field];
    if (value !== undefined) updates[field] = value;
  }

  await ref.update(updates);
  return mapSupplier(id, { ...current, ...updates });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/supplierRepo.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
npm run type-check
git add src/lib/supplierRepo.ts src/lib/supplierRepo.test.ts
git commit -m "feat: add supplier repository"
```

---

### Task 9: Purchase repository

This is the task that protects money. Every supplier-total mutation lives here and nowhere else.

**Files:**
- Create: `src/lib/purchaseRepo.ts`
- Test: `src/lib/purchaseRepo.test.ts`

**Interfaces:**
- Consumes: `adminDb`; `ApiError`; `computeTotals`, `lineTotalOf`, `roundMoney` from `@/lib/purchaseTotals`; `summarizePayments` from `@/lib/purchasePayments`; `formatPurchaseRef`, `nextRefCounter` from `@/lib/purchaseRef`; `SUPPLIERS`, `assertSupplierInShop`, `toDate`, `toOptionalDate` from `@/lib/supplierRepo`; `CreatePurchaseInput`, `RecordPaymentInput` from `@/lib/purchaseValidation`; `Purchase` from `@/types/purchase`.
- Produces:
  - `const PURCHASES = "purchases"`, `const PURCHASE_COUNTERS = "purchaseCounters"`
  - `mapPurchase(id: string, data: Record<string, unknown>): Purchase`
  - `listPurchases(scope: { shopId: string; branchId?: string; supplierId?: string; includeCancelled?: boolean }): Promise<Purchase[]>`
  - `getPurchase(shopId: string, id: string): Promise<Purchase>`
  - `createPurchase(input: CreatePurchaseInput & { shopId: string; branchId: string; purchasedBy: { userId: string; name: string } }): Promise<Purchase>`
  - `updatePurchase(shopId: string, id: string, input: CreatePurchaseInput): Promise<Purchase>`
  - `recordPurchasePayment(shopId: string, id: string, input: RecordPaymentInput, recordedBy: string): Promise<Purchase>`
  - `cancelPurchase(shopId: string, id: string, reason: string): Promise<Purchase>`
  - `listItemSuggestions(shopId: string): Promise<{ names: string[]; brands: string[]; models: string[] }>`
  - `supplierInvoiceNoExists(shopId: string, supplierId: string, invoiceNo: string): Promise<boolean>`

**On the concurrency test:** the fake serializes transactions, so the "concurrent payment" test drives two sequential calls. That verifies the overdraw *guard* and that the balance is re-read inside the transaction — it does not simulate true contention, which only a real Firestore can. Do not claim more than that in comments.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/purchaseRepo.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseAdmin", async () => {
  const { createFakeFirestore } = await import("@/lib/testing/fakeFirestore");
  return createFakeFirestore();
});

import * as firebaseAdmin from "@/lib/firebaseAdmin";
import {
  cancelPurchase,
  createPurchase,
  getPurchase,
  listItemSuggestions,
  listPurchases,
  recordPurchasePayment,
  updatePurchase,
} from "@/lib/purchaseRepo";

type TestHooks = {
  __reset: () => void;
  __seed: (collection: string, id: string, data: Record<string, unknown>) => void;
  __doc: (collection: string, id: string) => Record<string, unknown> | undefined;
  __writes: () => Array<{ op: string; collection: string; id: string }>;
  __transactionCount: () => number;
};
const hooks = firebaseAdmin as unknown as TestHooks;

function seedSupplier(id = "sup-1", shopId = "shop-1") {
  hooks.__seed("suppliers", id, {
    shopId,
    name: "ABC Mobiles",
    contactPerson: "Rahul",
    phone: "9876543210",
    status: "active",
    totalPurchased: 0,
    totalPaid: 0,
    outstanding: 0,
  });
}

function purchaseInput(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: "sup-1",
    purchaseDate: new Date(2026, 7, 5),
    items: [
      { name: "Display", brand: "Samsung", model: "A34", quantity: 3, purchasePrice: 1800 },
      { name: "Battery", brand: "Vivo", model: "V29", quantity: 5, purchasePrice: 550 },
    ],
    discount: { mode: "amount" as const, value: 0 },
    gstRate: 0,
    transportCharge: 0,
    dueDate: new Date(2026, 8, 5),
    shopId: "shop-1",
    branchId: "branch-1",
    purchasedBy: { userId: "user-1", name: "Naseem" },
    ...overrides,
  };
}

beforeEach(() => {
  hooks.__reset();
  seedSupplier();
});

describe("createPurchase", () => {
  it("computes totals server-side from the line items", async () => {
    const purchase = await createPurchase(purchaseInput());
    expect(purchase.subtotal).toBe(8150);
    expect(purchase.grandTotal).toBe(8150);
    expect(purchase.items[0].lineTotal).toBe(5400);
  });

  it("assigns a sequential per-shop reference", async () => {
    const first = await createPurchase(purchaseInput());
    const second = await createPurchase(purchaseInput());
    expect(first.ref).toBe("PUR-2026-0001");
    expect(second.ref).toBe("PUR-2026-0002");
  });

  it("keeps each shop's sequence independent", async () => {
    seedSupplier("sup-2", "shop-2");
    const shopOne = await createPurchase(purchaseInput());
    const shopTwo = await createPurchase(
      purchaseInput({ supplierId: "sup-2", shopId: "shop-2" })
    );
    expect(shopOne.ref).toBe("PUR-2026-0001");
    expect(shopTwo.ref).toBe("PUR-2026-0001");
  });

  it("opens as unpaid with no initial payment", async () => {
    const purchase = await createPurchase(purchaseInput());
    expect(purchase.paymentStatus).toBe("unpaid");
    expect(purchase.paidAmount).toBe(0);
    expect(purchase.balance).toBe(8150);
    expect(purchase.payments).toEqual([]);
  });

  it("records an initial payment as partial", async () => {
    const purchase = await createPurchase(
      purchaseInput({
        initialPayment: { amount: 5000, method: "upi", paidAt: new Date(2026, 7, 5) },
      })
    );
    expect(purchase.paymentStatus).toBe("partial");
    expect(purchase.paidAmount).toBe(5000);
    expect(purchase.balance).toBe(3150);
    expect(purchase.payments).toHaveLength(1);
    expect(purchase.payments[0].method).toBe("upi");
  });

  it("updates the supplier's running totals", async () => {
    await createPurchase(
      purchaseInput({
        initialPayment: { amount: 5000, method: "cash", paidAt: new Date(2026, 7, 5) },
      })
    );
    const supplier = hooks.__doc("suppliers", "sup-1");
    expect(supplier?.totalPurchased).toBe(8150);
    expect(supplier?.totalPaid).toBe(5000);
    expect(supplier?.outstanding).toBe(3150);
    expect(supplier?.lastPurchaseAt).toBeInstanceOf(Date);
  });

  it("denormalizes the supplier name onto the purchase", async () => {
    expect((await createPurchase(purchaseInput())).supplierName).toBe("ABC Mobiles");
  });

  it("writes the purchase, the counter and the supplier in ONE transaction", async () => {
    await createPurchase(purchaseInput());
    expect(hooks.__transactionCount()).toBe(1);
    const collections = hooks.__writes().map((w) => w.collection).sort();
    expect(collections).toEqual(["purchaseCounters", "purchases", "suppliers"]);
  });

  it("403s and writes nothing for a supplier in another shop", async () => {
    seedSupplier("sup-2", "shop-2");
    await expect(
      createPurchase(purchaseInput({ supplierId: "sup-2" }))
    ).rejects.toMatchObject({ status: 403 });

    expect(hooks.__doc("suppliers", "sup-2")?.totalPurchased).toBe(0);
    expect(hooks.__writes()).toHaveLength(0);
  });

  it("404s for a supplier that does not exist", async () => {
    await expect(createPurchase(purchaseInput({ supplierId: "ghost" }))).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("recordPurchasePayment", () => {
  it("moves unpaid to partial", async () => {
    const created = await createPurchase(purchaseInput());
    const updated = await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 3000, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    expect(updated.paymentStatus).toBe("partial");
    expect(updated.balance).toBe(5150);
  });

  it("moves to paid when the exact balance is settled", async () => {
    const created = await createPurchase(purchaseInput());
    const updated = await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 8150, method: "bank", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    expect(updated.paymentStatus).toBe("paid");
    expect(updated.balance).toBe(0);
  });

  it("drives the supplier's outstanding to zero when fully paid", async () => {
    const created = await createPurchase(purchaseInput());
    await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 8150, method: "bank", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    const supplier = hooks.__doc("suppliers", "sup-1");
    expect(supplier?.outstanding).toBe(0);
    expect(supplier?.totalPaid).toBe(8150);
  });

  it("rejects a payment larger than the remaining balance", async () => {
    const created = await createPurchase(purchaseInput());
    await expect(
      recordPurchasePayment(
        "shop-1",
        created.id,
        { amount: 9000, method: "cash", paidAt: new Date(2026, 7, 6) },
        "user-1"
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("cannot be overdrawn by successive payments", async () => {
    const created = await createPurchase(purchaseInput());
    await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 8000, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    // The balance is re-read inside the transaction, so this sees 150, not 8150.
    await expect(
      recordPurchasePayment(
        "shop-1",
        created.id,
        { amount: 8000, method: "cash", paidAt: new Date(2026, 7, 7) },
        "user-1"
      )
    ).rejects.toMatchObject({ status: 400 });

    expect(hooks.__doc("suppliers", "sup-1")?.outstanding).toBe(150);
  });

  it("rejects a payment against a cancelled purchase", async () => {
    const created = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", created.id, "wrong supplier");
    await expect(
      recordPurchasePayment(
        "shop-1",
        created.id,
        { amount: 100, method: "cash", paidAt: new Date(2026, 7, 6) },
        "user-1"
      )
    ).rejects.toMatchObject({ status: 409 });
  });

  it("403s across shops and leaves the balance untouched", async () => {
    const created = await createPurchase(purchaseInput());
    await expect(
      recordPurchasePayment(
        "shop-2",
        created.id,
        { amount: 100, method: "cash", paidAt: new Date(2026, 7, 6) },
        "user-1"
      )
    ).rejects.toMatchObject({ status: 403 });
    expect((await getPurchase("shop-1", created.id)).balance).toBe(8150);
  });

  it("writes the purchase and supplier in ONE transaction", async () => {
    const created = await createPurchase(purchaseInput());
    await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 100, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    expect(hooks.__transactionCount()).toBe(2); // create + payment
    const collections = hooks.__writes().map((w) => w.collection).sort();
    expect(collections).toEqual(["purchases", "suppliers"]);
  });
});

describe("updatePurchase", () => {
  it("recomputes totals and applies the delta to the supplier", async () => {
    const created = await createPurchase(purchaseInput());
    const updated = await updatePurchase("shop-1", created.id, {
      ...purchaseInput(),
      items: [{ name: "Display", quantity: 1, purchasePrice: 1800 }],
    });

    expect(updated.grandTotal).toBe(1800);
    const supplier = hooks.__doc("suppliers", "sup-1");
    expect(supplier?.totalPurchased).toBe(1800);
    expect(supplier?.outstanding).toBe(1800);
  });

  it("409s once a payment exists", async () => {
    const created = await createPurchase(purchaseInput());
    await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 100, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    await expect(
      updatePurchase("shop-1", created.id, purchaseInput())
    ).rejects.toMatchObject({ status: 409 });
  });

  it("409s on a cancelled purchase", async () => {
    const created = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", created.id, "duplicate entry");
    await expect(
      updatePurchase("shop-1", created.id, purchaseInput())
    ).rejects.toMatchObject({ status: 409 });
  });

  it("keeps the original ref", async () => {
    const created = await createPurchase(purchaseInput());
    const updated = await updatePurchase("shop-1", created.id, purchaseInput());
    expect(updated.ref).toBe(created.ref);
  });
});

describe("cancelPurchase", () => {
  it("marks the purchase cancelled with a reason", async () => {
    const created = await createPurchase(purchaseInput());
    const cancelled = await cancelPurchase("shop-1", created.id, "wrong supplier");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelReason).toBe("wrong supplier");
    expect(cancelled.cancelledAt).toBeInstanceOf(Date);
  });

  it("reverses the supplier totals exactly", async () => {
    const before = hooks.__doc("suppliers", "sup-1");
    const created = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", created.id, "wrong supplier");
    const after = hooks.__doc("suppliers", "sup-1");
    expect(after?.totalPurchased).toBe(before?.totalPurchased);
    expect(after?.outstanding).toBe(before?.outstanding);
  });

  it("409s once a payment exists", async () => {
    const created = await createPurchase(purchaseInput());
    await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 100, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    await expect(cancelPurchase("shop-1", created.id, "changed my mind")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("never deletes the document", async () => {
    const created = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", created.id, "wrong supplier");
    expect(hooks.__doc("purchases", created.id)).toBeDefined();
    expect(hooks.__writes().some((w) => w.op === "delete")).toBe(false);
  });
});

describe("listPurchases", () => {
  it("excludes cancelled purchases by default", async () => {
    const keep = await createPurchase(purchaseInput());
    const drop = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", drop.id, "duplicate");

    const purchases = await listPurchases({ shopId: "shop-1" });
    expect(purchases.map((p) => p.id)).toEqual([keep.id]);
  });

  it("includes cancelled purchases when asked", async () => {
    const drop = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", drop.id, "duplicate");
    const purchases = await listPurchases({ shopId: "shop-1", includeCancelled: true });
    expect(purchases).toHaveLength(1);
  });

  it("filters by branch", async () => {
    await createPurchase(purchaseInput());
    await createPurchase(purchaseInput({ branchId: "branch-2" }));
    const purchases = await listPurchases({ shopId: "shop-1", branchId: "branch-2" });
    expect(purchases).toHaveLength(1);
    expect(purchases[0].branchId).toBe("branch-2");
  });

  it("never returns another shop's purchases", async () => {
    seedSupplier("sup-2", "shop-2");
    await createPurchase(purchaseInput());
    await createPurchase(purchaseInput({ supplierId: "sup-2", shopId: "shop-2" }));
    const purchases = await listPurchases({ shopId: "shop-2" });
    expect(purchases).toHaveLength(1);
    expect(purchases[0].shopId).toBe("shop-2");
  });

  it("returns newest first", async () => {
    const older = await createPurchase(purchaseInput({ purchaseDate: new Date(2026, 7, 1) }));
    const newer = await createPurchase(purchaseInput({ purchaseDate: new Date(2026, 7, 9) }));
    const purchases = await listPurchases({ shopId: "shop-1" });
    expect(purchases.map((p) => p.id)).toEqual([newer.id, older.id]);
  });
});

describe("listItemSuggestions", () => {
  it("returns distinct names, brands and models for the shop", async () => {
    await createPurchase(purchaseInput());
    await createPurchase(purchaseInput());
    const suggestions = await listItemSuggestions("shop-1");
    expect(suggestions.names.sort()).toEqual(["Battery", "Display"]);
    expect(suggestions.brands.sort()).toEqual(["Samsung", "Vivo"]);
    expect(suggestions.models.sort()).toEqual(["A34", "V29"]);
  });

  it("does not leak another shop's item names", async () => {
    seedSupplier("sup-2", "shop-2");
    await createPurchase(
      purchaseInput({
        supplierId: "sup-2",
        shopId: "shop-2",
        items: [{ name: "Secret Part", quantity: 1, purchasePrice: 1 }],
      })
    );
    expect((await listItemSuggestions("shop-1")).names).not.toContain("Secret Part");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/purchaseRepo.test.ts`
Expected: FAIL — cannot resolve `@/lib/purchaseRepo`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/purchaseRepo.ts
import { randomUUID } from "node:crypto";

import { ApiError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { summarizePayments } from "@/lib/purchasePayments";
import { formatPurchaseRef, nextRefCounter, type RefCounters } from "@/lib/purchaseRef";
import { computeTotals, lineTotalOf, roundMoney } from "@/lib/purchaseTotals";
import type { CreatePurchaseInput, RecordPaymentInput } from "@/lib/purchaseValidation";
import {
  SUPPLIERS,
  assertSupplierInShop,
  toDate,
  toOptionalDate,
} from "@/lib/supplierRepo";
import type { Purchase, PurchaseItem, PurchasePayment } from "@/types/purchase";

export const PURCHASES = "purchases";
/** Top-level rather than a subcollection — see the plan's deviation note. */
export const PURCHASE_COUNTERS = "purchaseCounters";

interface CreatePurchaseArgs extends CreatePurchaseInput {
  shopId: string;
  branchId: string;
  purchasedBy: { userId: string; name: string };
}

function mapItem(raw: Record<string, unknown>): PurchaseItem {
  return {
    id: (raw.id as string) || randomUUID(),
    name: (raw.name as string) || "",
    brand: (raw.brand as string) || undefined,
    model: (raw.model as string) || undefined,
    quantity: (raw.quantity as number) || 0,
    purchasePrice: (raw.purchasePrice as number) || 0,
    sellingPrice: raw.sellingPrice === null ? undefined : (raw.sellingPrice as number | undefined),
    warrantyMonths:
      raw.warrantyMonths === null ? undefined : (raw.warrantyMonths as number | undefined),
    remarks: (raw.remarks as string) || undefined,
    serviceId: (raw.serviceId as string) || undefined,
    serviceRef: (raw.serviceRef as string) || undefined,
    lineTotal: (raw.lineTotal as number) || 0,
  };
}

function mapPayment(raw: Record<string, unknown>): PurchasePayment {
  return {
    id: (raw.id as string) || randomUUID(),
    amount: (raw.amount as number) || 0,
    method: (raw.method as PurchasePayment["method"]) || "cash",
    paidAt: toDate(raw.paidAt),
    reference: (raw.reference as string) || undefined,
    notes: (raw.notes as string) || undefined,
    recordedBy: (raw.recordedBy as string) || "",
    createdAt: toDate(raw.createdAt),
  };
}

/** The single Firestore -> Purchase mapper for the whole codebase. */
export function mapPurchase(id: string, data: Record<string, unknown>): Purchase {
  const items = Array.isArray(data.items)
    ? (data.items as Record<string, unknown>[]).map(mapItem)
    : [];
  const payments = Array.isArray(data.payments)
    ? (data.payments as Record<string, unknown>[]).map(mapPayment)
    : [];
  const discount = (data.discount as Record<string, unknown>) ?? {};

  return {
    id,
    shopId: (data.shopId as string) || "",
    branchId: (data.branchId as string) || "",
    ref: (data.ref as string) || "",
    supplierInvoiceNo: (data.supplierInvoiceNo as string) || undefined,
    supplierId: (data.supplierId as string) || "",
    supplierName: (data.supplierName as string) || "",
    purchaseDate: toDate(data.purchaseDate),
    purchasedBy: (data.purchasedBy as Purchase["purchasedBy"]) || { userId: "", name: "" },
    items,
    subtotal: (data.subtotal as number) || 0,
    discount: {
      mode: (discount.mode as "amount" | "percent") || "amount",
      value: (discount.value as number) || 0,
      amount: (discount.amount as number) || 0,
    },
    gstRate: (data.gstRate as number) || 0,
    gstAmount: (data.gstAmount as number) || 0,
    transportCharge: (data.transportCharge as number) || 0,
    grandTotal: (data.grandTotal as number) || 0,
    payments,
    paidAmount: (data.paidAmount as number) || 0,
    balance: (data.balance as number) || 0,
    paymentStatus: (data.paymentStatus as Purchase["paymentStatus"]) || "unpaid",
    dueDate: toOptionalDate(data.dueDate),
    status: (data.status as Purchase["status"]) || "active",
    cancelReason: (data.cancelReason as string) || undefined,
    cancelledAt: toOptionalDate(data.cancelledAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Builds the persisted item rows, stamping each with its computed line total. */
function buildItems(input: CreatePurchaseInput): Record<string, unknown>[] {
  return input.items.map((item) => ({
    id: randomUUID(),
    name: item.name,
    brand: item.brand ?? null,
    model: item.model ?? null,
    quantity: item.quantity,
    purchasePrice: item.purchasePrice,
    sellingPrice: item.sellingPrice ?? null,
    warrantyMonths: item.warrantyMonths ?? null,
    remarks: item.remarks ?? null,
    serviceId: item.serviceId ?? null,
    serviceRef: item.serviceRef ?? null,
    lineTotal: lineTotalOf(item.quantity, item.purchasePrice),
  }));
}

function buildPayment(input: RecordPaymentInput, recordedBy: string): Record<string, unknown> {
  return {
    id: randomUUID(),
    amount: input.amount,
    method: input.method,
    paidAt: input.paidAt,
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    recordedBy,
    createdAt: new Date(),
  };
}

/**
 * Creates a purchase and moves the supplier's running totals in ONE
 * transaction. The counter, the purchase and the supplier must commit
 * together — a partial commit would either mint a duplicate reference or
 * leave the supplier's outstanding disagreeing with its bills.
 */
export async function createPurchase(input: CreatePurchaseArgs): Promise<Purchase> {
  const supplierRef = adminDb.collection(SUPPLIERS).doc(input.supplierId);
  const counterRef = adminDb.collection(PURCHASE_COUNTERS).doc(input.shopId);
  const purchaseRef = adminDb.collection(PURCHASES).doc();

  const totals = computeTotals({
    items: input.items,
    discount: input.discount,
    gstRate: input.gstRate,
    transportCharge: input.transportCharge,
  });

  const payments = input.initialPayment
    ? [buildPayment(input.initialPayment, input.purchasedBy.userId)]
    : [];
  const summary = summarizePayments(totals.grandTotal, payments as Array<{ amount: number }>);
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;
    assertSupplierInShop(supplier, input.shopId, input.supplierId);

    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists
      ? (counterSnap.data() as unknown as RefCounters)
      : undefined;
    // One sequence per year, so a backdated entry continues its own year's run
    // and never re-issues a reference already assigned in another year.
    const purchaseYear = input.purchaseDate.getFullYear();
    const { counters, seq } = nextRefCounter(current, purchaseYear);

    const purchase: Record<string, unknown> = {
      shopId: input.shopId,
      branchId: input.branchId,
      ref: formatPurchaseRef(purchaseYear, seq),
      supplierInvoiceNo: input.supplierInvoiceNo ?? null,
      supplierId: input.supplierId,
      supplierName: (supplier.name as string) || "",
      purchaseDate: input.purchaseDate,
      purchasedBy: input.purchasedBy,
      items: buildItems(input),
      subtotal: totals.subtotal,
      discount: { ...input.discount, amount: totals.discountAmount },
      gstRate: input.gstRate,
      gstAmount: totals.gstAmount,
      transportCharge: totals.transportCharge,
      grandTotal: totals.grandTotal,
      payments,
      paidAmount: summary.paidAmount,
      balance: summary.balance,
      paymentStatus: summary.paymentStatus,
      dueDate: input.dueDate ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    tx.set(purchaseRef, purchase);
    // set, not update: the counter document does not exist on a shop's first purchase.
    tx.set(counterRef, counters);
    tx.update(supplierRef, {
      totalPurchased: roundMoney(((supplier.totalPurchased as number) || 0) + totals.grandTotal),
      totalPaid: roundMoney(((supplier.totalPaid as number) || 0) + summary.paidAmount),
      outstanding: roundMoney(((supplier.outstanding as number) || 0) + summary.balance),
      lastPurchaseAt: input.purchaseDate,
      updatedAt: now,
    });

    return purchase;
  });

  return mapPurchase(purchaseRef.id, data);
}

/** Loads a purchase inside a transaction and enforces shop ownership. */
async function loadForWrite(
  tx: { get: (ref: unknown) => Promise<{ exists: boolean; data: () => unknown }> },
  ref: unknown,
  shopId: string
): Promise<Record<string, unknown>> {
  const snap = await tx.get(ref);
  if (!snap.exists) {
    throw new ApiError(404, "Purchase not found");
  }
  const data = snap.data() as Record<string, unknown>;
  if (!data.shopId || data.shopId !== shopId) {
    throw new ApiError(403, "Purchase does not belong to this shop");
  }
  return data;
}

export async function recordPurchasePayment(
  shopId: string,
  id: string,
  input: RecordPaymentInput,
  recordedBy: string
): Promise<Purchase> {
  const purchaseRef = adminDb.collection(PURCHASES).doc(id);
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    // Re-read inside the transaction: the balance may have moved since the
    // page rendered, and this guard is only sound against the current value.
    const purchase = await loadForWrite(tx, purchaseRef, shopId);

    if (purchase.status === "cancelled") {
      throw new ApiError(409, "Cannot record a payment against a cancelled purchase");
    }

    const existing = Array.isArray(purchase.payments)
      ? (purchase.payments as Record<string, unknown>[])
      : [];
    const grandTotal = (purchase.grandTotal as number) || 0;
    const before = summarizePayments(grandTotal, existing as Array<{ amount: number }>);

    if (input.amount > before.balance) {
      throw new ApiError(400, "Payment cannot exceed the outstanding balance");
    }

    const payments = [...existing, buildPayment(input, recordedBy)];
    const after = summarizePayments(grandTotal, payments as Array<{ amount: number }>);

    const supplierRef = adminDb.collection(SUPPLIERS).doc(purchase.supplierId as string);
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;

    const updated = {
      ...purchase,
      payments,
      paidAmount: after.paidAmount,
      balance: after.balance,
      paymentStatus: after.paymentStatus,
      updatedAt: now,
    };

    tx.update(purchaseRef, {
      payments,
      paidAmount: after.paidAmount,
      balance: after.balance,
      paymentStatus: after.paymentStatus,
      updatedAt: now,
    });
    tx.update(supplierRef, {
      totalPaid: roundMoney(((supplier.totalPaid as number) || 0) + input.amount),
      outstanding: roundMoney(((supplier.outstanding as number) || 0) - input.amount),
      updatedAt: now,
    });

    return updated;
  });

  return mapPurchase(id, data);
}

export async function updatePurchase(
  shopId: string,
  id: string,
  input: CreatePurchaseInput
): Promise<Purchase> {
  const purchaseRef = adminDb.collection(PURCHASES).doc(id);
  const now = new Date();

  const totals = computeTotals({
    items: input.items,
    discount: input.discount,
    gstRate: input.gstRate,
    transportCharge: input.transportCharge,
  });

  const data = await adminDb.runTransaction(async (tx) => {
    const purchase = await loadForWrite(tx, purchaseRef, shopId);

    if (purchase.status === "cancelled") {
      throw new ApiError(409, "A cancelled purchase cannot be edited");
    }
    const payments = Array.isArray(purchase.payments) ? purchase.payments : [];
    if (payments.length > 0) {
      throw new ApiError(409, "A purchase with recorded payments cannot be edited");
    }

    const supplierRef = adminDb.collection(SUPPLIERS).doc(purchase.supplierId as string);
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;

    // Apply the DELTA, never a recomputed absolute — the supplier's totals
    // span every one of its purchases, not just this one.
    const previousTotal = (purchase.grandTotal as number) || 0;
    const delta = roundMoney(totals.grandTotal - previousTotal);

    const updates: Record<string, unknown> = {
      supplierInvoiceNo: input.supplierInvoiceNo ?? null,
      purchaseDate: input.purchaseDate,
      items: buildItems(input),
      subtotal: totals.subtotal,
      discount: { ...input.discount, amount: totals.discountAmount },
      gstRate: input.gstRate,
      gstAmount: totals.gstAmount,
      transportCharge: totals.transportCharge,
      grandTotal: totals.grandTotal,
      paidAmount: 0,
      balance: totals.grandTotal,
      paymentStatus: "unpaid",
      dueDate: input.dueDate ?? null,
      updatedAt: now,
    };

    tx.update(purchaseRef, updates);
    tx.update(supplierRef, {
      totalPurchased: roundMoney(((supplier.totalPurchased as number) || 0) + delta),
      outstanding: roundMoney(((supplier.outstanding as number) || 0) + delta),
      updatedAt: now,
    });

    return { ...purchase, ...updates };
  });

  return mapPurchase(id, data);
}

export async function cancelPurchase(
  shopId: string,
  id: string,
  reason: string
): Promise<Purchase> {
  const purchaseRef = adminDb.collection(PURCHASES).doc(id);
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    const purchase = await loadForWrite(tx, purchaseRef, shopId);

    if (purchase.status === "cancelled") {
      throw new ApiError(409, "Purchase is already cancelled");
    }
    const payments = Array.isArray(purchase.payments) ? purchase.payments : [];
    if (payments.length > 0) {
      throw new ApiError(409, "A purchase with recorded payments cannot be cancelled");
    }

    const supplierRef = adminDb.collection(SUPPLIERS).doc(purchase.supplierId as string);
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;

    const grandTotal = (purchase.grandTotal as number) || 0;
    const balance = (purchase.balance as number) || 0;

    const updates: Record<string, unknown> = {
      status: "cancelled",
      cancelReason: reason,
      cancelledAt: now,
      updatedAt: now,
    };

    // Soft cancel: the document stays, the money reverses.
    tx.update(purchaseRef, updates);
    tx.update(supplierRef, {
      totalPurchased: roundMoney(((supplier.totalPurchased as number) || 0) - grandTotal),
      outstanding: roundMoney(((supplier.outstanding as number) || 0) - balance),
      updatedAt: now,
    });

    return { ...purchase, ...updates };
  });

  return mapPurchase(id, data);
}

export async function getPurchase(shopId: string, id: string): Promise<Purchase> {
  const snap = await adminDb.collection(PURCHASES).doc(id).get();
  if (!snap.exists) {
    throw new ApiError(404, "Purchase not found");
  }
  const data = snap.data() as Record<string, unknown>;
  if (!data.shopId || data.shopId !== shopId) {
    throw new ApiError(403, "Purchase does not belong to this shop");
  }
  return mapPurchase(id, data);
}

export async function listPurchases(scope: {
  shopId: string;
  branchId?: string;
  supplierId?: string;
  includeCancelled?: boolean;
}): Promise<Purchase[]> {
  let query = adminDb.collection(PURCHASES).where("shopId", "==", scope.shopId);
  if (scope.branchId) query = query.where("branchId", "==", scope.branchId);
  if (scope.supplierId) query = query.where("supplierId", "==", scope.supplierId);

  const snap = await query.get();
  return snap.docs
    .map((doc) => mapPurchase(doc.id, doc.data() as Record<string, unknown>))
    .filter((purchase) => scope.includeCancelled || purchase.status !== "cancelled")
    .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
}

const SUGGESTION_SAMPLE_SIZE = 200;

/**
 * Feeds the Add Purchase autocomplete from what this shop has actually bought,
 * which is why the module needs no catalogue collection.
 */
export async function listItemSuggestions(
  shopId: string
): Promise<{ names: string[]; brands: string[]; models: string[] }> {
  const purchases = (await listPurchases({ shopId })).slice(0, SUGGESTION_SAMPLE_SIZE);

  const names = new Set<string>();
  const brands = new Set<string>();
  const models = new Set<string>();

  for (const purchase of purchases) {
    for (const item of purchase.items) {
      if (item.name) names.add(item.name);
      if (item.brand) brands.add(item.brand);
      if (item.model) models.add(item.model);
    }
  }

  return { names: [...names], brands: [...brands], models: [...models] };
}

/**
 * Backs the duplicate-bill warning. Deliberately returns a boolean rather than
 * throwing: a genuine duplicate supplier bill number does happen, so the admin
 * is warned and may override.
 */
export async function supplierInvoiceNoExists(
  shopId: string,
  supplierId: string,
  invoiceNo: string
): Promise<boolean> {
  const purchases = await listPurchases({ shopId, supplierId });
  return purchases.some(
    (purchase) =>
      (purchase.supplierInvoiceNo || "").trim().toLowerCase() === invoiceNo.trim().toLowerCase()
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/purchaseRepo.test.ts`
Expected: PASS, 31 tests.

- [ ] **Step 5: Run the whole suite and commit**

```bash
npm test
npm run type-check
git add src/lib/purchaseRepo.ts src/lib/purchaseRepo.test.ts
git commit -m "feat: add purchase repository with transactional supplier totals"
```

---

### Task 10: Dashboard summary figures

**Files:**
- Create: `src/lib/purchaseSummary.ts`
- Test: `src/lib/purchaseSummary.test.ts`

**Interfaces:**
- Consumes: `roundMoney` from `@/lib/purchaseTotals`; `isSameDay`, `isSameMonth` from `@/lib/dateUtils`; `Purchase` from `@/types/purchase`.
- Produces:
  - `summarizePurchases(purchases: Purchase[], activeSupplierCount: number, now: Date): PurchaseSummary`
  - `interface PurchaseSummary { todayTotal: number; todayCount: number; monthTotal: number; pendingPayments: number; pendingBillCount: number; activeSupplierCount: number; itemsPurchasedToday: number }`

This is the five cards from the spec, and only those five — Low Stock Alerts is absent because there is no stock data to compute it from.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/purchaseSummary.test.ts
import { describe, expect, it } from "vitest";

import { summarizePurchases } from "@/lib/purchaseSummary";
import type { Purchase } from "@/types/purchase";

const NOW = new Date(2026, 7, 5, 12, 0);

function purchase(overrides: Partial<Purchase>): Purchase {
  return {
    id: "p1",
    shopId: "shop-1",
    branchId: "branch-1",
    ref: "PUR-2026-0001",
    supplierId: "sup-1",
    supplierName: "ABC Mobiles",
    purchaseDate: NOW,
    purchasedBy: { userId: "u1", name: "Naseem" },
    items: [{ id: "i1", name: "Display", quantity: 3, purchasePrice: 100, lineTotal: 300 }],
    subtotal: 300,
    discount: { mode: "amount", value: 0, amount: 0 },
    gstRate: 0,
    gstAmount: 0,
    transportCharge: 0,
    grandTotal: 300,
    payments: [],
    paidAmount: 0,
    balance: 300,
    paymentStatus: "unpaid",
    status: "active",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as Purchase;
}

describe("summarizePurchases", () => {
  it("returns zeros for no purchases", () => {
    expect(summarizePurchases([], 0, NOW)).toEqual({
      todayTotal: 0,
      todayCount: 0,
      monthTotal: 0,
      pendingPayments: 0,
      pendingBillCount: 0,
      activeSupplierCount: 0,
      itemsPurchasedToday: 0,
    });
  });

  it("totals today's purchases and counts them", () => {
    const summary = summarizePurchases(
      [purchase({ grandTotal: 8500 }), purchase({ id: "p2", grandTotal: 10000 })],
      3,
      NOW
    );
    expect(summary.todayTotal).toBe(18500);
    expect(summary.todayCount).toBe(2);
  });

  it("excludes yesterday from today but keeps it in the month", () => {
    const summary = summarizePurchases(
      [
        purchase({ grandTotal: 8500 }),
        purchase({ id: "p2", grandTotal: 12000, purchaseDate: new Date(2026, 7, 4) }),
      ],
      1,
      NOW
    );
    expect(summary.todayTotal).toBe(8500);
    expect(summary.monthTotal).toBe(20500);
  });

  it("excludes last month from the month total", () => {
    const summary = summarizePurchases(
      [purchase({ grandTotal: 5000, purchaseDate: new Date(2026, 6, 31) })],
      1,
      NOW
    );
    expect(summary.monthTotal).toBe(0);
  });

  it("sums outstanding balances regardless of date", () => {
    const summary = summarizePurchases(
      [
        purchase({ balance: 2500, purchaseDate: new Date(2026, 5, 1) }),
        purchase({ id: "p2", balance: 65700 }),
        purchase({ id: "p3", balance: 0, paymentStatus: "paid" }),
      ],
      1,
      NOW
    );
    expect(summary.pendingPayments).toBe(68200);
    expect(summary.pendingBillCount).toBe(2);
  });

  it("sums item quantities bought today", () => {
    const summary = summarizePurchases(
      [
        purchase({
          items: [
            { id: "i1", name: "Display", quantity: 3, purchasePrice: 1, lineTotal: 3 },
            { id: "i2", name: "Battery", quantity: 5, purchasePrice: 1, lineTotal: 5 },
          ],
        }),
        purchase({
          id: "p2",
          purchaseDate: new Date(2026, 7, 4),
          items: [{ id: "i3", name: "Panel", quantity: 99, purchasePrice: 1, lineTotal: 99 }],
        }),
      ],
      1,
      NOW
    );
    expect(summary.itemsPurchasedToday).toBe(8);
  });

  it("ignores cancelled purchases entirely", () => {
    const summary = summarizePurchases(
      [purchase({ grandTotal: 9999, balance: 9999, status: "cancelled" })],
      2,
      NOW
    );
    expect(summary.todayTotal).toBe(0);
    expect(summary.todayCount).toBe(0);
    expect(summary.pendingPayments).toBe(0);
    expect(summary.itemsPurchasedToday).toBe(0);
  });

  it("passes the supplier count straight through", () => {
    expect(summarizePurchases([], 24, NOW).activeSupplierCount).toBe(24);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/purchaseSummary.test.ts`
Expected: FAIL — cannot resolve `@/lib/purchaseSummary`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/purchaseSummary.ts
import { isSameDay, isSameMonth } from "@/lib/dateUtils";
import { roundMoney } from "@/lib/purchaseTotals";
import type { Purchase } from "@/types/purchase";

export interface PurchaseSummary {
  todayTotal: number;
  todayCount: number;
  monthTotal: number;
  pendingPayments: number;
  pendingBillCount: number;
  activeSupplierCount: number;
  itemsPurchasedToday: number;
}

/**
 * The five Spare Purchases summary cards. Low Stock Alerts is deliberately
 * absent — it needs stock levels this slice does not have, and a card that can
 * only ever render 0 is worse than no card.
 *
 * Cancelled purchases are excluded from every figure.
 */
export function summarizePurchases(
  purchases: Purchase[],
  activeSupplierCount: number,
  now: Date
): PurchaseSummary {
  const active = purchases.filter((purchase) => purchase.status !== "cancelled");
  const today = active.filter((purchase) => isSameDay(purchase.purchaseDate, now));
  const pending = active.filter((purchase) => purchase.balance > 0);

  return {
    todayTotal: roundMoney(today.reduce((sum, p) => sum + p.grandTotal, 0)),
    todayCount: today.length,
    monthTotal: roundMoney(
      active
        .filter((purchase) => isSameMonth(purchase.purchaseDate, now))
        .reduce((sum, p) => sum + p.grandTotal, 0)
    ),
    pendingPayments: roundMoney(pending.reduce((sum, p) => sum + p.balance, 0)),
    pendingBillCount: pending.length,
    activeSupplierCount,
    itemsPurchasedToday: today.reduce(
      (sum, purchase) => sum + purchase.items.reduce((count, item) => count + item.quantity, 0),
      0
    ),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/purchaseSummary.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/purchaseSummary.ts src/lib/purchaseSummary.test.ts
git commit -m "feat: add purchase dashboard summary figures"
```

---

### Task 11: Permissions and authorization guards

**Files:**
- Modify: `src/types/index.ts` (add to the `Permission` union, around line 11-32)
- Modify: `src/lib/rbac.ts` (add to `ROLE_PERMISSIONS`, around line 17-58)
- Modify: `src/lib/apiAuth.ts` (append purchase guards)
- Test: `src/lib/apiAuth.test.ts` (extend the existing file)

**Interfaces:**
- Consumes: `AuthUser` from `@/lib/auth`; `ApiError` from `@/lib/apiAuth`.
- Produces:
  - `assertCanReadPurchase(user: AuthUser, target: { shopId: string; branchId: string }): void`
  - `assertCanWritePurchase(user: AuthUser, target: { shopId: string; branchId: string }): void`
  - `assertCanManageSuppliers(user: AuthUser): string` — returns the caller's `shopId`
  - New permissions `"purchase:read" | "purchase:write" | "purchase:delete"`

`listScopeFor` already pins non-shop-admins to their own branch, so the purchase list routes reuse it rather than growing a parallel helper.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/apiAuth.test.ts`:

```typescript
import {
  assertCanManageSuppliers,
  assertCanReadPurchase,
  assertCanWritePurchase,
} from "@/lib/apiAuth";
import type { AuthUser } from "@/lib/auth";

function user(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: "u1",
    email: "a@b.com",
    role: "shop_admin",
    shopId: "shop-1",
    branchId: "branch-1",
    ...overrides,
  } as AuthUser;
}

describe("assertCanWritePurchase", () => {
  it("allows a shop_admin anywhere in their own shop", () => {
    expect(() =>
      assertCanWritePurchase(user({ role: "shop_admin" }), {
        shopId: "shop-1",
        branchId: "branch-9",
      })
    ).not.toThrow();
  });

  it("allows a branch_admin in their own branch", () => {
    expect(() =>
      assertCanWritePurchase(user({ role: "branch_admin" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).not.toThrow();
  });

  it("rejects a branch_admin in another branch", () => {
    expect(() =>
      assertCanWritePurchase(user({ role: "branch_admin" }), {
        shopId: "shop-1",
        branchId: "branch-2",
      })
    ).toThrow(/not permitted/i);
  });

  it("rejects a technician outright", () => {
    expect(() =>
      assertCanWritePurchase(user({ role: "technician" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).toThrow(/not permitted/i);
  });

  it("rejects any user from another shop", () => {
    expect(() =>
      assertCanWritePurchase(user({ role: "shop_admin", shopId: "shop-2" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).toThrow(/not permitted/i);
  });

  it("rejects a user with no shop", () => {
    expect(() =>
      assertCanWritePurchase(user({ shopId: undefined }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).toThrow(/not permitted/i);
  });
});

describe("assertCanReadPurchase", () => {
  it("rejects a technician", () => {
    expect(() =>
      assertCanReadPurchase(user({ role: "technician" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).toThrow(/not permitted/i);
  });

  it("allows a branch_admin in their own branch", () => {
    expect(() =>
      assertCanReadPurchase(user({ role: "branch_admin" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).not.toThrow();
  });
});

describe("assertCanManageSuppliers", () => {
  it("returns the shopId for a shop_admin", () => {
    expect(assertCanManageSuppliers(user({ role: "shop_admin" }))).toBe("shop-1");
  });

  it("allows a branch_admin — suppliers are shop-wide", () => {
    expect(assertCanManageSuppliers(user({ role: "branch_admin" }))).toBe("shop-1");
  });

  it("rejects a technician", () => {
    expect(() => assertCanManageSuppliers(user({ role: "technician" }))).toThrow(/not permitted/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/apiAuth.test.ts`
Expected: FAIL — `assertCanWritePurchase is not a function`.

- [ ] **Step 3: Add the permissions**

In `src/types/index.ts`, add three members to the `Permission` union, after the `"service:delete"` entry:

```typescript
  | "purchase:read"
  | "purchase:write"
  | "purchase:delete"
```

In `src/lib/rbac.ts`, add to `ROLE_PERMISSIONS`:

```typescript
// shop_admin.permissions — add all three:
      "purchase:read",
      "purchase:write",
      "purchase:delete",

// branch_admin.permissions — add read and write only:
      "purchase:read",
      "purchase:write",
```

Add nothing to `technician`. `purchase:delete` gates cancellation; no code path deletes a purchase document.

- [ ] **Step 4: Add the guards**

Append to `src/lib/apiAuth.ts`:

```typescript
interface PurchaseScope {
  shopId: string;
  branchId: string;
}

/**
 * Purchasing is money-handling, so technicians are excluded at every level —
 * the nav entry is hidden and these guards are the enforcement behind it.
 */
function assertPurchaseAccess(user: AuthUser, target: PurchaseScope, verb: string): void {
  if (!user.shopId || user.shopId !== target.shopId) {
    throw new ApiError(403, `Not permitted to ${verb} purchases in this shop`);
  }

  if (user.role === "shop_admin") return;

  if (user.role === "branch_admin") {
    if (user.branchId && user.branchId === target.branchId) return;
    throw new ApiError(403, `Not permitted to ${verb} purchases in this branch`);
  }

  throw new ApiError(403, `Not permitted to ${verb} purchases`);
}

export function assertCanReadPurchase(user: AuthUser, target: PurchaseScope): void {
  assertPurchaseAccess(user, target, "view");
}

export function assertCanWritePurchase(user: AuthUser, target: PurchaseScope): void {
  assertPurchaseAccess(user, target, "modify");
}

/**
 * Suppliers are shop-wide, so there is no branch dimension here — a
 * branch_admin buying from a vendor needs that vendor's profile.
 * Returns the caller's shopId so routes never read it from the body.
 */
export function assertCanManageSuppliers(user: AuthUser): string {
  if (!user.shopId) {
    throw new ApiError(403, "Not permitted to manage suppliers");
  }
  if (user.role !== "shop_admin" && user.role !== "branch_admin") {
    throw new ApiError(403, "Not permitted to manage suppliers");
  }
  return user.shopId;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/apiAuth.test.ts`
Expected: PASS — the pre-existing technician tests plus 11 new ones.

- [ ] **Step 6: Commit**

```bash
npm run type-check
git add src/types/index.ts src/lib/rbac.ts src/lib/apiAuth.ts src/lib/apiAuth.test.ts
git commit -m "feat: add purchase permissions and authorization guards"
```

---

### Task 12: Supplier API routes

**Files:**
- Create: `src/app/api/suppliers/route.ts`
- Create: `src/app/api/suppliers/[id]/route.ts`

**Interfaces:**
- Consumes: `requireUser`, `readJsonBody`, `toErrorResponse`, `assertCanManageSuppliers` from `@/lib/apiAuth`; `listSuppliers`, `getSupplier`, `createSupplier`, `updateSupplier` from `@/lib/supplierRepo`; `parseCreateSupplierInput`, `parseUpdateSupplierInput` from `@/lib/purchaseValidation`; `listPurchases` from `@/lib/purchaseRepo`.
- Produces: `GET/POST /api/suppliers`, `GET/PATCH /api/suppliers/[id]`. Response shapes: `{ suppliers: Supplier[] }`, `{ supplier: Supplier }`, and on the detail GET `{ supplier: Supplier; purchases: Purchase[] }`.

These routes have **no business rules** — they authenticate, authorize, parse, delegate, and map errors. Follow `src/app/api/technicians/route.ts` exactly, including `export const dynamic = "force-dynamic"` and the `RouteContext` type with a `Promise` params.

There are no tests in this task: the project has no HTTP-route test setup, and every rule these routes touch is already covered by the repo and validation suites. Verification is `npm run build` plus the manual checks in Task 19.

- [ ] **Step 1: Write the collection route**

```typescript
// src/app/api/suppliers/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  assertCanManageSuppliers,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { parseCreateSupplierInput } from "@/lib/purchaseValidation";
import { createSupplier, listSuppliers } from "@/lib/supplierRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const shopId = assertCanManageSuppliers(user);
    return NextResponse.json({ suppliers: await listSuppliers(shopId) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const shopId = assertCanManageSuppliers(user);
    const input = parseCreateSupplierInput(await readJsonBody(request));

    // shopId comes from the session, never the payload.
    const supplier = await createSupplier({ ...input, shopId, createdBy: user.id });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 2: Write the detail route**

```typescript
// src/app/api/suppliers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  assertCanManageSuppliers,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { listPurchases } from "@/lib/purchaseRepo";
import { parseUpdateSupplierInput } from "@/lib/purchaseValidation";
import { getSupplier, updateSupplier } from "@/lib/supplierRepo";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const shopId = assertCanManageSuppliers(user);
    const { id } = await params;

    // The profile screen needs both halves, so serve them in one round trip.
    const [supplier, purchases] = await Promise.all([
      getSupplier(shopId, id),
      listPurchases({ shopId, supplierId: id }),
    ]);

    return NextResponse.json({ supplier, purchases });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const shopId = assertCanManageSuppliers(user);
    const { id } = await params;
    const input = parseUpdateSupplierInput(await readJsonBody(request));

    return NextResponse.json({ supplier: await updateSupplier(shopId, id, input) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 3: Verify the build compiles the routes**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/suppliers
git commit -m "feat: add supplier API routes"
```

---

### Task 13: Purchase API routes

**Files:**
- Create: `src/app/api/purchases/route.ts`
- Create: `src/app/api/purchases/[id]/route.ts`
- Create: `src/app/api/purchases/[id]/payments/route.ts`
- Create: `src/app/api/purchases/[id]/cancel/route.ts`
- Create: `src/app/api/purchases/item-suggestions/route.ts`

**Interfaces:**
- Consumes: `requireUser`, `readJsonBody`, `toErrorResponse`, `listScopeFor`, `assertCanReadPurchase`, `assertCanWritePurchase` from `@/lib/apiAuth`; every exported function from `@/lib/purchaseRepo`; `listSuppliers` from `@/lib/supplierRepo`; the parse functions from `@/lib/purchaseValidation`; `summarizePurchases` from `@/lib/purchaseSummary`.
- Produces:
  - `GET /api/purchases` → `{ purchases: Purchase[]; summary: PurchaseSummary }`
  - `POST /api/purchases` → `{ purchase: Purchase; duplicateInvoiceWarning?: string }`, 201
  - `GET /api/purchases/[id]` → `{ purchase: Purchase }`
  - `PATCH /api/purchases/[id]` → `{ purchase: Purchase }`
  - `POST /api/purchases/[id]/payments` → `{ purchase: Purchase }`
  - `POST /api/purchases/[id]/cancel` → `{ purchase: Purchase }`
  - `GET /api/purchases/item-suggestions` → `{ names: string[]; brands: string[]; models: string[] }`

**The duplicate-invoice rule:** `POST /api/purchases` accepts `confirmDuplicateInvoice: true` in the body. Without it, a matching `supplierInvoiceNo` for the same supplier returns **409 with a message** so the UI can prompt; with it, the purchase is created and the response carries `duplicateInvoiceWarning`. This is the one place the spec deliberately chose warn-and-override over reject.

- [ ] **Step 1: Write the collection route**

```typescript
// src/app/api/purchases/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  assertCanWritePurchase,
  listScopeFor,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import {
  createPurchase,
  listPurchases,
  supplierInvoiceNoExists,
} from "@/lib/purchaseRepo";
import { summarizePurchases } from "@/lib/purchaseSummary";
import { parseCreatePurchaseInput } from "@/lib/purchaseValidation";
import { listSuppliers } from "@/lib/supplierRepo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === "technician") {
      throw new ApiError(403, "Not permitted to view purchases");
    }

    // listScopeFor already pins a non-shop-admin to their own branch.
    const scope = listScopeFor(user, request.nextUrl.searchParams.get("branchId") ?? undefined);

    const [purchases, suppliers] = await Promise.all([
      listPurchases(scope),
      listSuppliers(scope.shopId),
    ]);

    const activeSuppliers = suppliers.filter((supplier) => supplier.status === "active").length;

    return NextResponse.json({
      purchases,
      summary: summarizePurchases(purchases, activeSuppliers, new Date()),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const input = parseCreatePurchaseInput(body);

    // A branch_admin can only buy for their own branch; a shop_admin may name one.
    const requestedBranchId =
      typeof (body as { branchId?: unknown }).branchId === "string"
        ? (body as { branchId: string }).branchId
        : user.branchId;

    const branchId = user.role === "shop_admin" ? requestedBranchId : user.branchId;
    if (!branchId) {
      throw new ApiError(400, "A branch is required to record a purchase");
    }

    assertCanWritePurchase(user, { shopId: user.shopId ?? "", branchId });

    const confirmDuplicate = (body as { confirmDuplicateInvoice?: unknown })
      .confirmDuplicateInvoice === true;

    let duplicateInvoiceWarning: string | undefined;
    if (input.supplierInvoiceNo) {
      const duplicate = await supplierInvoiceNoExists(
        user.shopId as string,
        input.supplierId,
        input.supplierInvoiceNo
      );
      if (duplicate && !confirmDuplicate) {
        // A warning the admin can override, not a hard error: genuine
        // duplicate bill numbers do occur.
        throw new ApiError(
          409,
          `Invoice ${input.supplierInvoiceNo} already exists for this supplier. Confirm to record it anyway.`
        );
      }
      if (duplicate) {
        duplicateInvoiceWarning = `Recorded despite a duplicate invoice number (${input.supplierInvoiceNo}).`;
      }
    }

    const purchase = await createPurchase({
      ...input,
      shopId: user.shopId as string,
      branchId,
      purchasedBy: { userId: user.id, name: user.name },
    });

    return NextResponse.json({ purchase, duplicateInvoiceWarning }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 2: Write the detail route**

```typescript
// src/app/api/purchases/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  assertCanReadPurchase,
  assertCanWritePurchase,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { getPurchase, updatePurchase } from "@/lib/purchaseRepo";
import { parseUpdatePurchaseInput } from "@/lib/purchaseValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const purchase = await getPurchase(user.shopId ?? "", id);
    // Checked after loading, because the branch to authorize against is the
    // purchase's own branch, not one the caller asserted.
    assertCanReadPurchase(user, { shopId: purchase.shopId, branchId: purchase.branchId });

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await getPurchase(user.shopId ?? "", id);
    assertCanWritePurchase(user, { shopId: existing.shopId, branchId: existing.branchId });

    const input = parseUpdatePurchaseInput(await readJsonBody(request));
    // The repo enforces the payments-lock; the UI merely hides the button.
    const purchase = await updatePurchase(existing.shopId, id, input);

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 3: Write the payments route**

```typescript
// src/app/api/purchases/[id]/payments/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  assertCanWritePurchase,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { getPurchase, recordPurchasePayment } from "@/lib/purchaseRepo";
import { parseRecordPaymentInput } from "@/lib/purchaseValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await getPurchase(user.shopId ?? "", id);
    assertCanWritePurchase(user, { shopId: existing.shopId, branchId: existing.branchId });

    const input = parseRecordPaymentInput(await readJsonBody(request));
    // The overdraw guard lives in the transaction, not here — this figure may
    // be stale by the time it commits.
    const purchase = await recordPurchasePayment(existing.shopId, id, input, user.id);

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 4: Write the cancel route**

```typescript
// src/app/api/purchases/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";

import {
  assertCanWritePurchase,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { cancelPurchase, getPurchase } from "@/lib/purchaseRepo";
import { parseCancelPurchaseInput } from "@/lib/purchaseValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await getPurchase(user.shopId ?? "", id);
    assertCanWritePurchase(user, { shopId: existing.shopId, branchId: existing.branchId });

    const { reason } = parseCancelPurchaseInput(await readJsonBody(request));
    // Soft cancel — the document is never removed.
    const purchase = await cancelPurchase(existing.shopId, id, reason);

    return NextResponse.json({ purchase });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 5: Write the item-suggestions route**

```typescript
// src/app/api/purchases/item-suggestions/route.ts
import { NextResponse } from "next/server";

import { ApiError, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { listItemSuggestions } from "@/lib/purchaseRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role === "technician" || !user.shopId) {
      throw new ApiError(403, "Not permitted to view purchases");
    }
    return NextResponse.json(await listItemSuggestions(user.shopId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 6: Verify and commit**

```bash
npm run type-check
npm test
git add src/app/api/purchases
git commit -m "feat: add purchase API routes"
```

---

### Task 14: Purchase formatting, summary cards and list page

**Files:**
- Create: `src/lib/purchaseFormat.ts`
- Test: `src/lib/purchaseFormat.test.ts`
- Create: `src/modules/purchase/PurchaseSummaryCards.tsx`
- Create: `src/modules/purchase/PurchaseList.tsx`
- Create: `src/app/(dashboard)/purchases/page.tsx`

**Interfaces:**
- Consumes: `PurchaseSummary` from `@/lib/purchaseSummary`; `isOverdue` from `@/lib/purchasePayments`; `Purchase` from `@/types/purchase`; `formatDate` from `@/lib/utils`.
- Produces:
  - `formatRupees(value: number): string` and `paymentStatusLabel(purchase, now): { label: string; className: string }` from `@/lib/purchaseFormat`
  - `<PurchaseSummaryCards summary={PurchaseSummary} loading={boolean} />`
  - `<PurchaseList purchases={Purchase[]} onOpen={(id: string) => void} />`
  - The `/purchases` page

`src/lib/utils.ts` already exports `formatDate` — use it rather than writing another date formatter. There is no currency formatter, hence `purchaseFormat.ts`.

- [ ] **Step 1: Write the failing test for formatting**

```typescript
// src/lib/purchaseFormat.test.ts
import { describe, expect, it } from "vitest";

import { formatRupees, paymentStatusLabel } from "@/lib/purchaseFormat";
import type { Purchase } from "@/types/purchase";

const NOW = new Date(2026, 7, 5);

function purchase(overrides: Partial<Purchase>): Purchase {
  return {
    balance: 0,
    paymentStatus: "paid",
    status: "active",
    dueDate: undefined,
    ...overrides,
  } as Purchase;
}

describe("formatRupees", () => {
  it("groups in the Indian lakh/crore system", () => {
    expect(formatRupees(342800)).toBe("₹3,42,800");
  });

  it("formats a small amount", () => {
    expect(formatRupees(8500)).toBe("₹8,500");
  });

  it("shows paise only when they are non-zero", () => {
    expect(formatRupees(2500)).toBe("₹2,500");
    expect(formatRupees(2500.5)).toBe("₹2,500.50");
  });

  it("formats zero", () => {
    expect(formatRupees(0)).toBe("₹0");
  });
});

describe("paymentStatusLabel", () => {
  it("labels a paid purchase", () => {
    expect(paymentStatusLabel(purchase({ paymentStatus: "paid" }), NOW).label).toBe("Paid");
  });

  it("labels a partial purchase", () => {
    expect(
      paymentStatusLabel(purchase({ paymentStatus: "partial", balance: 100 }), NOW).label
    ).toBe("Partially Paid");
  });

  it("labels an unpaid purchase as Pending", () => {
    expect(
      paymentStatusLabel(purchase({ paymentStatus: "unpaid", balance: 100 }), NOW).label
    ).toBe("Pending");
  });

  it("labels an overdue purchase as Overdue, outranking its payment status", () => {
    const overdue = purchase({
      paymentStatus: "partial",
      balance: 100,
      dueDate: new Date(2026, 7, 1),
    });
    expect(paymentStatusLabel(overdue, NOW).label).toBe("Overdue");
  });

  it("does not call a settled bill overdue", () => {
    const settled = purchase({
      paymentStatus: "paid",
      balance: 0,
      dueDate: new Date(2026, 7, 1),
    });
    expect(paymentStatusLabel(settled, NOW).label).toBe("Paid");
  });

  it("labels a cancelled purchase, outranking everything", () => {
    const cancelled = purchase({
      status: "cancelled",
      paymentStatus: "unpaid",
      balance: 100,
      dueDate: new Date(2026, 7, 1),
    });
    expect(paymentStatusLabel(cancelled, NOW).label).toBe("Cancelled");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/purchaseFormat.test.ts`
Expected: FAIL — cannot resolve `@/lib/purchaseFormat`.

- [ ] **Step 3: Write the formatting module**

```typescript
// src/lib/purchaseFormat.ts
import { isOverdue } from "@/lib/purchasePayments";
import type { Purchase } from "@/types/purchase";

/**
 * Indian digit grouping (₹3,42,800 not ₹342,800). Paise are shown only when
 * non-zero, so the common whole-rupee case stays readable.
 */
export function formatRupees(value: number): string {
  const hasPaise = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(value);
}

export interface StatusLabel {
  label: string;
  className: string;
}

/**
 * Precedence matters: cancelled outranks overdue, which outranks the stored
 * payment status. Overdue is derived here rather than stored, because it
 * changes with the clock alone.
 */
export function paymentStatusLabel(purchase: Purchase, now: Date): StatusLabel {
  if (purchase.status === "cancelled") {
    return { label: "Cancelled", className: "bg-gray-100 text-gray-600" };
  }

  if (isOverdue(purchase.balance, purchase.dueDate, now)) {
    return { label: "Overdue", className: "bg-purple-100 text-purple-700" };
  }

  switch (purchase.paymentStatus) {
    case "paid":
      return { label: "Paid", className: "bg-emerald-100 text-emerald-700" };
    case "partial":
      return { label: "Partially Paid", className: "bg-amber-100 text-amber-700" };
    default:
      return { label: "Pending", className: "bg-red-100 text-red-700" };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/purchaseFormat.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Write the summary cards component**

```tsx
// src/modules/purchase/PurchaseSummaryCards.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import type { PurchaseSummary } from "@/lib/purchaseSummary";

interface Props {
  summary: PurchaseSummary | null;
  loading: boolean;
}

interface Card {
  label: string;
  value: string;
  hint: string;
  accent: string;
}

/**
 * Five cards, not six. Low Stock Alerts needs stock levels this module does
 * not have, and a card that can only ever render 0 is worse than no card.
 */
function buildCards(summary: PurchaseSummary): Card[] {
  return [
    {
      label: "Today's Purchase",
      value: formatRupees(summary.todayTotal),
      hint: `${summary.todayCount} transaction${summary.todayCount === 1 ? "" : "s"}`,
      accent: "bg-blue-50 text-blue-600",
    },
    {
      label: "This Month",
      value: formatRupees(summary.monthTotal),
      hint: "Current calendar month",
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Pending Payments",
      value: formatRupees(summary.pendingPayments),
      hint: `${summary.pendingBillCount} bill${summary.pendingBillCount === 1 ? "" : "s"} pending`,
      accent: "bg-amber-50 text-amber-600",
    },
    {
      label: "Suppliers",
      value: String(summary.activeSupplierCount),
      hint: "Active suppliers",
      accent: "bg-purple-50 text-purple-600",
    },
    {
      label: "Items Purchased Today",
      value: String(summary.itemsPurchasedToday),
      hint: "Units received",
      accent: "bg-sky-50 text-sky-600",
    },
  ];
}

const PurchaseSummaryCards = React.memo(function PurchaseSummaryCards({ summary, loading }: Props) {
  const cards = React.useMemo(() => (summary ? buildCards(summary) : []), [summary]);

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className={`mb-2 inline-flex rounded-lg px-2 py-1 text-xs font-medium ${card.accent}`}>
            {card.label}
          </div>
          <p className="text-xl font-semibold text-gray-900">{card.value}</p>
          <p className="mt-1 text-xs text-gray-500">{card.hint}</p>
        </div>
      ))}
    </div>
  );
});

export default PurchaseSummaryCards;
```

- [ ] **Step 6: Write the list component**

```tsx
// src/modules/purchase/PurchaseList.tsx
"use client";

import React from "react";

import { formatRupees, paymentStatusLabel } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { Purchase } from "@/types/purchase";

interface Props {
  purchases: Purchase[];
  onOpen: (id: string) => void;
}

function itemSummary(purchase: Purchase): string {
  const names = purchase.items.map((item) => item.name);
  const head = names.slice(0, 2).join(", ");
  const rest = names.length > 2 ? ` +${names.length - 2} more` : "";
  return `${head}${rest}`;
}

const PurchaseList = React.memo(function PurchaseList({ purchases, onOpen }: Props) {
  const now = React.useMemo(() => new Date(), []);

  if (purchases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">No purchases yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Record your first spare purchase to start tracking supplier dues.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => {
              const status = paymentStatusLabel(purchase, now);
              return (
                <tr
                  key={purchase.id}
                  onClick={() => onOpen(purchase.id)}
                  className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{purchase.ref}</p>
                    {purchase.supplierInvoiceNo && (
                      <p className="text-xs text-gray-500">Bill {purchase.supplierInvoiceNo}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{purchase.supplierName}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{itemSummary(purchase)}</p>
                    <p className="text-xs text-gray-500">{purchase.items.length} items</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatRupees(purchase.grandTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(purchase.purchaseDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {purchases.map((purchase) => {
          const status = paymentStatusLabel(purchase, now);
          return (
            <button
              key={purchase.id}
              onClick={() => onOpen(purchase.id)}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm"
            >
              <div className="flex items-start justify-between">
                <p className="font-medium text-gray-900">{purchase.ref}</p>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{purchase.supplierName}</p>
              <p className="text-xs text-gray-500">
                {itemSummary(purchase)} · {purchase.items.length} items
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">
                  {formatRupees(purchase.grandTotal)}
                </span>
                <span className="text-xs text-gray-500">{formatDate(purchase.purchaseDate)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
});

export default PurchaseList;
```

- [ ] **Step 7: Write the list page**

```tsx
// src/app/(dashboard)/purchases/page.tsx
"use client";

import { useRouter } from "next/navigation";
import React from "react";

import PurchaseList from "@/modules/purchase/PurchaseList";
import PurchaseSummaryCards from "@/modules/purchase/PurchaseSummaryCards";
import type { PurchaseSummary } from "@/lib/purchaseSummary";
import type { Purchase } from "@/types/purchase";

type DateFilter = "all" | "today" | "week" | "month";
type StatusFilter = "all" | "unpaid" | "partial" | "paid";

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [summary, setSummary] = React.useState<PurchaseSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/purchases", { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load purchases");
        }
        const body = (await response.json()) as {
          purchases: Purchase[];
          summary: PurchaseSummary;
        };
        // Dates arrive as JSON strings; revive them for the formatters.
        setPurchases(
          body.purchases.map((purchase) => ({
            ...purchase,
            purchaseDate: new Date(purchase.purchaseDate),
            dueDate: purchase.dueDate ? new Date(purchase.dueDate) : undefined,
          }))
        );
        setSummary(body.summary);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError((caught as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const visible = React.useMemo(() => {
    const now = new Date();
    const term = search.trim().toLowerCase();

    return purchases.filter((purchase) => {
      if (term) {
        const haystack = [
          purchase.ref,
          purchase.supplierInvoiceNo ?? "",
          purchase.supplierName,
          ...purchase.items.map((item) => item.name),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (statusFilter !== "all" && purchase.paymentStatus !== statusFilter) return false;

      if (dateFilter !== "all") {
        const days = dateFilter === "today" ? 1 : dateFilter === "week" ? 7 : 31;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        if (purchase.purchaseDate < cutoff) return false;
      }

      return true;
    });
  }, [purchases, search, statusFilter, dateFilter]);

  const handleOpen = React.useCallback(
    (id: string) => router.push(`/purchases/details?id=${id}`),
    [router]
  );

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Spare Purchases</h1>
          <p className="text-sm text-gray-500">Manage spare purchases, suppliers and payments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/purchases/suppliers")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Suppliers
          </button>
          <button
            onClick={() => router.push("/purchases/new")}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Purchase
          </button>
        </div>
      </div>

      <PurchaseSummaryCards summary={summary} loading={loading} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reference, supplier, item…"
          className="h-11 flex-1 rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value as DateFilter)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="unpaid">Pending</option>
          <option value="partial">Partially paid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Loading purchases…
        </div>
      ) : (
        <PurchaseList purchases={visible} onOpen={handleOpen} />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Verify and commit**

```bash
npm run type-check
npm test
git add src/lib/purchaseFormat.ts src/lib/purchaseFormat.test.ts src/modules/purchase src/app/\(dashboard\)/purchases
git commit -m "feat: add spare purchases list page with summary cards"
```

---

### Task 15: Add Purchase form

**Files:**
- Create: `src/modules/purchase/PurchaseForm.tsx`
- Create: `src/app/(dashboard)/purchases/new/page.tsx`

**Interfaces:**
- Consumes: `computeTotals` from `@/lib/purchaseTotals` (the same function the repo uses — this is what keeps the displayed grand total and the persisted one identical); `formatRupees` from `@/lib/purchaseFormat`; `Supplier` from `@/types/purchase`.
- Produces: `<PurchaseForm suppliers={Supplier[]} suggestions={Suggestions} onSubmit={(payload) => Promise<void>} submitting={boolean} />` and the `/purchases/new` page.
- `interface Suggestions { names: string[]; brands: string[]; models: string[] }`

A single scrolling form, not a wizard. Item rows are repeatable. Autocomplete is served by native `<datalist>`, which needs no library and degrades to plain text input if the suggestions request fails.

- [ ] **Step 1: Write the form component**

```tsx
// src/modules/purchase/PurchaseForm.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import { computeTotals } from "@/lib/purchaseTotals";
import type { Supplier } from "@/types/purchase";

export interface Suggestions {
  names: string[];
  brands: string[];
  models: string[];
}

interface ItemRow {
  key: string;
  name: string;
  brand: string;
  model: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
  warrantyMonths: string;
  remarks: string;
  serviceId: string;
}

export interface PurchasePayload {
  supplierId: string;
  supplierInvoiceNo?: string;
  purchaseDate: string;
  items: Array<Record<string, unknown>>;
  discount: { mode: "amount" | "percent"; value: number };
  gstRate: number;
  transportCharge: number;
  dueDate?: string;
  initialPayment?: { amount: number; method: string; paidAt: string; reference?: string };
  confirmDuplicateInvoice?: boolean;
}

interface Props {
  suppliers: Supplier[];
  suggestions: Suggestions;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: PurchasePayload) => Promise<void>;
  onAddSupplier: () => void;
}

function emptyRow(): ItemRow {
  return {
    key: `${Date.now()}-${Math.random()}`,
    name: "",
    brand: "",
    model: "",
    quantity: "1",
    purchasePrice: "",
    sellingPrice: "",
    warrantyMonths: "",
    remarks: "",
    serviceId: "",
  };
}

function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const PurchaseForm = React.memo(function PurchaseForm({
  suppliers,
  suggestions,
  submitting,
  error,
  onSubmit,
  onAddSupplier,
}: Props) {
  const [supplierId, setSupplierId] = React.useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState(todayIso());
  const [rows, setRows] = React.useState<ItemRow[]>([emptyRow()]);
  const [discountMode, setDiscountMode] = React.useState<"amount" | "percent">("amount");
  const [discountValue, setDiscountValue] = React.useState("0");
  const [gstRate, setGstRate] = React.useState("0");
  const [transportCharge, setTransportCharge] = React.useState("0");
  const [paymentType, setPaymentType] = React.useState<"cash" | "upi" | "bank" | "credit">("cash");
  const [amountPaid, setAmountPaid] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");

  // The SAME function the server uses, so the figure on screen is the figure
  // that gets persisted.
  const totals = React.useMemo(
    () =>
      computeTotals({
        items: rows.map((row) => ({
          quantity: Number(row.quantity) || 0,
          purchasePrice: Number(row.purchasePrice) || 0,
        })),
        discount: { mode: discountMode, value: Number(discountValue) || 0 },
        gstRate: Number(gstRate) || 0,
        transportCharge: Number(transportCharge) || 0,
      }),
    [rows, discountMode, discountValue, gstRate, transportCharge]
  );

  const isCredit = paymentType === "credit";
  const paid = isCredit ? 0 : Number(amountPaid) || 0;
  const balance = Math.max(totals.grandTotal - paid, 0);

  const updateRow = React.useCallback((key: string, field: keyof ItemRow, value: string) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  }, []);

  const addRow = React.useCallback(() => setRows((current) => [...current, emptyRow()]), []);

  const removeRow = React.useCallback((key: string) => {
    // Never leave the form with zero rows — a purchase needs at least one item.
    setRows((current) => (current.length === 1 ? current : current.filter((r) => r.key !== key)));
  }, []);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      await onSubmit({
        supplierId,
        supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
        purchaseDate: new Date(purchaseDate).toISOString(),
        items: rows.map((row) => ({
          name: row.name.trim(),
          brand: row.brand.trim() || undefined,
          model: row.model.trim() || undefined,
          quantity: Number(row.quantity),
          purchasePrice: Number(row.purchasePrice),
          sellingPrice: row.sellingPrice ? Number(row.sellingPrice) : undefined,
          warrantyMonths: row.warrantyMonths ? Number(row.warrantyMonths) : undefined,
          remarks: row.remarks.trim() || undefined,
          serviceId: row.serviceId.trim() || undefined,
        })),
        discount: { mode: discountMode, value: Number(discountValue) || 0 },
        gstRate: Number(gstRate) || 0,
        transportCharge: Number(transportCharge) || 0,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        initialPayment:
          isCredit || paid <= 0
            ? undefined
            : {
                amount: paid,
                method: paymentType,
                paidAt: new Date().toISOString(),
                reference: reference.trim() || undefined,
              },
      });
    },
    [
      onSubmit,
      supplierId,
      supplierInvoiceNo,
      purchaseDate,
      rows,
      discountMode,
      discountValue,
      gstRate,
      transportCharge,
      dueDate,
      isCredit,
      paid,
      paymentType,
      reference,
    ]
  );

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <datalist id="purchase-item-names">
        {suggestions.names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="purchase-item-brands">
        {suggestions.brands.map((brand) => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
      <datalist id="purchase-item-models">
        {suggestions.models.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Supplier</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">Supplier</label>
            <div className="flex gap-2">
              <select
                required
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                className={inputClass}
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAddSupplier}
                className="h-11 shrink-0 rounded-xl border border-blue-200 px-3 text-sm font-medium text-blue-600"
              >
                + Add
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Purchase date</label>
            <input
              type="date"
              required
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Supplier bill no. (optional)</label>
            <input
              value={supplierInvoiceNo}
              onChange={(event) => setSupplierInvoiceNo(event.target.value)}
              className={inputClass}
              placeholder="As printed on the bill"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Purchase items</h2>
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600"
          >
            + Add item
          </button>
        </div>

        <div className="space-y-4">
          {rows.map((row, index) => (
            <div key={row.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Item {index + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="text-xs font-medium text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  required
                  list="purchase-item-names"
                  value={row.name}
                  onChange={(event) => updateRow(row.key, "name", event.target.value)}
                  placeholder="Item"
                  className={inputClass}
                />
                <input
                  list="purchase-item-brands"
                  value={row.brand}
                  onChange={(event) => updateRow(row.key, "brand", event.target.value)}
                  placeholder="Brand"
                  className={inputClass}
                />
                <input
                  list="purchase-item-models"
                  value={row.model}
                  onChange={(event) => updateRow(row.key, "model", event.target.value)}
                  placeholder="Model"
                  className={inputClass}
                />
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={row.quantity}
                  onChange={(event) => updateRow(row.key, "quantity", event.target.value)}
                  placeholder="Quantity"
                  className={inputClass}
                />
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.purchasePrice}
                  onChange={(event) => updateRow(row.key, "purchasePrice", event.target.value)}
                  placeholder="Purchase price"
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.sellingPrice}
                  onChange={(event) => updateRow(row.key, "sellingPrice", event.target.value)}
                  placeholder="Selling price (optional)"
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={row.warrantyMonths}
                  onChange={(event) => updateRow(row.key, "warrantyMonths", event.target.value)}
                  placeholder="Warranty (months)"
                  className={inputClass}
                />
                <input
                  value={row.serviceId}
                  onChange={(event) => updateRow(row.key, "serviceId", event.target.value)}
                  placeholder="For service ID (optional)"
                  className={inputClass}
                />
                <input
                  value={row.remarks}
                  onChange={(event) => updateRow(row.key, "remarks", event.target.value)}
                  placeholder="Remarks (optional)"
                  className={inputClass}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Totals</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Discount</label>
            <div className="flex gap-2">
              <select
                value={discountMode}
                onChange={(event) => setDiscountMode(event.target.value as "amount" | "percent")}
                className="h-11 w-24 rounded-xl border border-gray-200 px-2 text-sm"
              >
                <option value="amount">₹</option>
                <option value="percent">%</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">GST rate (%)</label>
            <input
              type="number"
              min="0"
              max="28"
              step="0.01"
              value={gstRate}
              onChange={(event) => setGstRate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Transport charge</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={transportCharge}
              onChange={(event) => setTransportCharge(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <dl className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <dt>Subtotal</dt>
            <dd>{formatRupees(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Discount</dt>
            <dd>− {formatRupees(totals.discountAmount)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>GST</dt>
            <dd>{formatRupees(totals.gstAmount)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Transport</dt>
            <dd>{formatRupees(totals.transportCharge)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
            <dt>Grand total</dt>
            <dd>{formatRupees(totals.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Payment type</label>
            <select
              value={paymentType}
              onChange={(event) =>
                setPaymentType(event.target.value as "cash" | "upi" | "bank" | "credit")
              }
              className={inputClass}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
              <option value="credit">Credit (pay later)</option>
            </select>
          </div>

          {!isCredit && (
            <>
              <div>
                <label className="mb-1 block text-xs text-gray-600">Amount paid</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={totals.grandTotal}
                  value={amountPaid}
                  onChange={(event) => setAmountPaid(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">Reference (optional)</label>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs text-gray-600">
              Due date {isCredit ? "(required)" : "(optional)"}
            </label>
            <input
              type="date"
              required={isCredit}
              min={purchaseDate}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          Balance after this payment:{" "}
          <span className="font-semibold text-gray-900">{formatRupees(balance)}</span>
        </p>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save purchase"}
      </button>
    </form>
  );
});

export default PurchaseForm;
```

- [ ] **Step 2: Write the page that wires it up**

```tsx
// src/app/(dashboard)/purchases/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import React from "react";

import PurchaseForm, {
  type PurchasePayload,
  type Suggestions,
} from "@/modules/purchase/PurchaseForm";
import type { Supplier } from "@/types/purchase";

export default function NewPurchasePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [suggestions, setSuggestions] = React.useState<Suggestions>({
    names: [],
    brands: [],
    models: [],
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const [suppliersResponse, suggestionsResponse] = await Promise.allSettled([
        fetch("/api/suppliers", { signal: controller.signal }),
        fetch("/api/purchases/item-suggestions", { signal: controller.signal }),
      ]);

      if (suppliersResponse.status === "fulfilled" && suppliersResponse.value.ok) {
        const body = (await suppliersResponse.value.json()) as { suppliers: Supplier[] };
        setSuppliers(body.suppliers);
      }

      // Suggestions are a convenience, never a gate: a failure here leaves the
      // fields as plain free text.
      if (suggestionsResponse.status === "fulfilled" && suggestionsResponse.value.ok) {
        setSuggestions((await suggestionsResponse.value.json()) as Suggestions);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const handleSubmit = React.useCallback(
    async (payload: PurchasePayload) => {
      setSubmitting(true);
      setError(null);

      try {
        let response = await fetch("/api/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // 409 on a duplicate supplier bill number is a warning the admin may
        // override, not a rejection.
        if (response.status === 409) {
          const body = (await response.json()) as { error: string };
          if (!window.confirm(`${body.error}\n\nRecord it anyway?`)) {
            setSubmitting(false);
            return;
          }
          response = await fetch("/api/purchases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, confirmDuplicateInvoice: true }),
          });
        }

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not save the purchase");
        }

        const body = (await response.json()) as { purchase: { id: string } };
        router.push(`/purchases/details?id=${body.purchase.id}`);
      } catch (caught) {
        setError((caught as Error).message);
        setSubmitting(false);
      }
    },
    [router]
  );

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">New Purchase</h1>
        <p className="text-sm text-gray-500">Record a spare purchase and its payment</p>
      </div>

      <PurchaseForm
        suppliers={suppliers}
        suggestions={suggestions}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        onAddSupplier={() => router.push("/purchases/suppliers?new=1")}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

```bash
npm run type-check
git add src/modules/purchase/PurchaseForm.tsx "src/app/(dashboard)/purchases/new"
git commit -m "feat: add the Add Purchase form"
```

---

### Task 16: Purchase details and Record Payment

**Files:**
- Create: `src/modules/purchase/RecordPaymentModal.tsx`
- Create: `src/modules/purchase/PurchaseDetails.tsx`
- Create: `src/app/(dashboard)/purchases/details/page.tsx`

**Interfaces:**
- Consumes: `formatRupees`, `paymentStatusLabel` from `@/lib/purchaseFormat`; `formatDate`, `formatDateTime` from `@/lib/utils`; `Purchase` from `@/types/purchase`.
- Produces:
  - `<RecordPaymentModal purchase={Purchase} open={boolean} onClose={() => void} onRecorded={(purchase: Purchase) => void} />`
  - `<PurchaseDetails purchase={Purchase} onRecordPayment={() => void} onEdit={() => void} onCancel={() => void} />`
  - The `/purchases/details?id=` page

**The lock rule in the UI:** `Edit Purchase` and `Cancel` render only when `purchase.payments.length === 0 && purchase.status === "active"` — **absent, not disabled**. The API is the real gate; this is only so the screen doesn't offer something that will 409.

Do not use `window.alert`/`window.confirm` for the cancel reason — it needs free text. Use a small inline prompt inside the modal component.

- [ ] **Step 1: Write the Record Payment modal**

```tsx
// src/modules/purchase/RecordPaymentModal.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import type { Purchase } from "@/types/purchase";

interface Props {
  purchase: Purchase;
  open: boolean;
  onClose: () => void;
  onRecorded: (purchase: Purchase) => void;
}

const RecordPaymentModal = React.memo(function RecordPaymentModal({
  purchase,
  open,
  onClose,
  onRecorded,
}: Props) {
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<"cash" | "upi" | "bank">("cash");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      // Default to settling the bill in full — the common case.
      setAmount(String(purchase.balance));
      setError(null);
    }
  }, [open, purchase.balance]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/purchases/${purchase.id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(amount),
            method,
            paidAt: new Date().toISOString(),
            reference: reference.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not record the payment");
        }

        const body = (await response.json()) as { purchase: Purchase };
        onRecorded(body.purchase);
        onClose();
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [amount, method, reference, notes, purchase.id, onRecorded, onClose]
  );

  if (!open) return null;

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        <h2 className="text-base font-semibold text-gray-900">Record payment</h2>
        <p className="mt-1 text-sm text-gray-500">{purchase.ref}</p>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Balance due</p>
            <p className="font-semibold text-red-600">{formatRupees(purchase.balance)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total amount</p>
            <p className="font-semibold text-gray-900">{formatRupees(purchase.grandTotal)}</p>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Amount paid</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              max={purchase.balance}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Payment type</label>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as "cash" | "upi" | "bank")}
              className={inputClass}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Reference (optional)</label>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Notes (optional)</label>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save payment"}
          </button>
        </div>
      </form>
    </div>
  );
});

export default RecordPaymentModal;
```

- [ ] **Step 2: Write the details component**

```tsx
// src/modules/purchase/PurchaseDetails.tsx
"use client";

import React from "react";

import { formatRupees, paymentStatusLabel } from "@/lib/purchaseFormat";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Purchase } from "@/types/purchase";

interface Props {
  purchase: Purchase;
  onRecordPayment: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

const PurchaseDetails = React.memo(function PurchaseDetails({
  purchase,
  onRecordPayment,
  onEdit,
  onCancel,
}: Props) {
  const status = React.useMemo(() => paymentStatusLabel(purchase, new Date()), [purchase]);

  // Absent rather than disabled: once a payment exists the API will 409, so
  // the screen must not offer the action at all.
  const editable = purchase.payments.length === 0 && purchase.status === "active";
  const payable = purchase.status === "active" && purchase.balance > 0;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{purchase.ref}</h2>
            <p className="text-sm text-gray-500">{formatDateTime(purchase.purchaseDate)}</p>
            {purchase.supplierInvoiceNo && (
              <p className="text-xs text-gray-500">Supplier bill {purchase.supplierInvoiceNo}</p>
            )}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>

        {purchase.status === "cancelled" && purchase.cancelReason && (
          <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
            Cancelled: {purchase.cancelReason}
          </p>
        )}

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between">
            <dt className="text-gray-500">Supplier</dt>
            <dd className="font-medium text-gray-900">{purchase.supplierName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Purchased by</dt>
            <dd className="text-gray-900">{purchase.purchasedBy.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Total amount</dt>
            <dd className="font-medium text-gray-900">{formatRupees(purchase.grandTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Paid amount</dt>
            <dd className="text-gray-900">{formatRupees(purchase.paidAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Balance</dt>
            <dd className="font-semibold text-red-600">{formatRupees(purchase.balance)}</dd>
          </div>
          {purchase.dueDate && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Due date</dt>
              <dd className="text-gray-900">{formatDate(purchase.dueDate)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Purchased items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2">
                    <p className="text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {[item.brand, item.model].filter(Boolean).join(" ")}
                      {item.serviceId ? ` · for service ${item.serviceId}` : ""}
                    </p>
                  </td>
                  <td className="py-2 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-700">
                    {formatRupees(item.purchasePrice)}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {formatRupees(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <dt>Subtotal</dt>
            <dd>{formatRupees(purchase.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Discount</dt>
            <dd>− {formatRupees(purchase.discount.amount)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>GST ({purchase.gstRate}%)</dt>
            <dd>{formatRupees(purchase.gstAmount)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Transport</dt>
            <dd>{formatRupees(purchase.transportCharge)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
            <dt>Grand total</dt>
            <dd>{formatRupees(purchase.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Payment history</h3>
        {purchase.payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {purchase.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{formatRupees(payment.amount)}</p>
                  <p className="text-xs uppercase text-gray-500">
                    {payment.method}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-500">{formatDate(payment.paidAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-sm font-semibold">
          <span className="text-gray-600">Remaining balance</span>
          <span className="text-red-600">{formatRupees(purchase.balance)}</span>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        {payable && (
          <button
            onClick={onRecordPayment}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Record Payment
          </button>
        )}
        {editable && (
          <>
            <button
              onClick={onEdit}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700"
            >
              Edit Purchase
            </button>
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600"
            >
              Cancel Purchase
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default PurchaseDetails;
```

- [ ] **Step 3: Write the details page**

```tsx
// src/app/(dashboard)/purchases/details/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import PurchaseDetails from "@/modules/purchase/PurchaseDetails";
import RecordPaymentModal from "@/modules/purchase/RecordPaymentModal";
import type { Purchase } from "@/types/purchase";

function revive(purchase: Purchase): Purchase {
  return {
    ...purchase,
    purchaseDate: new Date(purchase.purchaseDate),
    dueDate: purchase.dueDate ? new Date(purchase.dueDate) : undefined,
    payments: purchase.payments.map((payment) => ({
      ...payment,
      paidAt: new Date(payment.paidAt),
      createdAt: new Date(payment.createdAt),
    })),
  };
}

function PurchaseDetailsContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");

  const [purchase, setPurchase] = React.useState<Purchase | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");

  React.useEffect(() => {
    if (!id) {
      setError("No purchase selected");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/purchases/${id}`, { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load the purchase");
        }
        const body = (await response.json()) as { purchase: Purchase };
        setPurchase(revive(body.purchase));
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError((caught as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [id]);

  const handleCancel = React.useCallback(async () => {
    if (!purchase || cancelReason.trim() === "") return;

    const response = await fetch(`/api/purchases/${purchase.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason.trim() }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Could not cancel the purchase");
      return;
    }

    const body = (await response.json()) as { purchase: Purchase };
    setPurchase(revive(body.purchase));
    setCancelling(false);
    setCancelReason("");
  }, [purchase, cancelReason]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading purchase…</div>;
  }

  if (error || !purchase) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Purchase not found"}
        </div>
        <button onClick={() => router.push("/purchases")} className="mt-3 text-sm text-blue-600">
          Back to purchases
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <button onClick={() => router.push("/purchases")} className="text-sm text-blue-600">
        ← Purchases
      </button>

      <PurchaseDetails
        purchase={purchase}
        onRecordPayment={() => setPaymentOpen(true)}
        onEdit={() => router.push(`/purchases/new?edit=${purchase.id}`)}
        onCancel={() => setCancelling(true)}
      />

      {cancelling && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <label className="mb-1 block text-sm font-medium text-red-800">
            Why are you cancelling this purchase?
          </label>
          <input
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            className="h-11 w-full rounded-xl border border-red-200 px-3 text-sm"
            placeholder="e.g. wrong supplier"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setCancelling(false)}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm"
            >
              Keep purchase
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelReason.trim() === ""}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Confirm cancel
            </button>
          </div>
        </div>
      )}

      <RecordPaymentModal
        purchase={purchase}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onRecorded={(updated) => setPurchase(revive(updated))}
      />
    </div>
  );
}

export default function PurchaseDetailsPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <PurchaseDetailsContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Wire edit mode into the Add Purchase page**

`onEdit` navigates to `/purchases/new?edit=<id>`, so that page must handle both create and edit. Three changes.

First, `PurchaseForm` gains an optional `initial` prop and seeds its state from it. Add to `Props`:

```typescript
  initial?: Purchase | null;
  submitLabel?: string;
```

and replace the six `useState` initialisers that hold invoice data with initial-aware ones:

```typescript
  const [supplierId, setSupplierId] = React.useState(initial?.supplierId ?? "");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = React.useState(
    initial?.supplierInvoiceNo ?? ""
  );
  const [purchaseDate, setPurchaseDate] = React.useState(
    initial ? new Date(initial.purchaseDate).toISOString().slice(0, 10) : todayIso()
  );
  const [rows, setRows] = React.useState<ItemRow[]>(
    initial
      ? initial.items.map((item) => ({
          key: item.id,
          name: item.name,
          brand: item.brand ?? "",
          model: item.model ?? "",
          quantity: String(item.quantity),
          purchasePrice: String(item.purchasePrice),
          sellingPrice: item.sellingPrice === undefined ? "" : String(item.sellingPrice),
          warrantyMonths:
            item.warrantyMonths === undefined ? "" : String(item.warrantyMonths),
          remarks: item.remarks ?? "",
          serviceId: item.serviceId ?? "",
        }))
      : [emptyRow()]
  );
  const [discountMode, setDiscountMode] = React.useState<"amount" | "percent">(
    initial?.discount.mode ?? "amount"
  );
  const [discountValue, setDiscountValue] = React.useState(
    String(initial?.discount.value ?? 0)
  );
  const [gstRate, setGstRate] = React.useState(String(initial?.gstRate ?? 0));
  const [transportCharge, setTransportCharge] = React.useState(
    String(initial?.transportCharge ?? 0)
  );
```

Also import `Purchase` from `@/types/purchase`, and use `{submitting ? "Saving…" : submitLabel ?? "Save purchase"}` on the submit button. Editing is only ever offered on an unpaid purchase, so the payment block keeps its empty defaults.

Second, `NewPurchasePage` reads the query parameter and loads that purchase:

```tsx
  const editId = useSearchParams().get("edit");
  const [initial, setInitial] = React.useState<Purchase | null>(null);

  React.useEffect(() => {
    if (!editId) return;
    const controller = new AbortController();

    async function loadExisting() {
      const response = await fetch(`/api/purchases/${editId}`, { signal: controller.signal });
      if (response.ok) {
        const body = (await response.json()) as { purchase: Purchase };
        setInitial({ ...body.purchase, purchaseDate: new Date(body.purchase.purchaseDate) });
      }
    }

    loadExisting();
    return () => controller.abort();
  }, [editId]);
```

Third, `handleSubmit` switches verb and target on `editId`, and skips the duplicate-invoice prompt because the bill number is unchanged on an edit:

```tsx
        const response = await fetch(
          editId ? `/api/purchases/${editId}` : "/api/purchases",
          {
            method: editId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
```

Keep the existing 409-override branch for the create path only — guard it with `if (!editId && response.status === 409)`.

Pass the new props through: `<PurchaseForm initial={initial} submitLabel={editId ? "Update purchase" : "Save purchase"} … />`. Add `key={initial?.id ?? "new"}` on the element so the form remounts once the existing purchase arrives, otherwise its `useState` initialisers keep the empty values.

Finally, wrap `NewPurchasePage`'s body in a `Suspense` boundary exactly as the details page does — `useSearchParams` requires one in the App Router, and the build will fail without it.

- [ ] **Step 5: Verify and commit**

```bash
npm run type-check
git add src/modules/purchase "src/app/(dashboard)/purchases"
git commit -m "feat: add purchase details and record payment"
```

---

### Task 17: Supplier screens

**Files:**
- Create: `src/modules/purchase/SupplierForm.tsx`
- Create: `src/modules/purchase/SupplierList.tsx`
- Create: `src/modules/purchase/SupplierProfile.tsx`
- Create: `src/app/(dashboard)/purchases/suppliers/page.tsx`
- Create: `src/app/(dashboard)/purchases/suppliers/details/page.tsx`

**Interfaces:**
- Consumes: `formatRupees` from `@/lib/purchaseFormat`; `formatDate` from `@/lib/utils`; `Supplier`, `Purchase` from `@/types/purchase`.
- Produces:
  - `<SupplierForm initial={Supplier | null} saving={boolean} error={string | null} onSubmit={(payload) => Promise<void>} onCancel={() => void} />`
  - `<SupplierList suppliers={Supplier[]} onOpen={(id: string) => void} />`
  - `<SupplierProfile supplier={Supplier} purchases={Purchase[]} onOpenPurchase={(id: string) => void} />`
  - `/purchases/suppliers` and `/purchases/suppliers/details?id=`

The list page opens the create form automatically when the URL carries `?new=1`, which is what the Add Purchase form's "+ Add" button links to.

- [ ] **Step 1: Write the supplier form**

```tsx
// src/modules/purchase/SupplierForm.tsx
"use client";

import React from "react";

import type { Supplier } from "@/types/purchase";

export interface SupplierPayload {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
}

interface Props {
  initial: Supplier | null;
  saving: boolean;
  error: string | null;
  onSubmit: (payload: SupplierPayload) => Promise<void>;
  onCancel: () => void;
}

const SupplierForm = React.memo(function SupplierForm({
  initial,
  saving,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [contactPerson, setContactPerson] = React.useState(initial?.contactPerson ?? "");
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [gstNumber, setGstNumber] = React.useState(initial?.gstNumber ?? "");
  const [address, setAddress] = React.useState(initial?.address ?? "");

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await onSubmit({
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        address: address.trim() || undefined,
      });
    },
    [onSubmit, name, contactPerson, phone, email, gstNumber, address]
  );

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">
        {initial ? "Edit supplier" : "New supplier"}
      </h2>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Shop name" className={inputClass} />
        <input required value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contact person" className={inputClass} />
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={inputClass} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className={inputClass} />
        <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="GST number (optional)" className={inputClass} />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" className={inputClass} />
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save supplier"}
        </button>
      </div>
    </form>
  );
});

export default SupplierForm;
```

- [ ] **Step 2: Write the supplier list**

```tsx
// src/modules/purchase/SupplierList.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { Supplier } from "@/types/purchase";

interface Props {
  suppliers: Supplier[];
  onOpen: (id: string) => void;
}

const SupplierList = React.memo(function SupplierList({ suppliers, onOpen }: Props) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">No suppliers yet</p>
        <p className="mt-1 text-sm text-gray-500">Add a supplier before recording a purchase.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {suppliers.map((supplier) => (
        <button
          key={supplier.id}
          onClick={() => onOpen(supplier.id)}
          className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:bg-gray-50"
        >
          <div className="flex items-start justify-between">
            <p className="font-medium text-gray-900">{supplier.name}</p>
            {supplier.status === "inactive" && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{supplier.phone}</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className={`font-semibold ${supplier.outstanding > 0 ? "text-red-600" : "text-gray-900"}`}>
                {formatRupees(supplier.outstanding)}
              </p>
            </div>
            {supplier.lastPurchaseAt && (
              <p className="text-xs text-gray-500">Last {formatDate(supplier.lastPurchaseAt)}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
});

export default SupplierList;
```

- [ ] **Step 3: Write the supplier profile**

```tsx
// src/modules/purchase/SupplierProfile.tsx
"use client";

import React from "react";

import { formatRupees, paymentStatusLabel } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { Purchase, Supplier } from "@/types/purchase";

interface Props {
  supplier: Supplier;
  purchases: Purchase[];
  onOpenPurchase: (id: string) => void;
}

const SupplierProfile = React.memo(function SupplierProfile({
  supplier,
  purchases,
  onOpenPurchase,
}: Props) {
  const now = React.useMemo(() => new Date(), []);
  const outstandingBills = React.useMemo(
    () => purchases.filter((purchase) => purchase.balance > 0 && purchase.status === "active"),
    [purchases]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-gray-900">{supplier.name}</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between">
            <dt className="text-gray-500">Contact</dt>
            <dd className="text-gray-900">{supplier.contactPerson}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Phone</dt>
            <dd className="text-gray-900">{supplier.phone}</dd>
          </div>
          {supplier.gstNumber && (
            <div className="flex justify-between">
              <dt className="text-gray-500">GST</dt>
              <dd className="text-gray-900">{supplier.gstNumber}</dd>
            </div>
          )}
          {supplier.address && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Address</dt>
              <dd className="text-right text-gray-900">{supplier.address}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Total purchases</dt>
            <dd className="font-medium text-gray-900">{formatRupees(supplier.totalPurchased)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Outstanding</dt>
            <dd className="font-semibold text-red-600">{formatRupees(supplier.outstanding)}</dd>
          </div>
          {supplier.lastPurchaseAt && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Last purchase</dt>
              <dd className="text-gray-900">{formatDate(supplier.lastPurchaseAt)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Outstanding bills ({outstandingBills.length})
        </h3>
        {outstandingBills.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing outstanding with this supplier.</p>
        ) : (
          <ul className="space-y-2">
            {outstandingBills.map((purchase) => (
              <li key={purchase.id}>
                <button
                  onClick={() => onOpenPurchase(purchase.id)}
                  className="flex w-full items-center justify-between border-b border-gray-100 pb-2 text-left text-sm"
                >
                  <span className="text-gray-900">{purchase.ref}</span>
                  <span className="font-medium text-red-600">{formatRupees(purchase.balance)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Purchase history</h3>
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-500">No purchases from this supplier yet.</p>
        ) : (
          <ul className="space-y-2">
            {purchases.map((purchase) => {
              const status = paymentStatusLabel(purchase, now);
              return (
                <li key={purchase.id}>
                  <button
                    onClick={() => onOpenPurchase(purchase.id)}
                    className="flex w-full items-center justify-between border-b border-gray-100 pb-2 text-left text-sm"
                  >
                    <div>
                      <p className="text-gray-900">{purchase.ref}</p>
                      <p className="text-xs text-gray-500">{formatDate(purchase.purchaseDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatRupees(purchase.grandTotal)}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
});

export default SupplierProfile;
```

- [ ] **Step 4: Write the supplier list page**

```tsx
// src/app/(dashboard)/purchases/suppliers/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import SupplierForm, { type SupplierPayload } from "@/modules/purchase/SupplierForm";
import SupplierList from "@/modules/purchase/SupplierList";
import type { Supplier } from "@/types/purchase";

function SuppliersContent() {
  const router = useRouter();
  // The Add Purchase form's "+ Add" button links here with ?new=1.
  const openNew = useSearchParams().get("new") === "1";

  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [creating, setCreating] = React.useState(openNew);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    const response = await fetch("/api/suppliers");
    if (response.ok) {
      const body = (await response.json()) as { suppliers: Supplier[] };
      setSuppliers(
        body.suppliers.map((supplier) => ({
          ...supplier,
          lastPurchaseAt: supplier.lastPurchaseAt ? new Date(supplier.lastPurchaseAt) : undefined,
        }))
      );
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = React.useCallback(
    async (payload: SupplierPayload) => {
      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not save the supplier");
        }
        setCreating(false);
        await load();
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push("/purchases")} className="text-sm text-blue-600">
            ← Purchases
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Suppliers</h1>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Add Supplier
          </button>
        )}
      </div>

      {creating && (
        <SupplierForm
          initial={null}
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
          onCancel={() => setCreating(false)}
        />
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading suppliers…</p>
      ) : (
        <SupplierList
          suppliers={suppliers}
          onOpen={(id) => router.push(`/purchases/suppliers/details?id=${id}`)}
        />
      )}
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <SuppliersContent />
    </Suspense>
  );
}
```

- [ ] **Step 5: Write the supplier profile page**

```tsx
// src/app/(dashboard)/purchases/suppliers/details/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import SupplierProfile from "@/modules/purchase/SupplierProfile";
import type { Purchase, Supplier } from "@/types/purchase";

function SupplierDetailsContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");

  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) {
      setError("No supplier selected");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/suppliers/${id}`, { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load the supplier");
        }
        const body = (await response.json()) as { supplier: Supplier; purchases: Purchase[] };
        setSupplier({
          ...body.supplier,
          lastPurchaseAt: body.supplier.lastPurchaseAt
            ? new Date(body.supplier.lastPurchaseAt)
            : undefined,
        });
        setPurchases(
          body.purchases.map((purchase) => ({
            ...purchase,
            purchaseDate: new Date(purchase.purchaseDate),
            dueDate: purchase.dueDate ? new Date(purchase.dueDate) : undefined,
          }))
        );
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError((caught as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading supplier…</div>;

  if (error || !supplier) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Supplier not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <button onClick={() => router.push("/purchases/suppliers")} className="text-sm text-blue-600">
        ← Suppliers
      </button>
      <SupplierProfile
        supplier={supplier}
        purchases={purchases}
        onOpenPurchase={(purchaseId) => router.push(`/purchases/details?id=${purchaseId}`)}
      />
    </div>
  );
}

export default function SupplierDetailsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <SupplierDetailsContent />
    </Suspense>
  );
}
```

- [ ] **Step 6: Verify and commit**

```bash
npm run type-check
git add src/modules/purchase "src/app/(dashboard)/purchases/suppliers"
git commit -m "feat: add supplier screens"
```

---

### Task 18: Navigation and the Service Details link

**Files:**
- Modify: `src/components/layout/SideNavBar.tsx` (the `navItems` array, lines 36-81)
- Modify: `src/components/layout/BottomNavBar.tsx` (the `navItems` array, lines 11-41)
- Modify: `src/app/api/purchases/route.ts` (support a `serviceId` query parameter)
- Create: `src/modules/purchase/ServicePartsOrdered.tsx`
- Modify: `src/components/service/ServiceDetailsView.tsx` (render the new section)

**Interfaces:**
- Consumes: `Purchase` from `@/types/purchase`; `formatRupees` from `@/lib/purchaseFormat`.
- Produces: `<ServicePartsOrdered serviceId={string} />`, and the nav entries.

`SideNavBar` carries a comment at line 27 — *"Only routes that exist. Add a row when its page ships — a dead nav item is worse than an absent one."* This task is where that row is earned, so do it only after Tasks 14–17 have landed.

- [ ] **Step 1: Add the sidebar entry**

Import `ShoppingCart` from `lucide-react` alongside the existing icons, then insert this object into `navItems` immediately after the `Technicians` entry:

```typescript
  {
    label: "Spare Purchases",
    href: "/purchases",
    icon: ShoppingCart,
    description: "Suppliers, purchases and dues",
    roles: ["shop_admin", "branch_admin"],
    prefetch: true,
  },
```

Technicians are deliberately absent from `roles` — purchasing is money-handling, and the API returns 403 for them regardless.

- [ ] **Step 2: Add the bottom-nav entry**

Import `ShoppingCartIcon` from `@heroicons/react/24/outline`, then append to `BottomNavBar`'s `navItems`:

```typescript
  {
    label: "Spare Purchases",
    href: "/purchases",
    icon: ShoppingCartIcon,
    roles: ["shop_admin", "branch_admin"],
  },
```

`BottomNavBar` renders the first items as tabs and the remainder in its "More" sheet (the second render loop around line 127). Appending at the end puts Spare Purchases in that sheet rather than crowding the primary tabs, which is what the spec asked for.

- [ ] **Step 3: Support filtering purchases by service**

In `src/app/api/purchases/route.ts`, inside `GET`, after `listPurchases(scope)` resolves, add:

```typescript
    const serviceId = request.nextUrl.searchParams.get("serviceId");
    const scoped = serviceId
      ? purchases.filter((purchase) =>
          purchase.items.some((item) => item.serviceId === serviceId)
        )
      : purchases;
```

Return `scoped` in place of `purchases` in the response, and keep passing the **unfiltered** `purchases` to `summarizePurchases` — the summary cards describe the whole branch, not one job.

Filtering in the route rather than the query is deliberate: `serviceId` lives inside an array of item objects, which Firestore cannot index for equality without a parallel array of ids. That denormalization is not worth adding for a rarely-used lookup.

- [ ] **Step 4: Write the parts-ordered component**

```tsx
// src/modules/purchase/ServicePartsOrdered.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import type { Purchase } from "@/types/purchase";

interface Props {
  serviceId: string;
}

/**
 * Read-only. Purchase entry lives in the purchases module — this section only
 * answers "did the part for this job arrive?".
 */
const ServicePartsOrdered = React.memo(function ServicePartsOrdered({ serviceId }: Props) {
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/purchases?serviceId=${encodeURIComponent(serviceId)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const body = (await response.json()) as { purchases: Purchase[] };
          setPurchases(body.purchases);
        }
        // A 403 is expected for technicians; the section simply stays empty.
      } catch {
        // Swallowed on purpose: this panel is supplementary to the job screen.
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [serviceId]);

  if (loading || purchases.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Parts ordered</h3>
      <ul className="space-y-2">
        {purchases.flatMap((purchase) =>
          purchase.items
            .filter((item) => item.serviceId === serviceId)
            .map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm last:border-0"
              >
                <div>
                  <p className="text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {purchase.ref} · {purchase.supplierName} · qty {item.quantity}
                  </p>
                </div>
                <span className="font-medium text-gray-900">{formatRupees(item.lineTotal)}</span>
              </li>
            ))
        )}
      </ul>
    </div>
  );
});

export default ServicePartsOrdered;
```

- [ ] **Step 5: Render it on Service Details**

In `src/components/service/ServiceDetailsView.tsx`, import the component and render it directly after the existing `partsUsed` block that ends around line 540:

```tsx
<ServicePartsOrdered serviceId={service.id} />
```

Leave the existing `partsUsed` section alone. The two answer different questions — what was *fitted* versus what was *bought* — and merging them is a later decision that belongs with the Inventory slice.

- [ ] **Step 6: Verify and commit**

```bash
npm run type-check
npm run build
git add src/components/layout src/components/service/ServiceDetailsView.tsx src/modules/purchase/ServicePartsOrdered.tsx src/app/api/purchases/route.ts
git commit -m "feat: add Spare Purchases navigation and service parts link"
```

---

### Task 19: Firestore configuration and full verification

**Files:**
- Modify: `firestore.indexes.json`
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: the collection names `purchases`, `suppliers`, `purchaseCounters`.
- Produces: deployed index definitions and read rules.

- [ ] **Step 1: Add the composite indexes**

Add these entries to the `indexes` array in `firestore.indexes.json`, matching the surrounding formatting exactly:

```json
{
  "collectionGroup": "purchases",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "shopId", "order": "ASCENDING" },
    { "fieldPath": "branchId", "order": "ASCENDING" },
    { "fieldPath": "purchaseDate", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "purchases",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "shopId", "order": "ASCENDING" },
    { "fieldPath": "supplierId", "order": "ASCENDING" },
    { "fieldPath": "purchaseDate", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "purchases",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "shopId", "order": "ASCENDING" },
    { "fieldPath": "paymentStatus", "order": "ASCENDING" },
    { "fieldPath": "dueDate", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "suppliers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "shopId", "order": "ASCENDING" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
}
```

- [ ] **Step 2: Add read rules**

In `firestore.rules`, add rules for the three new collections consistent with the existing ones. Writes stay closed to clients — every write goes through `adminDb`, which bypasses these rules entirely:

```
    match /suppliers/{supplierId} {
      allow read: if request.auth != null
        && resource.data.shopId == request.auth.token.shopId;
      allow write: if false;
    }

    match /purchases/{purchaseId} {
      allow read: if request.auth != null
        && resource.data.shopId == request.auth.token.shopId;
      allow write: if false;
    }

    match /purchaseCounters/{shopId} {
      allow read, write: if false;
    }
```

Read the existing rules file first and match its auth-claim style — if it uses a different mechanism than `request.auth.token.shopId`, follow that rather than this snippet.

- [ ] **Step 3: Run the full verification suite**

```bash
npm run type-check
npm run lint
npm test
npm run build
```

All four must pass. Do not proceed while any is failing.

- [ ] **Step 4: Deploy the Firestore configuration**

```bash
npm run firebase:deploy:indexes
npm run firebase:deploy:rules
```

Composite indexes take a few minutes to build. Purchase list queries will error until they finish.

- [ ] **Step 5: Manual verification**

Start the app (`npm run dev`) and walk the whole flow. Every step must pass before this module is called done:

1. Create a supplier from `/purchases/suppliers`.
2. Raise a 3-line purchase paid partly by UPI; confirm the grand total on the form matches the saved purchase.
3. Open the supplier profile; confirm `outstanding` equals the purchase's balance.
4. Record the remaining balance; confirm the status flips to **Paid** and the supplier's outstanding reaches zero.
5. Confirm **Edit Purchase** and **Cancel Purchase** are gone once a payment exists.
6. Create a second unpaid purchase, cancel it with a reason, and confirm the supplier's totals return to their pre-cancellation values.
7. Enter a purchase with a supplier bill number that already exists for that supplier; confirm the override prompt appears and that confirming records it.
8. Sign in as a `branch_admin` of a different branch; confirm the first branch's purchases are invisible in both the list and the summary cards.
9. Sign in as a technician; confirm no Spare Purchases nav entry appears, and that `curl` against `/api/purchases` returns 403.
10. Open a service whose id was linked on a purchase line; confirm the read-only **Parts ordered** section lists it.

- [ ] **Step 6: Commit**

```bash
git add firestore.indexes.json firestore.rules
git commit -m "feat: add Firestore indexes and rules for spare purchases"
```
