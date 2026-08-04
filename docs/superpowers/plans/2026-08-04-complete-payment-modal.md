# Complete Status → Payment Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On service details, keep Update Status on the top-right of the actions bar, and when status becomes Completed with unpaid outstanding, open a Collect Payment modal.

**Architecture:** Keep the existing status `updateDoc` write on the details page. Add a pure `shouldOpenCollectPaymentModal` helper (TDD) for the open condition. Add `CollectPaymentDialog` (same overlay pattern as `ReopenServiceDialog`). Move the status `<select>` into the right-side actions cluster and replace the amber `promptForPayment` banner with the modal wired from `page.tsx`.

**Tech Stack:** Next 14 App Router, React, TypeScript, Firebase client Firestore, Vitest, Tailwind, existing payment helpers (`isPaid`, `setServicePayment`).

**Spec:** `docs/superpowers/specs/2026-08-04-complete-payment-modal-design.md`

## Global Constraints

- Details page only — do not change the services list.
- Do **not** open the payment modal for Ready for Pickup.
- Do **not** defer the Completed status write until payment is chosen; status saves first, then modal.
- Closing backdrop / X / Keep Unpaid leaves status Completed and payment unpaid/pending.
- No new payment status values; reuse `paymentStatus` / `paidAt` via `setServicePayment`.
- No `any`; keep Tailwind classes aligned with existing dialogs/buttons.
- Reusable dialog lives under `src/components`.

## File map

| File | Responsibility |
|---|---|
| `src/lib/paymentUtils.ts` | Add `shouldOpenCollectPaymentModal` |
| `src/lib/paymentUtils.test.ts` | Unit tests for the open-condition helper (create if missing; else append) |
| `src/components/service/CollectPaymentDialog.tsx` | NEW — Collect Payment modal |
| `src/components/service/index.ts` | Export the new dialog |
| `src/components/service/ServiceDetailsView.tsx` | Right-align status control; remove amber banner; drop `promptForPayment` prop |
| `src/app/(dashboard)/services/details/page.tsx` | Open modal after successful Complete; wire dialog + payment handlers |

---

### Task 1: Pure open-condition helper (TDD)

**Files:**
- Modify: `src/lib/paymentUtils.ts`
- Create or modify: `src/lib/paymentUtils.test.ts`

**Interfaces:**
- Produces:
  - `shouldOpenCollectPaymentModal(newStatus: string, previousPaymentStatus: ServicePaymentStatus | undefined): boolean`

- [ ] **Step 1: Ensure test file exists and add failing tests**

If `src/lib/paymentUtils.test.ts` does not exist, create it. Add:

```ts
import { describe, expect, it } from "vitest";

import { shouldOpenCollectPaymentModal } from "./paymentUtils";

describe("shouldOpenCollectPaymentModal", () => {
  it("opens when moving to Completed with no prior paymentStatus", () => {
    expect(shouldOpenCollectPaymentModal("Completed", undefined)).toBe(true);
  });

  it("opens when moving to Completed while pending", () => {
    expect(shouldOpenCollectPaymentModal("Completed", "pending")).toBe(true);
  });

  it("does not open when already paid", () => {
    expect(shouldOpenCollectPaymentModal("Completed", "paid")).toBe(false);
  });

  it("does not open for Ready for Pickup", () => {
    expect(shouldOpenCollectPaymentModal("Ready for Pickup", "pending")).toBe(false);
    expect(shouldOpenCollectPaymentModal("Ready for Pickup", undefined)).toBe(false);
  });

  it("does not open for non-completed statuses", () => {
    expect(shouldOpenCollectPaymentModal("In Progress", "pending")).toBe(false);
    expect(shouldOpenCollectPaymentModal("To Do", undefined)).toBe(false);
  });

  it("normalizes completed variants", () => {
    expect(shouldOpenCollectPaymentModal("completed", "pending")).toBe(true);
    expect(shouldOpenCollectPaymentModal("COMPLETED", undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/paymentUtils.test.ts`

Expected: FAIL — `shouldOpenCollectPaymentModal` is not exported / not defined.

- [ ] **Step 3: Implement the helper**

In `src/lib/paymentUtils.ts`, add (next to the existing payment exports):

```ts
/**
 * Whether Completing a job should open the Collect Payment modal.
 * Caller passes paymentStatus *before* the status write; absent is treated
 * as outstanding because complete-path writes `pending` when the field was missing.
 */
export function shouldOpenCollectPaymentModal(
  newStatus: string,
  previousPaymentStatus: ServicePaymentStatus | undefined
): boolean {
  if (normalizeStatus(newStatus) !== "completed") return false;
  return previousPaymentStatus !== "paid";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/paymentUtils.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/paymentUtils.ts src/lib/paymentUtils.test.ts
git commit -m "$(cat <<'EOF'
feat: add shouldOpenCollectPaymentModal helper

EOF
)"
```

