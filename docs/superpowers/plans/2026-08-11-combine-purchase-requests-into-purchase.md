# Combine Purchase Requests into a Purchase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a branch/shop admin select multiple `approved` purchase requests (raised by technicians from repairs, possibly across technicians/repairs) on the Purchase Requests tab and combine them into one itemized `Purchase`, instead of manually re-typing what was already requested.

**Architecture:** A new backend repo function (`createPurchaseFromRequests`) runs one Firestore transaction that re-reads the selected `PurchaseRequest` docs (never trusting the client for anything but per-item price), writes a new itemized `Purchase`, and marks every source request `purchased` with a backlink. A new API route exposes it. On the frontend, `PurchaseRequestList` gains a checkbox selection mode, the Requests page gains a "Create Purchase" flow that hands off to the existing purchase-creation surface (slide-over on desktop, full page on mobile), and a new `CombinedPurchaseForm` (sibling to the existing lump-sum `PurchaseForm`) renders the selected items read-only with one editable price per row.

**Tech Stack:** Next.js App Router, TypeScript, Firestore (`firebase-admin`), `@tanstack/react-table`, Vitest.

## Global Constraints

- Only `approved` requests are selectable; combining re-validates this server-side regardless of what the client sends (spec: "Selectable statuses").
- A `Purchase` has one `branchId`/`supplierId` — selection is locked to one branch, enforced both in the UI and in the transaction (spec: "Branch scoping").
- Every combined request moves to a new `purchased` status with `purchaseId`/`purchaseRef` set, removing it from the selectable pool (spec: "Post-combine status").
- Item name/brand/model/quantity are always re-read from the stored `PurchaseRequest` inside the transaction; only `purchasePrice` per item comes from the client (spec: "Server-side item trust").
- Items are never merged across requests — one purchase-item row per source request-item, tagged with `purchaseRequestId` (spec: "Item merging", "Traceability").
- Editing a purchase with more than one item must be blocked in the UI — the existing edit form collapses multi-item purchases back to a single generic line (spec: "Editing after creation").
- No discount/GST/transport inputs on the combine screen — default to zero, matching the spec's UI section.

---

## Task 1: Data model — types, purchased-status compile fixes, and request-validation parser

**Files:**
- Modify: `src/types/purchaseRequest.ts`
- Modify: `src/types/purchase.ts`
- Modify: `src/modules/purchase/PurchaseRequestList.tsx:31-36` (STATUS_LABEL only)
- Modify: `src/modules/purchase/PurchaseRequestDetails.tsx:13-18` and `:76-80`
- Modify: `src/lib/purchaseValidation.ts`
- Test: `src/lib/purchaseValidation.test.ts`

**Interfaces:**
- Produces: `PurchaseRequestStatus` gains `"purchased"`; `PurchaseRequest` gains `purchaseId?: string`, `purchaseRef?: string`. `PurchaseItem` gains `purchaseRequestId?: string`. `CreatePurchaseFromRequestsInput` and `parseCreatePurchaseFromRequestsInput(body: unknown): CreatePurchaseFromRequestsInput` in `src/lib/purchaseValidation.ts` — later tasks import both.

- [ ] **Step 1: Extend `PurchaseRequestStatus` and `PurchaseRequest`**

In `src/types/purchaseRequest.ts`, change line 1 and the fields after `rejectReason`:

```ts
export type PurchaseRequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "purchased";
```

```ts
  decidedBy?: { userId: string; name: string };
  decidedAt?: Date;
  /** Required when status is "rejected". */
  rejectReason?: string;
  /** Set when status is "purchased". */
  purchaseId?: string;
  purchaseRef?: string;

  createdAt: Date;
  updatedAt: Date;
```

- [ ] **Step 2: Add `purchaseRequestId` to `PurchaseItem`**

In `src/types/purchase.ts`, in the `PurchaseItem` interface (currently lines 61-77), add after `serviceRef?: string;`:

```ts
  /** Set when this line came from a combined purchase-request. */
  purchaseRequestId?: string;
```

- [ ] **Step 3: Fix the two UI files whose `Record<PurchaseRequestStatus, …>` maps must now be exhaustive**

These two files use `Record<PurchaseRequestStatus, {...}>` for status badges; TypeScript will now fail to compile until `"purchased"` is added to both.

In `src/modules/purchase/PurchaseRequestList.tsx`, replace:

```ts
const STATUS_LABEL: Record<PurchaseRequestStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600" },
};
```

with:

```ts
const STATUS_LABEL: Record<PurchaseRequestStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600" },
  purchased: { label: "Purchased", className: "bg-blue-100 text-blue-700" },
};
```

In `src/modules/purchase/PurchaseRequestDetails.tsx`, apply the identical `STATUS_LABEL` change (same object, same fix). Then, right after the existing rejected-reason block:

```tsx
        {request.status === "rejected" && request.rejectReason && (
          <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            Reason: {request.rejectReason}
          </p>
        )}
```

add:

```tsx
        {request.status === "purchased" && request.purchaseId && (
          <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
            Combined into{" "}
            <Link href={`/purchases/details?id=${request.purchaseId}`} className="font-medium hover:underline">
              {request.purchaseRef ?? "purchase"}
            </Link>
          </p>
        )}
```

(`Link` is already imported in this file.)

- [ ] **Step 4: Add `parseCreatePurchaseFromRequestsInput` to `purchaseValidation.ts`**

Append to the end of `src/lib/purchaseValidation.ts` (after `parseRecordRefundInput`):

```ts
export interface CreatePurchaseFromRequestsInput {
  supplierId: string;
  purchaseRequestIds: string[];
  prices: Record<string, number>;
  supplierInvoiceNo?: string;
  purchaseDate: Date;
  /** Absent means the bill was raised on credit. */
  initialPayment?: RecordPaymentInput;
}

/**
 * Validates only the shape of a combine-requests submission. Whether each
 * request id actually exists, is `approved`, and shares one branch is a
 * repo-layer concern — the repo re-reads the requests themselves rather than
 * trusting anything but the per-item price from this input.
 */
export function parseCreatePurchaseFromRequestsInput(body: unknown): CreatePurchaseFromRequestsInput {
  const raw = asObject(body);

  const supplierId = requireString(raw, "supplierId");
  const purchaseDate = requireDate(raw, "purchaseDate", "purchase date");

  if (!Array.isArray(raw.purchaseRequestIds) || raw.purchaseRequestIds.length === 0) {
    throw new ApiError(400, "At least one purchase request must be selected");
  }
  const purchaseRequestIds = raw.purchaseRequestIds.map((value, index) => {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ApiError(400, `purchaseRequestIds[${index}] must be a non-empty string`);
    }
    return value;
  });

  const pricesRaw = raw.prices;
  if (typeof pricesRaw !== "object" || pricesRaw === null || Array.isArray(pricesRaw)) {
    throw new ApiError(400, "prices must be an object mapping item id to price");
  }
  const prices: Record<string, number> = {};
  for (const [itemId, value] of Object.entries(pricesRaw as Record<string, unknown>)) {
    const parsed = typeof value === "string" ? Number(value) : value;
    if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed <= 0) {
      throw new ApiError(400, `Price for item ${itemId} must be a positive number`);
    }
    prices[itemId] = parsed;
  }

  const initialPayment =
    raw.initialPayment === undefined || raw.initialPayment === null
      ? undefined
      : parsePaymentFields(asObject(raw.initialPayment, "initialPayment"));

  if (initialPayment && Object.keys(prices).length === 0) {
    throw new ApiError(400, "At least one priced item is required");
  }

  return {
    supplierId,
    purchaseRequestIds,
    prices,
    supplierInvoiceNo: optionalString(raw, "supplierInvoiceNo"),
    purchaseDate,
    initialPayment,
  };
}
```

(`parsePaymentFields`, `asObject`, `requireString`, `requireDate`, `optionalString`, `ApiError` are all already defined/imported earlier in this file.)

- [ ] **Step 5: Write the failing validation tests**

Append to `src/lib/purchaseValidation.test.ts` (after the last `describe`, currently ending at line 361). First add `parseCreatePurchaseFromRequestsInput` to the existing import block at the top of the file (alongside `parseCreatePurchaseInput`, etc.), then add:

```ts
describe("parseCreatePurchaseFromRequestsInput", () => {
  function validBody(overrides: Record<string, unknown> = {}) {
    return {
      supplierId: "sup-1",
      purchaseRequestIds: ["pr-1", "pr-2"],
      prices: { "item-1": 500, "item-2": 300 },
      purchaseDate: "2026-08-11",
      ...overrides,
    };
  }

  it("parses a valid combine request", () => {
    const input = parseCreatePurchaseFromRequestsInput(validBody());
    expect(input.supplierId).toBe("sup-1");
    expect(input.purchaseRequestIds).toEqual(["pr-1", "pr-2"]);
    expect(input.prices).toEqual({ "item-1": 500, "item-2": 300 });
  });

  it("400s an empty purchaseRequestIds list", () => {
    expect(() =>
      parseCreatePurchaseFromRequestsInput(validBody({ purchaseRequestIds: [] }))
    ).toThrow("At least one purchase request must be selected");
  });

  it("400s a non-string entry in purchaseRequestIds", () => {
    expect(() =>
      parseCreatePurchaseFromRequestsInput(validBody({ purchaseRequestIds: [42] }))
    ).toThrow();
  });

  it("400s a zero price", () => {
    expect(() =>
      parseCreatePurchaseFromRequestsInput(validBody({ prices: { "item-1": 0 } }))
    ).toThrow();
  });

  it("400s a non-object prices field", () => {
    expect(() => parseCreatePurchaseFromRequestsInput(validBody({ prices: [1, 2] }))).toThrow();
  });

  it("accepts an optional initial payment", () => {
    const input = parseCreatePurchaseFromRequestsInput(
      validBody({ initialPayment: { amount: 400, method: "cash", paidAt: "2026-08-11" } })
    );
    expect(input.initialPayment).toMatchObject({ amount: 400, method: "cash" });
  });
});
```

- [ ] **Step 6: Run the tests to see the new ones pass and nothing else break**

Run: `npx vitest run src/lib/purchaseValidation.test.ts`
Expected: all tests PASS, including the six new ones.

- [ ] **Step 7: Type-check the whole project**

Run: `npm run type-check`
Expected: no errors (this catches any other file with an unhandled `PurchaseRequestStatus` switch/map you may have missed).

- [ ] **Step 8: Commit**

```bash
git add src/types/purchaseRequest.ts src/types/purchase.ts src/modules/purchase/PurchaseRequestList.tsx src/modules/purchase/PurchaseRequestDetails.tsx src/lib/purchaseValidation.ts src/lib/purchaseValidation.test.ts
git commit -m "feat: add purchased status and combine-requests validation"
```

---

## Task 2: Repo — `createPurchaseFromRequests`

**Files:**
- Modify: `src/lib/purchaseRequestRepo.ts:33-56` (`mapPurchaseRequest`)
- Modify: `src/lib/purchaseRepo.ts`
- Test: `src/lib/purchaseRepo.test.ts`

**Interfaces:**
- Consumes: `CreatePurchaseFromRequestsInput` from `src/lib/purchaseValidation.ts` (Task 1); `PURCHASE_REQUESTS` constant already exported from `src/lib/purchaseRequestRepo.ts`.
- Produces: `createPurchaseFromRequests(input: CreatePurchaseFromRequestsArgs): Promise<Purchase>` where `CreatePurchaseFromRequestsArgs = CreatePurchaseFromRequestsInput & { shopId: string; callerBranchId?: string; purchasedBy: { userId: string; name: string } }`, exported from `src/lib/purchaseRepo.ts` — Task 3's API route calls this directly.

- [ ] **Step 1: Add `purchaseId`/`purchaseRef` to the request mapper**

In `src/lib/purchaseRequestRepo.ts`, in `mapPurchaseRequest` (lines 33-56), add two lines after `rejectReason`:

```ts
    rejectReason: (data.rejectReason as string) || undefined,
    purchaseId: (data.purchaseId as string) || undefined,
    purchaseRef: (data.purchaseRef as string) || undefined,
    createdAt: toDate(data.createdAt),
```

- [ ] **Step 2: Write the failing repo tests**

In `src/lib/purchaseRepo.test.ts`, add to the top-level imports:

```ts
import { createPurchaseFromRequests, /* ...existing names... */ } from "@/lib/purchaseRepo";
import { getPurchaseRequest } from "@/lib/purchaseRequestRepo";
```

(Keep every existing name already imported from `@/lib/purchaseRepo` — just add `createPurchaseFromRequests` to that same import list.)

Then append this helper near the top (after the existing `seedSupplier`/`purchaseInput` helpers) and a new `describe` block at the end of the file (after `listItemSuggestions`, currently ending at line 584):

```ts
function seedPurchaseRequest(id: string, overrides: Record<string, unknown> = {}) {
  hooks.__seed("purchaseRequests", id, {
    shopId: "shop-1",
    branchId: "branch-1",
    ref: `PR-2026-${id}`,
    serviceId: "service-1",
    serviceRef: "abc12345",
    customerName: "Naseem",
    items: [{ id: `${id}-item-1`, name: "Display", brand: "Samsung", model: "A34", quantity: 2 }],
    status: "approved",
    requestedBy: { userId: "tech-1", name: "Anshid" },
    requestedAt: new Date(2026, 7, 1),
    createdAt: new Date(2026, 7, 1),
    updatedAt: new Date(2026, 7, 1),
    ...overrides,
  });
}

function combineInput(overrides: Record<string, unknown> = {}) {
  return {
    shopId: "shop-1",
    supplierId: "sup-1",
    purchaseRequestIds: ["pr-1", "pr-2"],
    prices: { "pr-1-item-1": 900, "pr-2-item-1": 400 },
    purchaseDate: new Date(2026, 7, 5),
    purchasedBy: { userId: "admin-1", name: "Admin" },
    ...overrides,
  };
}

describe("createPurchaseFromRequests", () => {
  beforeEach(() => {
    seedPurchaseRequest("pr-1");
    seedPurchaseRequest("pr-2", {
      items: [{ id: "pr-2-item-1", name: "Battery", quantity: 1 }],
    });
  });

  it("combines every selected request's items into one itemized purchase", async () => {
    const purchase = await createPurchaseFromRequests(combineInput());
    expect(purchase.items).toHaveLength(2);
    expect(purchase.subtotal).toBe(900 * 2 + 400 * 1);
    expect(purchase.items.map((item) => item.purchaseRequestId).sort()).toEqual(["pr-1", "pr-2"]);
  });

  it("marks every source request purchased with a backlink", async () => {
    const purchase = await createPurchaseFromRequests(combineInput());
    const pr1 = await getPurchaseRequest("shop-1", "pr-1");
    const pr2 = await getPurchaseRequest("shop-1", "pr-2");
    expect(pr1.status).toBe("purchased");
    expect(pr1.purchaseId).toBe(purchase.id);
    expect(pr1.purchaseRef).toBe(purchase.ref);
    expect(pr2.status).toBe("purchased");
  });

  it("409s when a selected request is not approved", async () => {
    seedPurchaseRequest("pr-3", { status: "pending" });
    await expect(
      createPurchaseFromRequests(
        combineInput({ purchaseRequestIds: ["pr-1", "pr-3"], prices: { "pr-1-item-1": 900 } })
      )
    ).rejects.toMatchObject({ status: 409 });
  });

  it("409s when selected requests span different branches", async () => {
    seedPurchaseRequest("pr-4", {
      branchId: "branch-2",
      items: [{ id: "pr-4-item-1", name: "Cable", quantity: 1 }],
    });
    await expect(
      createPurchaseFromRequests(
        combineInput({
          purchaseRequestIds: ["pr-1", "pr-4"],
          prices: { "pr-1-item-1": 900, "pr-4-item-1": 50 },
        })
      )
    ).rejects.toMatchObject({ status: 409 });
  });

  it("403s when a selected request belongs to another shop", async () => {
    seedPurchaseRequest("pr-5", { shopId: "shop-2" });
    await expect(
      createPurchaseFromRequests(
        combineInput({ purchaseRequestIds: ["pr-1", "pr-5"], prices: { "pr-1-item-1": 900 } })
      )
    ).rejects.toMatchObject({ status: 403 });
  });

  it("400s when a price is missing for one of the requested items", async () => {
    await expect(
      createPurchaseFromRequests(combineInput({ prices: { "pr-1-item-1": 900 } }))
    ).rejects.toMatchObject({ status: 400 });
  });

  it("403s a branch_admin combining requests outside their own branch", async () => {
    await expect(
      createPurchaseFromRequests(combineInput({ callerBranchId: "branch-2" }))
    ).rejects.toMatchObject({ status: 403 });
  });

  it("writes the purchase, the counter, the supplier and every request update in ONE transaction", async () => {
    await createPurchaseFromRequests(combineInput());
    expect(hooks.__transactionCount()).toBe(1);
  });

  it("never deletes anything", async () => {
    await createPurchaseFromRequests(combineInput());
    expect(hooks.__writes().some((w) => w.op === "delete")).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run src/lib/purchaseRepo.test.ts`