---

### Task 2: CollectPaymentDialog component

**Files:**
- Create: `src/components/service/CollectPaymentDialog.tsx`
- Modify: `src/components/service/index.ts`

**Interfaces:**
- Consumes: none from Task 1 (UI only)
- Produces:

```ts
interface CollectPaymentDialogProps {
  isOpen: boolean;
  amount: number;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onMarkPaid: () => void;
  onKeepUnpaid: () => void;
}
```

- [ ] **Step 1: Create `CollectPaymentDialog.tsx`**

```tsx
"use client";

import { useId } from "react";

import { MdClose, MdPayments } from "react-icons/md";

interface CollectPaymentDialogProps {
  isOpen: boolean;
  amount: number;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onMarkPaid: () => void;
  onKeepUnpaid: () => void;
}

export default function CollectPaymentDialog({
  isOpen,
  amount,
  submitting,
  error,
  onClose,
  onMarkPaid,
  onKeepUnpaid,
}: CollectPaymentDialogProps) {
  const titleId = useId();

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (!submitting) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/50"
        aria-label="Close dialog"
        onClick={handleDismiss}
        disabled={submitting}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <MdPayments className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              Collect Payment
            </h2>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={submitting}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Close"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-2 text-sm text-gray-600">
          Device is ready to hand over — did the customer pay? It will not count towards collected
          takings until marked paid.
        </p>
        <p className="mb-4 text-2xl font-bold text-gray-900">
          ₹{amount.toLocaleString()}
          <span className="ml-2 text-sm font-medium text-gray-500">outstanding</span>
        </p>

        {error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onKeepUnpaid}
            disabled={submitting}
            className="min-h-11 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Keep Unpaid
          </button>
          <button
            type="button"
            onClick={onMarkPaid}
            disabled={submitting}
            className="min-h-11 cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Mark as Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Export from barrel**

In `src/components/service/index.ts`, add:

```ts
export { default as CollectPaymentDialog } from './CollectPaymentDialog';
```

- [ ] **Step 3: Smoke-check TypeScript on the new file**

Run: `npx tsc --noEmit --pretty false 2>&1 | head -40`

Expected: no errors referring to `CollectPaymentDialog`.

- [ ] **Step 4: Commit**

```bash
git add src/components/service/CollectPaymentDialog.tsx src/components/service/index.ts
git commit -m "$(cat <<'EOF'
feat: add CollectPaymentDialog for completed jobs

EOF
)"
```

---

### Task 3: Right-align status control + remove amber banner

**Files:**
- Modify: `src/components/service/ServiceDetailsView.tsx`

**Interfaces:**
- Consumes: existing `ServiceDetailsViewProps` minus `promptForPayment`
- Produces: same prop surface without `promptForPayment`

- [ ] **Step 1: Remove `promptForPayment` from props**

Delete `promptForPayment: boolean;` from `ServiceDetailsViewProps`, remove it from the destructured params, and remove the unused `MdWarning` import if nothing else uses it.

- [ ] **Step 2: Move Update Status into the right cluster**

Replace the actions bar section (the `section` that currently has left-side status + right-side Reopen/Paid) with a right-aligned cluster:

```tsx
        {/* Actions bar */}
        <section className={`${cardClass} p-4`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <span className="shrink-0 text-sm font-medium text-gray-600">Update Status</span>
              <select
                value={status}
                onChange={onStatusChange}
                disabled={updatingStatus}
                className="min-h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 sm:max-w-xs"
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {updatingStatus && (
                <span className="text-xs text-gray-500">Updating…</span>
              )}
              {statusUpdateSuccess && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <MdCheckCircle className="h-4 w-4" />
                  Updated
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {userCanReopen && (
                <button
                  type="button"
                  onClick={onReopenClick}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <MdRefresh className="h-4 w-4" />
                  Reopen Service
                </button>
              )}
              <button
                type="button"
                onClick={onPaymentToggle}
                disabled={updatingPayment}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  servicePaid
                    ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {updatingPayment ? "Saving…" : servicePaid ? "Mark as Unpaid" : "Mark as Paid"}
              </button>
            </div>
          </div>
        </section>
```

- [ ] **Step 3: Delete the amber banner block**

Remove this entire block (it previously sat under the actions row):

```tsx
          {promptForPayment && !servicePaid && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <MdWarning className="h-4 w-4 shrink-0" />
              Device is ready to hand over — did the customer pay? It will not count towards revenue until
              marked.
            </div>
          )}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/service/ServiceDetailsView.tsx
git commit -m "$(cat <<'EOF'
ui: move status dropdown top-right and drop payment banner

EOF
)"
```

---

### Task 4: Wire modal from details page

**Files:**
- Modify: `src/app/(dashboard)/services/details/page.tsx`

**Interfaces:**
- Consumes: `shouldOpenCollectPaymentModal`, `CollectPaymentDialog`
- Produces: working Complete → modal → Mark Paid / Keep Unpaid flow

- [ ] **Step 1: Import helper + dialog**

If `isPaid` / `ServicePaymentStatus` are already imported from `@/lib/paymentUtils`, only add `shouldOpenCollectPaymentModal` to that import. Add `CollectPaymentDialog` next to the existing `ReopenServiceDialog` import from `@/components/service` (or local path used today).

- [ ] **Step 2: Replace `promptForPayment` state**

Remove:

```ts
const [promptForPayment, setPromptForPayment] = useState(false);
```

Add:

```ts
const [showCollectPaymentDialog, setShowCollectPaymentDialog] = useState(false);
const [collectPaymentError, setCollectPaymentError] = useState<string | null>(null);
```

- [ ] **Step 3: Open modal after successful Complete**

In `handleStatusChange`, after the successful `updateDoc` + local state mirror + history entry, **replace**:

```ts
        const readyToCollect = isCompleted || normalizeStatus(newStatus) === "ready_for_pickup";
        setPromptForPayment(readyToCollect && service?.paymentStatus !== "paid");