Expected: FAIL — `createPurchaseFromRequests is not a function` (or similar import error).

- [ ] **Step 4: Implement `createPurchaseFromRequests` in `purchaseRepo.ts`**

Add to the imports at the top of `src/lib/purchaseRepo.ts`:

```ts
import { PURCHASE_REQUESTS } from "@/lib/purchaseRequestRepo";
```

and add `CreatePurchaseFromRequestsInput` to the existing `import type { CreatePurchaseInput, RecordPaymentInput, RecordReturnInput } from "@/lib/purchaseValidation";` line, so it reads:

```ts
import type {
  CreatePurchaseFromRequestsInput,
  CreatePurchaseInput,
  RecordPaymentInput,
  RecordReturnInput,
} from "@/lib/purchaseValidation";
```

Then add this block after `createPurchase` (after its closing `}` and before `/** Loads a purchase inside a transaction... */`):

```ts
interface CreatePurchaseFromRequestsArgs extends CreatePurchaseFromRequestsInput {
  shopId: string;
  /** Set for a branch_admin so the transaction rejects requests outside their own branch; absent for a shop_admin, who may combine any branch's requests within the shop. */
  callerBranchId?: string;
  purchasedBy: { userId: string; name: string };
}

/** Loads a purchase-request doc inside a transaction and enforces tenancy + eligibility. */
async function loadRequestForCombine(
  tx: Transaction,
  ref: DocumentReference,
  shopId: string
): Promise<Record<string, unknown>> {
  const snap = await tx.get(ref);
  if (!snap.exists) {
    throw new ApiError(404, "Purchase request not found");
  }
  const data = snap.data() as Record<string, unknown>;
  if (!data.shopId || data.shopId !== shopId) {
    throw new ApiError(403, "Purchase request does not belong to this shop");
  }
  if (data.status !== "approved") {
    throw new ApiError(409, `Request ${(data.ref as string) || ref.id} is not approved`);
  }
  return data;
}

/**
 * Combines one or more APPROVED purchase requests into a single itemized
 * purchase, in ONE transaction alongside marking every source request
 * "purchased". Item name/brand/model/quantity are re-read from each
 * request's own stored data — never trusted from the client — only the
 * per-item price comes from the caller.
 */
export async function createPurchaseFromRequests(
  input: CreatePurchaseFromRequestsArgs
): Promise<Purchase> {
  const supplierRef = adminDb.collection(SUPPLIERS).doc(input.supplierId);
  const counterRef = adminDb.collection(PURCHASE_COUNTERS).doc(input.shopId);
  const purchaseRef = adminDb.collection(PURCHASES).doc();
  const requestRefs = input.purchaseRequestIds.map((id) =>
    adminDb.collection(PURCHASE_REQUESTS).doc(id)
  );
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    const requests: Record<string, unknown>[] = [];
    for (const ref of requestRefs) {
      requests.push(await loadRequestForCombine(tx, ref, input.shopId));
    }

    const branchId = requests[0].branchId as string;
    if (requests.some((request) => request.branchId !== branchId)) {
      throw new ApiError(409, "All selected requests must belong to the same branch");
    }
    if (input.callerBranchId && input.callerBranchId !== branchId) {
      throw new ApiError(403, "Not permitted to create purchases in this branch");
    }

    const persistedItems: Record<string, unknown>[] = [];
    requests.forEach((request, index) => {
      const requestItems = Array.isArray(request.items)
        ? (request.items as Record<string, unknown>[])
        : [];
      for (const item of requestItems) {
        const itemId = item.id as string;
        const purchasePrice = input.prices[itemId];
        if (typeof purchasePrice !== "number") {
          throw new ApiError(
            400,
            `Missing price for "${item.name as string}" (request ${request.ref as string})`
          );
        }
        const quantity = (item.quantity as number) || 0;
        persistedItems.push({
          id: randomUUID(),
          name: (item.name as string) || "",
          brand: (item.brand as string) || null,
          model: (item.model as string) || null,
          quantity,
          purchasePrice,
          sellingPrice: null,
          warrantyMonths: null,
          remarks: null,
          serviceId: (request.serviceId as string) || null,
          serviceRef: (request.serviceRef as string) || null,
          purchaseRequestId: requestRefs[index].id,
          lineTotal: lineTotalOf(quantity, purchasePrice),
          returnedQuantity: 0,
        });
      }
    });

    if (persistedItems.length === 0) {
      throw new ApiError(400, "Selected requests have no items");
    }

    const totals = computeTotals({
      items: persistedItems.map((item) => ({
        quantity: item.quantity as number,
        purchasePrice: item.purchasePrice as number,
      })),
      discount: { mode: "amount", value: 0 },
      gstRate: 0,
      transportCharge: 0,
    });

    if (input.initialPayment && input.initialPayment.amount > totals.grandTotal) {
      throw new ApiError(400, "Payment cannot exceed the grand total");
    }

    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;
    assertSupplierInShop(supplier, input.shopId, input.supplierId);
    if (supplier.branchId !== branchId) {
      throw new ApiError(400, "Supplier belongs to a different branch");
    }

    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists
      ? (counterSnap.data() as unknown as RefCounters)
      : undefined;
    const purchaseYear = input.purchaseDate.getFullYear();
    const { counters, seq } = nextRefCounter(current, purchaseYear);
    const ref = formatPurchaseRef(purchaseYear, seq);

    const payments = input.initialPayment
      ? [buildPayment(input.initialPayment, input.purchasedBy.userId)]
      : [];
    const summary = summarizePurchaseMoney(
      totals.grandTotal,
      payments as Array<{ amount: number }>,
      [],
      []
    );

    const purchase: Record<string, unknown> = {
      shopId: input.shopId,
      branchId,
      ref,
      supplierInvoiceNo: input.supplierInvoiceNo ?? null,
      supplierId: input.supplierId,
      supplierName: (supplier.name as string) || "",
      purchaseDate: input.purchaseDate,
      purchasedBy: {
        userId: input.purchasedBy.userId,
        name: input.purchasedBy.name || "",
      },
      items: persistedItems,
      subtotal: totals.subtotal,
      discount: { mode: "amount", value: 0, amount: totals.discountAmount },
      gstRate: 0,
      gstAmount: totals.gstAmount,
      transportCharge: totals.transportCharge,
      grandTotal: totals.grandTotal,
      payments,
      paidAmount: summary.paidAmount,
      balance: summary.balance,
      paymentStatus: summary.paymentStatus,
      dueDate: null,
      returns: [],
      returnedAmount: 0,
      refunds: [],
      refundReceived: 0,
      refundDue: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    tx.set(purchaseRef, purchase);
    tx.set(counterRef, counters);
    tx.update(supplierRef, {
      totalPurchased: roundMoney(((supplier.totalPurchased as number) || 0) + totals.grandTotal),
      totalPaid: roundMoney(((supplier.totalPaid as number) || 0) + summary.paidAmount),
      outstanding: roundMoney(((supplier.outstanding as number) || 0) + summary.balance),
      lastPurchaseAt: input.purchaseDate,
      updatedAt: now,
    });

    requestRefs.forEach((requestDocRef) => {
      tx.update(requestDocRef, {
        status: "purchased",
        purchaseId: purchaseRef.id,
        purchaseRef: ref,
        updatedAt: now,
      });
    });

    return purchase;
  });

  return mapPurchase(purchaseRef.id, data);
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run src/lib/purchaseRepo.test.ts`
Expected: PASS — all existing tests plus the new `createPurchaseFromRequests` describe block.

- [ ] **Step 6: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/purchaseRequestRepo.ts src/lib/purchaseRepo.ts src/lib/purchaseRepo.test.ts
git commit -m "feat: combine approved purchase requests into a single purchase"
```

---

## Task 3: API route — `POST /api/purchases/from-requests`

**Files:**
- Create: `src/app/api/purchases/from-requests/route.ts`
- Test: `src/app/api/purchases/from-requests/route.test.ts`

**Interfaces:**
- Consumes: `createPurchaseFromRequests` (Task 2), `parseCreatePurchaseFromRequestsInput` (Task 1).
- Produces: `POST /api/purchases/from-requests` — request body `{ supplierId, purchaseRequestIds, prices, supplierInvoiceNo?, purchaseDate, initialPayment? }`, response `{ purchase: Purchase }` (201) — Task 8's `CombinedPurchaseForm`/`PurchaseFormHost` call this endpoint.

- [ ] **Step 1: Write the failing route test**

Create `src/app/api/purchases/from-requests/route.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const createPurchaseFromRequests = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/purchaseRepo", () => ({ createPurchaseFromRequests }));

const { ApiError } = await import("@/lib/apiAuth");
const { POST } = await import("@/app/api/purchases/from-requests/route");

const shopAdmin = {
  id: "admin-1",
  role: "shop_admin",
  shopId: "shop-1",
  branchId: undefined,
  email: "a@b.com",
  name: "Shop Admin",
};

const branchAdmin = {
  id: "admin-2",
  role: "branch_admin",
  shopId: "shop-1",
  branchId: "branch-1",
  email: "b@b.com",
  name: "Branch Admin",
};

const technician = {
  id: "tech-1",
  role: "technician",
  shopId: "shop-1",
  branchId: "branch-1",
  email: "t@b.com",
  name: "Anshid",
};

function body(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: "sup-1",
    purchaseRequestIds: ["pr-1", "pr-2"],
    prices: { "item-1": 500, "item-2": 300 },
    purchaseDate: "2026-08-11",
    ...overrides,
  };
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/purchases/from-requests", {
    method: "POST",
    body: JSON.stringify(body(overrides)),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/purchases/from-requests", () => {
  it("creates a purchase for a shop_admin with no branch restriction", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    createPurchaseFromRequests.mockResolvedValue({ id: "pur-1", ref: "PUR-2026-0001" });

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
    expect(createPurchaseFromRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        callerBranchId: undefined,
        supplierId: "sup-1",
        purchaseRequestIds: ["pr-1", "pr-2"],
        purchasedBy: { userId: "admin-1", name: "Shop Admin" },
      })
    );
  });

  it("pins a branch_admin's callerBranchId to their own branch", async () => {
    requireUser.mockResolvedValue(branchAdmin);
    createPurchaseFromRequests.mockResolvedValue({ id: "pur-1", ref: "PUR-2026-0001" });

    await POST(makeRequest());

    expect(createPurchaseFromRequests).toHaveBeenCalledWith(
      expect.objectContaining({ callerBranchId: "branch-1" })
    );
  });

  it("403s a technician", async () => {
    requireUser.mockResolvedValue(technician);

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    expect(createPurchaseFromRequests).not.toHaveBeenCalled();
  });

  it("400s when purchaseRequestIds is empty", async () => {
    requireUser.mockResolvedValue(shopAdmin);

    const response = await POST(makeRequest({ purchaseRequestIds: [] }));

    expect(response.status).toBe(400);
    expect(createPurchaseFromRequests).not.toHaveBeenCalled();
  });

  it("400s when a price is not a positive number", async () => {
    requireUser.mockResolvedValue(shopAdmin);

    const response = await POST(makeRequest({ prices: { "item-1": 0 } }));

    expect(response.status).toBe(400);
    expect(createPurchaseFromRequests).not.toHaveBeenCalled();
  });

  it("propagates a 409 raised by the repo (e.g. mixed-branch selection)", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    createPurchaseFromRequests.mockRejectedValue(
      new ApiError(409, "All selected requests must belong to the same branch")
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run src/app/api/purchases/from-requests/route.test.ts`
Expected: FAIL — module `src/app/api/purchases/from-requests/route.ts` does not exist.

- [ ] **Step 3: Implement the route**

Create `src/app/api/purchases/from-requests/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

import { ApiError, readJsonBody, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { createPurchaseFromRequests } from "@/lib/purchaseRepo";
import { parseCreatePurchaseFromRequestsInput } from "@/lib/purchaseValidation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.shopId) {
      throw new ApiError(403, "User is not associated with a shop");
    }
    if (user.role === "technician") {
      throw new ApiError(403, "Not permitted to create purchases");
    }
    if (user.role === "branch_admin" && !user.branchId) {
      throw new ApiError(403, "User is not associated with a branch");
    }

    const input = parseCreatePurchaseFromRequestsInput(await readJsonBody(request));

    const purchase = await createPurchaseFromRequests({
      ...input,
      shopId: user.shopId,
      // The repo pins a branch_admin to their own branch and derives the
      // purchase's branch from the requests themselves for a shop_admin.
      callerBranchId: user.role === "branch_admin" ? user.branchId : undefined,
      purchasedBy: { userId: user.id, name: user.name || "" },
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run src/app/api/purchases/from-requests/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/purchases/from-requests/route.ts src/app/api/purchases/from-requests/route.test.ts
git commit -m "feat: add POST /api/purchases/from-requests"
```

---

## Task 4: `PurchaseRequestList` — checkbox selection mode

**Files:**
- Modify: `src/modules/purchase/PurchaseRequestList.tsx`

**Interfaces:**
- Produces: exported `PurchaseRequestSelection` interface and a new optional `selection` prop on `PurchaseRequestList` — Task 5 (`purchases/requests/page.tsx`) constructs and passes this.

- [ ] **Step 1: Add the `PurchaseRequestSelection` type and extend `Props`**

In `src/modules/purchase/PurchaseRequestList.tsx`, after the existing `Props` interface (lines 38-46), add:

```ts
export interface PurchaseRequestSelection {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  isSelectable: (request: PurchaseRequest) => boolean;
}
```

and add a field to `Props`:

```ts
interface Props {
  requests: PurchaseRequest[];
  onOpen: (id: string) => void;
  branches?: Branch[];
  showBranchColumn?: boolean;
  showRequestedByColumn?: boolean;
  /** When set, renders a checkbox per eligible row instead of opening on click alone. */
  selection?: PurchaseRequestSelection;
}
```

- [ ] **Step 2: Add the checkbox to the mobile `RequestCard`**

Replace the `RequestCard` function signature and its opening JSX:

```tsx
function RequestCard({
  request,
  onOpen,
  branches,
  showBranchColumn,
  showRequestedByColumn,
}: {
  request: PurchaseRequest;
  onOpen: (id: string) => void;
  branches: Branch[];
  showBranchColumn: boolean;
  showRequestedByColumn: boolean;
}) {
  const status = STATUS_LABEL[request.status];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(request.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(request.id);
        }
      }}
      className="w-full cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
```

with:

```tsx
function RequestCard({
  request,
  onOpen,
  branches,
  showBranchColumn,
  showRequestedByColumn,
  selection,
}: {
  request: PurchaseRequest;
  onOpen: (id: string) => void;
  branches: Branch[];
  showBranchColumn: boolean;
  showRequestedByColumn: boolean;
  selection?: PurchaseRequestSelection;
}) {
  const status = STATUS_LABEL[request.status];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(request.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(request.id);
        }
      }}
      className="w-full cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        {selection && (
          <input
            type="checkbox"
            checked={selection.selectedIds.has(request.id)}
            disabled={!selection.isSelectable(request)}
            onClick={(event) => event.stopPropagation()}
            onChange={() => selection.onToggle(request.id)}
            aria-label={`Select request ${request.ref}`}
            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          />
        )}
        <div className="min-w-0 flex-1">
```

(This adds one closing `</div>` requirement — the existing `<div className="min-w-0">` becomes `<div className="min-w-0 flex-1">` and stays the sibling of the new checkbox `<input>`; no other JSX in the card changes.)

Then update the mobile list's render call (inside the `if (requests.length === 0)` guard's sibling block, in the `<div className="space-y-3 md:hidden">` map):

```tsx
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <RequestCard
            key={row.id}
            request={row.original}
            onOpen={onOpen}
            branches={branches}
            showBranchColumn={showBranchColumn}
            showRequestedByColumn={showRequestedByColumn}
            selection={selection}
          />
        ))}
      </div>