```

with:

```ts
        if (shouldOpenCollectPaymentModal(newStatus, service?.paymentStatus)) {
          setCollectPaymentError(null);
          setShowCollectPaymentDialog(true);
        } else {
          setShowCollectPaymentDialog(false);
        }
```

Do not open the dialog in the `catch` path.

- [ ] **Step 4: Update payment handlers**

Update `handlePaymentChange` so dialog errors can surface:

```ts
  const handlePaymentChange = async (paid: boolean) => {
    if (!serviceId) return;
    setUpdatingPayment(true);

    try {
      const write = await setServicePayment(serviceId, paid);
      setService((prev) => (prev ? { ...prev, ...write, paidAt: write.paidAt, updatedAt: new Date() } : null));
      setShowCollectPaymentDialog(false);
      setCollectPaymentError(null);
    } catch (err) {
      console.error("Error updating payment:", err);
      setError("Failed to update payment. Please try again.");
      setCollectPaymentError("Failed to update payment. Please try again.");
      throw err;
    } finally {
      setUpdatingPayment(false);
    }
  };
```

Add:

```ts
  const handleCollectMarkPaid = () => {
    void handlePaymentChange(true);
  };

  const handleCollectKeepUnpaid = () => {
    if (updatingPayment) return;
    setShowCollectPaymentDialog(false);
    setCollectPaymentError(null);
  };
```

- [ ] **Step 5: Drop `promptForPayment` from `ServiceDetailsView` props**

Remove `promptForPayment={promptForPayment}` from the JSX.

- [ ] **Step 6: Render `CollectPaymentDialog` next to `ReopenServiceDialog`**

```tsx
      <CollectPaymentDialog
        isOpen={showCollectPaymentDialog}
        amount={service.price ?? 0}
        submitting={updatingPayment}
        error={collectPaymentError}
        onClose={handleCollectKeepUnpaid}
        onMarkPaid={handleCollectMarkPaid}
        onKeepUnpaid={handleCollectKeepUnpaid}
      />
```

- [ ] **Step 7: Manual checklist / typecheck**

Run: `npx tsc --noEmit --pretty false 2>&1 | head -60`

Manual:
1. Open an unpaid non-completed service → set Completed → Collect Payment modal appears with amount.
2. Mark as Paid → badge Paid, modal closes.
3. Repeat with Keep Unpaid / X → Completed + Unpaid.
4. Paid service → Completed → no modal.
5. Ready for Pickup → no modal.
6. Update Status control is on the right of the actions bar.

- [ ] **Step 8: Commit**

```bash
git add 'src/app/(dashboard)/services/details/page.tsx'
git commit -m "$(cat <<'EOF'
feat: open Collect Payment modal when completing unpaid jobs

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Status dropdown top-right of actions bar | Task 3 |
| Modal on Completed when unpaid | Tasks 1, 2, 4 |
| Mark as Paid / Keep Unpaid | Tasks 2, 4 |
| No modal if already paid | Tasks 1, 4 |
| No modal for Ready for Pickup | Tasks 1, 4 |
| Remove amber banner | Task 3 |
| Details page only | File map / Global Constraints |
| Status write before payment choice | Task 4 Step 3 |
| Dialog styled like ReopenServiceDialog | Task 2 |