```

- [ ] **Step 3: Add the checkbox column to the desktop table**

Update the component's destructured props to include `selection`:

```ts
const PurchaseRequestList = React.memo(function PurchaseRequestList({
  requests,
  onOpen,
  branches = [],
  showBranchColumn = false,
  showRequestedByColumn = true,
  selection,
}: Props) {
```

In the `columns` `useMemo` (lines 126-187), prepend a display column when `selection` is set and add `selection` to the dependency array:

```ts
  const columns = useMemo(
    () => [
      ...(selection
        ? [
            columnHelper.display({
              id: "select",
              header: "",
              cell: ({ row }) => {
                const request = row.original;
                return (
                  <input
                    type="checkbox"
                    checked={selection.selectedIds.has(request.id)}
                    disabled={!selection.isSelectable(request)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => selection.onToggle(request.id)}
                    aria-label={`Select request ${request.ref}`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                );
              },
            }),
          ]
        : []),
      columnHelper.accessor("ref", {
```

(keep everything from `columnHelper.accessor("ref", {` onward exactly as-is), and change the closing dependency array from:

```ts
    [showBranchColumn, branches, showRequestedByColumn]
```

to:

```ts
    [showBranchColumn, branches, showRequestedByColumn, selection]
```

- [ ] **Step 4: Type-check and build**

Run: `npm run type-check && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/purchase/PurchaseRequestList.tsx
git commit -m "feat: add checkbox selection mode to PurchaseRequestList"
```

---

## Task 5: Requests page — "Create Purchase" selection flow

**Files:**
- Modify: `src/app/(dashboard)/purchases/requests/page.tsx`

**Interfaces:**
- Consumes: `PurchaseRequestSelection` type and `selection` prop from `PurchaseRequestList` (Task 4).
- Produces: navigates to `/purchases?new=1&fromRequests=<comma-separated ids>` (desktop) or `/purchases/new?fromRequests=<ids>` (mobile) — Task 8 reads this query param.

- [ ] **Step 1: Rewrite `PurchaseRequestsPageContent` with selection state and the Create Purchase flow**

Replace the full contents of `src/app/(dashboard)/purchases/requests/page.tsx` with:

```tsx
// src/app/(dashboard)/purchases/requests/page.tsx
"use client";

import { useRouter } from "next/navigation";
import React, { Suspense } from "react";

import { Button } from "@/components/ui/Button";
import { ListPageSkeleton, TableSkeleton } from "@/components/ui/PageSkeleton";
import Toast from "@/components/ui/Toast";
import { useBranches, useUser } from "@/hooks";
import { useCrossNavToast } from "@/hooks/useCrossNavToast";
import PurchaseRequestList, {
  type PurchaseRequestSelection,
} from "@/modules/purchase/PurchaseRequestList";
import PurchaseTabs from "@/modules/purchase/PurchaseTabs";
import type { PurchaseRequest } from "@/types/purchaseRequest";

const DESKTOP_MQ = "(min-width: 768px)";

function isDesktopViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches;
}

function reviveRequests(requests: PurchaseRequest[]): PurchaseRequest[] {
  return requests.map((request) => ({
    ...request,
    requestedAt: new Date(request.requestedAt),
    decidedAt: request.decidedAt ? new Date(request.decidedAt) : undefined,
  }));
}

function PurchaseRequestsPageContent() {
  const router = useRouter();
  const { user } = useUser();
  const isShopAdmin = user?.role === "shop_admin";
  const isTechnician = user?.role === "technician";
  const canCombine = user?.role === "shop_admin" || user?.role === "branch_admin";
  const { branches } = useBranches(user?.shopId);

  const [requests, setRequests] = React.useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = useCrossNavToast("/purchases/requests");

  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/purchase-requests", { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load purchase requests");
        }
        const body = (await response.json()) as { purchaseRequests: PurchaseRequest[] };
        setRequests(reviveRequests(body.purchaseRequests));
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

  const handleOpen = React.useCallback(
    (id: string) => router.push(`/purchases/requests/details?id=${id}`),
    [router]
  );

  const selectedRequests = React.useMemo(
    () => requests.filter((request) => selectedIds.has(request.id)),
    [requests, selectedIds]
  );
  const lockedBranchId = selectedRequests[0]?.branchId;

  const isSelectable = React.useCallback(
    (request: PurchaseRequest) =>
      request.status === "approved" && (!lockedBranchId || request.branchId === lockedBranchId),
    [lockedBranchId]
  );

  const toggleSelected = React.useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selection: PurchaseRequestSelection | undefined = selectionMode
    ? { selectedIds, onToggle: toggleSelected, isSelectable }
    : undefined;

  const startSelection = React.useCallback(() => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }, []);

  const cancelSelection = React.useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const combineSelected = React.useCallback(() => {
    const ids = [...selectedIds].join(",");
    if (!ids) return;
    if (isDesktopViewport()) {
      router.push(`/purchases?new=1&fromRequests=${encodeURIComponent(ids)}`);
      return;
    }
    router.push(`/purchases/new?fromRequests=${encodeURIComponent(ids)}`);
  }, [selectedIds, router]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <PurchaseTabs />

      {canCombine && (
        <div className="flex items-center justify-between gap-3">
          <div>
            {selectionMode && (
              <p className="text-sm text-gray-600">
                {selectedIds.size} selected
                {lockedBranchId ? " · locked to one branch" : ""}
              </p>
            )}
          </div>
          {selectionMode ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={cancelSelection}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={combineSelected}
                disabled={selectedIds.size === 0}
              >
                Combine into Purchase
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={startSelection}>
              Create Purchase
            </Button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} />
      ) : (
        <PurchaseRequestList
          requests={requests}
          onOpen={handleOpen}
          branches={branches}
          showBranchColumn={isShopAdmin}
          showRequestedByColumn={!isTechnician}
          selection={selection}
        />
      )}

      <Toast
        open={Boolean(toastMessage)}
        message={toastMessage ?? ""}
        variant="success"
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

export default function PurchaseRequestsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton cards={3} rows={6} label="Loading purchase requests" />}>
      <PurchaseRequestsPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Type-check and build**

Run: `npm run type-check && npm run build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/purchases/requests/page.tsx"
git commit -m "feat: add Create Purchase selection flow to the requests page"
```

---

## Task 6: Extract `PurchasePaymentFields` and refactor `PurchaseForm`

**Files:**
- Create: `src/modules/purchase/PurchasePaymentFields.tsx`
- Modify: `src/modules/purchase/PurchaseForm.tsx`

**Interfaces:**
- Produces: `PurchasePaymentFields` component and `PurchasePaymentType` type, both exported from `src/modules/purchase/PurchasePaymentFields.tsx` — Task 7's `CombinedPurchaseForm` reuses both.

- [ ] **Step 1: Create the shared payment-fields component**

Create `src/modules/purchase/PurchasePaymentFields.tsx`:

```tsx
// src/modules/purchase/PurchasePaymentFields.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";

export type PurchasePaymentType = "cash" | "upi" | "bank" | "credit";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

interface Props {
  paymentType: PurchasePaymentType;
  onPaymentTypeChange: (value: PurchasePaymentType) => void;
  amountPaid: string;
  onAmountPaidChange: (value: string) => void;
  isCredit: boolean;
  balance: number;
  grandTotal: number;
}

/** Payment type + amount-paid fields, shared by every purchase-creation form. */
export default function PurchasePaymentFields({
  paymentType,
  onPaymentTypeChange,
  amountPaid,
  onAmountPaidChange,
  isCredit,
  balance,
  grandTotal,
}: Props) {
  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${isCredit ? "grid-cols-1" : "grid-cols-2"}`}>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Payment type</label>
          <select
            value={paymentType}
            onChange={(event) => onPaymentTypeChange(event.target.value as PurchasePaymentType)}
            className={inputClass}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank</option>
            <option value="credit">Credit (pay later)</option>
          </select>
        </div>

        {!isCredit && (
          <div>
            <label className="mb-1 block text-xs text-gray-600">Amount paid (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              max={grandTotal}
              value={amountPaid}
              onChange={(event) => onAmountPaidChange(event.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
        <span className="text-gray-600">Balance after payment</span>
        <span className="font-semibold text-blue-600">{formatRupees(balance)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Use it from `PurchaseForm.tsx`**

Add the import near the top of `src/modules/purchase/PurchaseForm.tsx` (alongside the `AddSupplierModal` import):

```ts
import PurchasePaymentFields from "./PurchasePaymentFields";
```

Replace the "Payment details" section (currently lines 269-310):

```tsx
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment details</h2>
        <div className="space-y-3">
          <div className={`grid gap-3 ${isCredit ? "grid-cols-1" : "grid-cols-2"}`}>
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
              <div>
                <label className="mb-1 block text-xs text-gray-600">Amount paid (₹)</label>
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
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
            <span className="text-gray-600">Balance after payment</span>
            <span className="font-semibold text-blue-600">{formatRupees(balance)}</span>
          </div>
        </div>
      </section>
```

with:

```tsx
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment details</h2>
        <PurchasePaymentFields
          paymentType={paymentType}
          onPaymentTypeChange={setPaymentType}
          amountPaid={amountPaid}
          onAmountPaidChange={setAmountPaid}
          isCredit={isCredit}
          balance={balance}
          grandTotal={totals.grandTotal}
        />
      </section>
```

(`paymentType`, `setPaymentType`, `amountPaid`, `setAmountPaid`, `isCredit`, `balance`, `totals.grandTotal` all already exist as local state/derived values in this component — nothing else in the file changes.)

- [ ] **Step 3: Type-check and build**

Run: `npm run type-check && npm run build`
Expected: both succeed.

- [ ] **Step 4: Manually verify the existing New Purchase form still works**

Run: `npm run dev`, sign in as a branch_admin or shop_admin, open Purchases → "+ New Purchase", confirm the Payment details section still renders payment type, amount paid, and balance exactly as before, and that submitting still creates a purchase. Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add src/modules/purchase/PurchasePaymentFields.tsx src/modules/purchase/PurchaseForm.tsx
git commit -m "refactor: extract PurchasePaymentFields out of PurchaseForm"
```

---

## Task 7: `CombinedPurchaseForm`

**Files:**
- Create: `src/modules/purchase/CombinedPurchaseForm.tsx`

**Interfaces:**
- Consumes: `PurchasePaymentFields`/`PurchasePaymentType` (Task 6), `AddSupplierModal` (existing), `computeTotals` (existing), `formatRepairLabel` (existing).
- Produces: `CombinedPurchaseForm` component and `CombinedPurchasePayload` type, both exported from `src/modules/purchase/CombinedPurchaseForm.tsx` — Task 8's `PurchaseFormHost` renders this and builds this payload.

- [ ] **Step 1: Create the component**

Create `src/modules/purchase/CombinedPurchaseForm.tsx`:

```tsx
// src/modules/purchase/CombinedPurchaseForm.tsx
"use client";

import React from "react";

import { Button } from "@/components/ui/Button";
import { formatRepairLabel } from "@/lib/repairLabel";
import { formatRupees } from "@/lib/purchaseFormat";
import { computeTotals } from "@/lib/purchaseTotals";
import type { Branch } from "@/types";
import type { Supplier } from "@/types/purchase";
import type { PurchaseRequest } from "@/types/purchaseRequest";

import AddSupplierModal from "./AddSupplierModal";
import PurchasePaymentFields, { type PurchasePaymentType } from "./PurchasePaymentFields";

export interface CombinedPurchasePayload {
  supplierId: string;
  purchaseRequestIds: string[];
  prices: Record<string, number>;
  supplierInvoiceNo?: string;
  purchaseDate: string;
  initialPayment?: { amount: number; method: string; paidAt: string; reference?: string };
}

interface Row {
  request: PurchaseRequest;
  itemId: string;
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
}

interface Props {
  requests: PurchaseRequest[];
  suppliers: Supplier[];
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: CombinedPurchasePayload) => Promise<void>;
  onSupplierCreated: (supplier: Supplier) => void;
  branches?: Branch[];
  submitLabel?: string;
  formId?: string;
  hideSubmit?: boolean;
  onCanSubmitChange?: (canSubmit: boolean) => void;
}

function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function rowsFrom(requests: PurchaseRequest[]): Row[] {
  return requests.flatMap((request) =>
    request.items.map((item) => ({
      request,
      itemId: item.id,
      name: item.name,
      brand: item.brand,
      model: item.model,
      quantity: item.quantity,
    }))
  );
}

/**
 * Purchase-creation form for the "combine approved requests" flow: every
 * row's name/brand/model/quantity/repair link is read-only, sourced from the
 * selected requests. Only the per-row price and the supplier/payment fields
 * are editable — there is no manual item entry here (unlike PurchaseForm).
 */
const CombinedPurchaseForm = React.memo(function CombinedPurchaseForm({
  requests,
  suppliers,
  submitting,
  error,
  onSubmit,
  onSupplierCreated,
  branches = [],
  submitLabel,
  formId,
  hideSubmit = false,
  onCanSubmitChange,
}: Props) {
  const rows = React.useMemo(() => rowsFrom(requests), [requests]);

  const [supplierId, setSupplierId] = React.useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState(todayIso());
  const [prices, setPrices] = React.useState<Record<string, string>>({});
  const [supplierModalOpen, setSupplierModalOpen] = React.useState(false);
  const [paymentType, setPaymentType] = React.useState<PurchasePaymentType>("cash");
  const [amountPaid, setAmountPaid] = React.useState("");

  const totals = React.useMemo(
    () =>
      computeTotals({
        items: rows.map((row) => ({
          quantity: row.quantity,
          purchasePrice: Number(prices[row.itemId]) || 0,
        })),
        discount: { mode: "amount", value: 0 },
        gstRate: 0,
        transportCharge: 0,
      }),
    [rows, prices]
  );

  const allPriced = rows.length > 0 && rows.every((row) => (Number(prices[row.itemId]) || 0) > 0);
  const canSubmit = Boolean(supplierId) && allPriced;

  React.useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  const isCredit = paymentType === "credit";
  const paid = isCredit ? 0 : Number(amountPaid) || 0;
  const balance = Math.max(totals.grandTotal - paid, 0);

  const handleSupplierCreated = React.useCallback(
    (supplier: Supplier) => {
      setSupplierId(supplier.id);
      setSupplierModalOpen(false);
      onSupplierCreated(supplier);
    },
    [onSupplierCreated]
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!canSubmit) return;

      const priceEntries: Record<string, number> = {};
      for (const row of rows) {
        priceEntries[row.itemId] = Number(prices[row.itemId]) || 0;
      }

      await onSubmit({
        supplierId,
        purchaseRequestIds: requests.map((request) => request.id),
        prices: priceEntries,
        supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
        purchaseDate: new Date(purchaseDate).toISOString(),
        initialPayment:
          isCredit || paid <= 0
            ? undefined
            : {
                amount: paid,
                method: paymentType,
                paidAt: new Date().toISOString(),
              },
      });
    },
    [
      canSubmit,
      rows,
      prices,
      onSubmit,
      supplierId,
      requests,
      supplierInvoiceNo,
      purchaseDate,
      isCredit,
      paid,
      paymentType,
    ]
  );

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Supplier details</h2>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Supplier</label>
          <div className="flex gap-2">
            <select
              required
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className={inputClass}
            >
              <option value="">Select supplier</option>
              {suppliers
                .filter((supplier) => supplier.status === "active" || supplier.id === supplierId)
                .map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => setSupplierModalOpen(true)}
              className="h-11 shrink-0 rounded-xl border border-blue-200 px-3 text-sm font-medium text-blue-600"
            >
              + Add supplier
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Invoice / bill no. (optional)</label>
            <input
              value={supplierInvoiceNo}
              onChange={(event) => setSupplierInvoiceNo(event.target.value)}
              className={inputClass}
              placeholder="As per bill"
            />
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
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Requested items</h2>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.itemId} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{row.name}</p>
                  <p className="text-xs text-gray-500">
                    {[row.brand, row.model].filter(Boolean).join(" · ") || "—"} · qty {row.quantity}
                  </p>
                  <p className="text-xs text-blue-600">
                    {formatRepairLabel(row.request.serviceId, row.request.serviceRef)} ·{" "}
                    {row.request.customerName}
                  </p>
                </div>
                <div className="w-32 shrink-0">
                  <label className="mb-1 block text-xs text-gray-600">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={prices[row.itemId] ?? ""}
                    onChange={(event) =>
                      setPrices((current) => ({ ...current, [row.itemId]: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
          <span>Grand total</span>
          <span>{formatRupees(totals.grandTotal)}</span>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment details</h2>
        <PurchasePaymentFields
          paymentType={paymentType}
          onPaymentTypeChange={setPaymentType}
          amountPaid={amountPaid}
          onAmountPaidChange={setAmountPaid}
          isCredit={isCredit}
          balance={balance}
          grandTotal={totals.grandTotal}
        />
      </section>

      {!hideSubmit && (
        <Button type="submit" size="lg" fullWidth disabled={submitting || !canSubmit}>
          {submitting ? "Saving…" : submitLabel ?? "Create purchase"}
        </Button>
      )}

      <AddSupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onCreated={handleSupplierCreated}
        branches={branches}
        showBranchSelector={false}
        defaultBranchId={requests[0]?.branchId ?? ""}
        suggestions={suppliers}
      />
    </form>
  );
});

export default CombinedPurchaseForm;
```

- [ ] **Step 2: Type-check and build**

Run: `npm run type-check && npm run build`
Expected: both succeed (this component isn't wired into any page yet, so nothing runtime-visible changes until Task 8).

- [ ] **Step 3: Commit**

```bash
git add src/modules/purchase/CombinedPurchaseForm.tsx
git commit -m "feat: add CombinedPurchaseForm"
```

---

## Task 8: Wire the combined flow through `PurchaseFormHost` and the purchase pages

**Files:**
- Modify: `src/modules/purchase/PurchaseFormHost.tsx`
- Modify: `src/app/(dashboard)/purchases/page.tsx`
- Modify: `src/app/(dashboard)/purchases/new/page.tsx`

**Interfaces:**
- Consumes: `CombinedPurchaseForm`/`CombinedPurchasePayload` (Task 7), `POST /api/purchases/from-requests` (Task 3).

- [ ] **Step 1: Extend `PurchaseFormHost`**

In `src/modules/purchase/PurchaseFormHost.tsx`, add imports:

```ts
import CombinedPurchaseForm, { type CombinedPurchasePayload } from "@/modules/purchase/CombinedPurchaseForm";
import type { PurchaseRequest } from "@/types/purchaseRequest";
```

Extend `PurchaseFormHostProps`:

```ts
export interface PurchaseFormHostProps {
  editId?: string | null;
  /** Comma-separated purchase-request ids — presence switches this host into the combine flow. */
  fromRequestIds?: string;
  onSuccess: (purchaseId: string) => void;
  formId?: string;
  hideSubmit?: boolean;
  onActionStateChange?: (state: PurchaseFormActionState) => void;
}
```

Update the function signature to destructure the new prop:

```ts
export default function PurchaseFormHost({
  editId,
  fromRequestIds,
  onSuccess,
  formId,
  hideSubmit = false,
  onActionStateChange,
}: PurchaseFormHostProps) {
```

Right after the existing `const { branches } = useBranches(user?.shopId);` line, add:

```ts
  const requestIds = React.useMemo(
    () => (fromRequestIds ? fromRequestIds.split(",").filter(Boolean) : []),
    [fromRequestIds]
  );
  const [combinedRequests, setCombinedRequests] = React.useState<PurchaseRequest[]>([]);
  const [loadingCombined, setLoadingCombined] = React.useState(requestIds.length > 0);
  const [combinedLoadError, setCombinedLoadError] = React.useState<string | null>(null);
  const combinedBranchId = combinedRequests[0]?.branchId;
```

Replace the `submitLabel` line:

```ts
  const submitLabel = editId ? "Update purchase" : "Save purchase";
```

with:

```ts
  const submitLabel = editId
    ? "Update purchase"
    : requestIds.length > 0
      ? "Create purchase"
      : "Save purchase";
```

Add a new effect (near the existing edit-loading effect) to fetch the selected requests:

```ts
  React.useEffect(() => {
    if (requestIds.length === 0) {
      setCombinedRequests([]);
      setLoadingCombined(false);
      setCombinedLoadError(null);
      return;
    }

    setLoadingCombined(true);
    setCombinedLoadError(null);

    const controller = new AbortController();

    async function loadCombined() {
      try {
        const responses = await Promise.all(
          requestIds.map((id) => fetch(`/api/purchase-requests/${id}`, { signal: controller.signal }))
        );
        const loaded: PurchaseRequest[] = [];
        for (const response of responses) {
          if (!response.ok) {
            const body = (await response.json()) as { error?: string };
            throw new Error(body.error ?? "Could not load a purchase request");
          }
          const body = (await response.json()) as { purchaseRequest: PurchaseRequest };
          loaded.push(body.purchaseRequest);
        }
        setCombinedRequests(loaded);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setCombinedLoadError((caught as Error).message);
        }
      } finally {
        setLoadingCombined(false);
      }
    }

    loadCombined();
    return () => controller.abort();
  }, [requestIds]);
```

Replace the suppliers-loading effect:

```ts
  React.useEffect(() => {
    if (!user) return;
    if (!isShopAdmin && !user.branchId) return;

    const controller = new AbortController();

    async function load() {
      const query = !isShopAdmin && user?.branchId ? `?branchId=${encodeURIComponent(user.branchId)}` : "";
      const suppliersResponse = await fetch(`/api/suppliers${query}`, {
        signal: controller.signal,
      });
      if (suppliersResponse.ok) {
        const body = (await suppliersResponse.json()) as { suppliers: Supplier[] };
        setSuppliers(body.suppliers);
      }
    }

    load();
    return () => controller.abort();
  }, [user, isShopAdmin]);
```

with:

```ts
  // Combine mode locks the supplier list to the selected requests' shared
  // branch, for every role — that's what keeps the resulting purchase's
  // single branchId/supplierId valid regardless of who's creating it.
  React.useEffect(() => {
    if (!user) return;
    if (requestIds.length > 0 && !combinedBranchId) return;
    if (!isShopAdmin && !user.branchId && !combinedBranchId) return;

    const controller = new AbortController();

    async function load() {
      const branchId = combinedBranchId ?? (!isShopAdmin ? user?.branchId : undefined);
      const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
      const suppliersResponse = await fetch(`/api/suppliers${query}`, {
        signal: controller.signal,
      });
      if (suppliersResponse.ok) {
        const body = (await suppliersResponse.json()) as { suppliers: Supplier[] };
        setSuppliers(body.suppliers);
      }
    }

    load();
    return () => controller.abort();
  }, [user, isShopAdmin, requestIds, combinedBranchId]);
```

Add a new submit handler after the existing `handleSubmit`:

```ts
  const handleCombinedSubmit = React.useCallback(
    async (payload: CombinedPurchasePayload) => {
      setSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/purchases/from-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not create the purchase");
        }

        const body = (await response.json()) as { purchase: { id: string } };
        onSuccess(body.purchase.id);
      } catch (caught) {
        setError((caught as Error).message);
        setSubmitting(false);
      }
    },
    [onSuccess]
  );
```

Finally, replace the render section (from `if (loadingEdit) {` to the end of the function):

```ts
  if (loadingEdit) {
    return <FormSkeleton sections={2} />;
  }

  if (editLoadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {editLoadError}
      </div>
    );
  }

  return (
    <PurchaseForm
      key={initial?.id ?? "new"}
      initial={initial}
      submitLabel={submitLabel}
      suppliers={suppliers}
      submitting={submitting}
      error={error}
      onSubmit={handleSubmit}
      onSupplierCreated={handleSupplierCreated}
      branches={branches}
      showBranchSelector={isShopAdmin}
      defaultBranchId={isShopAdmin ? "" : user?.branchId ?? ""}
      formId={formId}
      hideSubmit={hideSubmit}
      onCanSubmitChange={setCanSubmit}
    />
  );
}
```

with:

```ts
  if (loadingEdit || loadingCombined) {
    return <FormSkeleton sections={2} />;
  }

  if (editLoadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {editLoadError}
      </div>
    );
  }

  if (combinedLoadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {combinedLoadError}
      </div>
    );
  }

  if (requestIds.length > 0) {
    return (
      <CombinedPurchaseForm
        key={requestIds.join(",")}
        requests={combinedRequests}
        suppliers={suppliers}
        submitting={submitting}
        error={error}
        onSubmit={handleCombinedSubmit}
        onSupplierCreated={handleSupplierCreated}
        branches={branches}
        submitLabel={submitLabel}
        formId={formId}
        hideSubmit={hideSubmit}
        onCanSubmitChange={setCanSubmit}
      />
    );
  }

  return (
    <PurchaseForm
      key={initial?.id ?? "new"}
      initial={initial}
      submitLabel={submitLabel}
      suppliers={suppliers}
      submitting={submitting}
      error={error}
      onSubmit={handleSubmit}
      onSupplierCreated={handleSupplierCreated}
      branches={branches}
      showBranchSelector={isShopAdmin}
      defaultBranchId={isShopAdmin ? "" : user?.branchId ?? ""}
      formId={formId}
      hideSubmit={hideSubmit}
      onCanSubmitChange={setCanSubmit}
    />
  );
}
```

- [ ] **Step 2: Wire `purchases/page.tsx`**

In `src/app/(dashboard)/purchases/page.tsx`, add right after `const editId = searchParams.get("edit");`:

```ts
  const fromRequestsParam = searchParams.get("fromRequests");
```

Replace:

```ts
  const slideMode = newParam === "1" || Boolean(editId);
```

with:

```ts
  const slideMode = newParam === "1" || Boolean(editId) || Boolean(fromRequestsParam);
```

Replace the mobile-bounce effect:

```ts
  React.useEffect(() => {
    if (!slideMode || viewport !== "mobile") return;
    if (editId) {
      router.replace(`/purchases/new?edit=${editId}`);
      return;
    }
    router.replace("/purchases/new");
  }, [slideMode, viewport, editId, router]);
```

with:

```ts
  React.useEffect(() => {
    if (!slideMode || viewport !== "mobile") return;
    if (editId) {
      router.replace(`/purchases/new?edit=${editId}`);
      return;
    }
    if (fromRequestsParam) {
      router.replace(`/purchases/new?fromRequests=${encodeURIComponent(fromRequestsParam)}`);
      return;
    }
    router.replace("/purchases/new");
  }, [slideMode, viewport, editId, fromRequestsParam, router]);
```

Replace the `<SlideOver>` props:

```tsx
      <SlideOver
        open={showSlide}
        title={editId ? "Edit Purchase" : "New Purchase"}
        description="Record a spare purchase and its payment"
        onClose={closeSlide}
        maxWidthClassName="max-w-2xl"
```

with:

```tsx
      <SlideOver
        open={showSlide}
        title={editId ? "Edit Purchase" : fromRequestsParam ? "Combine into Purchase" : "New Purchase"}
        description={
          fromRequestsParam
            ? "Create one purchase from the selected requests"
            : "Record a spare purchase and its payment"
        }
        onClose={closeSlide}
        maxWidthClassName="max-w-2xl"
```

Replace the `<PurchaseFormHost>` usage inside the `SlideOver`:

```tsx
        <PurchaseFormHost
          editId={editId}
          formId={purchaseSlideFormId}
          hideSubmit
          onActionStateChange={setSlideFormState}
          onSuccess={handleSlideSuccess}
        />
```

with:

```tsx
        <PurchaseFormHost
          editId={editId}
          fromRequestIds={fromRequestsParam ?? undefined}
          formId={purchaseSlideFormId}
          hideSubmit
          onActionStateChange={setSlideFormState}
          onSuccess={handleSlideSuccess}
        />
```

- [ ] **Step 3: Wire `purchases/new/page.tsx`**

Replace the full contents of `src/app/(dashboard)/purchases/new/page.tsx`:

```tsx
// src/app/(dashboard)/purchases/new/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import { PageFallback } from "@/components/ui/PageSkeleton";
import PurchaseFormHost from "@/modules/purchase/PurchaseFormHost";

function NewPurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const fromRequestsParam = searchParams.get("fromRequests");

  const title = editId
    ? "Edit Purchase"
    : fromRequestsParam
      ? "Combine into Purchase"
      : "New Purchase";
  const description = fromRequestsParam
    ? "Create one purchase from the selected requests"
    : "Record a spare purchase and its payment";

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <PurchaseFormHost
        editId={editId}
        fromRequestIds={fromRequestsParam ?? undefined}
        onSuccess={(purchaseId) => router.push(`/purchases/details?id=${purchaseId}`)}
      />
    </div>
  );
}

export default function NewPurchasePage() {
  return (
    <Suspense fallback={<PageFallback label="Loading purchase form" />}>
      <NewPurchaseContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Type-check and build**

Run: `npm run type-check && npm run build`
Expected: both succeed.

- [ ] **Step 5: Manual walkthrough**

Run: `npm run dev`. As a branch_admin (or shop_admin): approve two or more purchase requests from different repairs (same branch), go to Purchases → Requests → "Create Purchase", select them, click "Combine into Purchase", confirm the slide-over/full-page form shows every selected item read-only with a price field, pick a supplier, enter prices, submit, and confirm it lands on the new purchase's details page with all items present and each request's status now "Purchased" (visible on its own details page with a link back to this purchase). Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add src/modules/purchase/PurchaseFormHost.tsx "src/app/(dashboard)/purchases/page.tsx" "src/app/(dashboard)/purchases/new/page.tsx"
git commit -m "feat: wire the combine-requests flow into the purchase creation host"
```

---

## Task 9: Hide "Edit" for combined (multi-item) purchases

**Files:**
- Modify: `src/app/(dashboard)/purchases/details/page.tsx`

- [ ] **Step 1: Extend the edit-disabling logic**

In `src/app/(dashboard)/purchases/details/page.tsx`, replace:

```ts
  const isActive = purchase.status === "active";
  const isLocked = isActive && purchase.payments.length > 0;
```

with:

```ts
  const isActive = purchase.status === "active";
  const isLocked = isActive && purchase.payments.length > 0;
  // The only edit UI (PurchaseForm) collapses `items` back to a single
  // generic line on save — editing a combined purchase through it would
  // silently destroy its itemization, so editing is unavailable for those.
  const isCombined = purchase.items.length > 1;
```

Replace the Edit `<Button>`:

```tsx
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleEdit}
              disabled={isLocked}
              title={
                isLocked
                  ? "Edit is unavailable after a payment is recorded"
                  : "Edit purchase"
              }
            >
              Edit
            </Button>
```

with:

```tsx
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleEdit}
              disabled={isLocked || isCombined}
              title={
                isCombined
                  ? "Edit is unavailable for a purchase combined from multiple requests"
                  : isLocked
                    ? "Edit is unavailable after a payment is recorded"
                    : "Edit purchase"
              }
            >
              Edit
            </Button>
```

- [ ] **Step 2: Type-check and build**

Run: `npm run type-check && npm run build`
Expected: both succeed.

- [ ] **Step 3: Manual verification**

Using the purchase created during Task 8's walkthrough (or a fresh combined purchase), open its details page and confirm the Edit button is now disabled with the "combined from multiple requests" tooltip, while an ordinary single-line purchase's Edit button still works as before.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/purchases/details/page.tsx"
git commit -m "fix: disable Edit for purchases combined from multiple requests"
```

---

## Task 10: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including every new test added in Tasks 1-3.

- [ ] **Step 2: Run the full validation pipeline**

Run: `npm run validate`
Expected: type-check, lint, and build all succeed with no errors.

- [ ] **Step 3: End-to-end manual walkthrough**

Run: `npm run dev` and walk the entire flow once more end-to-end as a shop_admin:
1. As a technician, raise purchase requests from two different repairs.
2. As the shop_admin, approve both.
3. On Purchases → Requests, click "Create Purchase", select both (confirm a third request from a different branch, if one exists, is disabled once the first is checked).
4. Combine into a purchase, pick a supplier, price every row, record a partial payment, submit.
5. Confirm the purchase details page shows every item with its correct repair link, and that "Edit" is disabled.
6. Confirm both source requests now show status "Purchased" with a working link back to the purchase.
7. Confirm an ordinary single-item "+ New Purchase" still works end-to-end (create, edit, cancel) exactly as before.

Stop the dev server when done. Report any deviation before considering this feature complete.
