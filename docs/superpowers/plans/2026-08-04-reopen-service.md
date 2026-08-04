# Reopen Completed Service — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff reopen a completed service (customer returned, not fixed) back to `in_progress` with a required reason and a visible Reopened tag, without changing payment.

**Architecture:** Keep the existing client `updateDoc` status writes on the service details page. Add reopen fields on `Service`, map them in `mapServiceDoc`, extract a pure `buildReopenFields` helper for the Firestore payload (TDD), then wire a details-page dialog + list badges. Do not add a new status value.

**Tech Stack:** Next 14 App Router, React, TypeScript, Firebase client Firestore, Vitest, Tailwind, existing `getStatusConfig` badge patterns.

**Spec:** `docs/superpowers/specs/2026-08-04-reopen-service-design.md`

## Global Constraints

- Write status as canonical snake_case `in_progress` on reopen (not `"In Progress"`).
- Do **not** introduce a `reopened` status enum value; tag is orthogonal via `isReopened`.
- Do **not** change `paymentStatus` / `paidAt` on reopen.
- Clear `completedDate` and `actualCompletion` with `deleteField()` (same as leave-completed today).
- Button only when `normalizeStatus(status) === "completed"`; cancelled has no reopen.
- Permissions: same as `updateStatus` — shop_admin, branch_admin, or assigned technician.
- No `any`; keep Tailwind classes aligned with existing chips.
- Reusable UI (dialog) lives under `src/components`.

## File map

| File | Responsibility |
|---|---|
| `src/types/index.ts` | Add optional reopen fields on `Service` |
| `src/lib/serviceReopen.ts` | NEW — pure `buildReopenFields` + `canReopenService` |
| `src/lib/serviceReopen.test.ts` | NEW — unit tests for reopen helper |
| `src/lib/serviceMapper.ts` | Map reopen fields from Firestore docs |
| `src/lib/serviceMapper.test.ts` | Cover reopen mapping |
| `src/components/service/ReopenServiceDialog.tsx` | NEW — reason dialog (required reason) |
| `src/app/(dashboard)/services/details/page.tsx` | Load fields, Reopen button, handler, badge |
| `src/components/service/shared/ServiceTable.tsx` | `isReopened` on item + list chip |
| `src/app/(dashboard)/services/page.tsx` | Pass `isReopened` when building list items (if needed) |

---

### Task 1: Data model + mapper + reopen helper (TDD)

**Files:**
- Modify: `src/types/index.ts` (Service interface)
- Create: `src/lib/serviceReopen.ts`
- Create: `src/lib/serviceReopen.test.ts`
- Modify: `src/lib/serviceMapper.ts`
- Modify: `src/lib/serviceMapper.test.ts`

**Interfaces:**
- Produces:
  - `Service.isReopened?: boolean`
  - `Service.reopenReason?: string`
  - `Service.reopenedAt?: Date`
  - `Service.reopenCount?: number`
  - `buildReopenFields(reason: string, previousCount: number | undefined, now: Date): ReopenFields`
  - `canReopenService(user: { role: string; id: string } | null | undefined, service: { status: string; technician_id?: string } | null | undefined): boolean`

- [x] **Step 1: Write failing tests for `buildReopenFields` and `canReopenService`**

Create `src/lib/serviceReopen.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildReopenFields, canReopenService } from "./serviceReopen";

const NOW = new Date(2026, 7, 4, 12, 0, 0);

describe("buildReopenFields", () => {
  it("sets in_progress, reopened flag, reason, timestamp, and first count", () => {
    expect(buildReopenFields("Same issue came back", undefined, NOW)).toEqual({
      status: "in_progress",
      isReopened: true,
      reopenReason: "Same issue came back",
      reopenedAt: NOW,
      reopenCount: 1,
    });
  });

  it("increments reopenCount on a later reopen", () => {
    expect(buildReopenFields("Came back again", 1, NOW).reopenCount).toBe(2);
  });

  it("trims the reason", () => {
    expect(buildReopenFields("  not fixed  ", 0, NOW).reopenReason).toBe("not fixed");
  });

  it("throws when reason is empty or whitespace", () => {
    expect(() => buildReopenFields("   ", undefined, NOW)).toThrow(/reason/i);
    expect(() => buildReopenFields("", undefined, NOW)).toThrow(/reason/i);
  });
});

describe("canReopenService", () => {
  const completed = { status: "completed", technician_id: "tech-1" };

  it("allows shop_admin and branch_admin on completed jobs", () => {
    expect(canReopenService({ role: "shop_admin", id: "a" }, completed)).toBe(true);
    expect(canReopenService({ role: "branch_admin", id: "a" }, completed)).toBe(true);
  });

  it("allows only the assigned technician", () => {
    expect(canReopenService({ role: "technician", id: "tech-1" }, completed)).toBe(true);
    expect(canReopenService({ role: "technician", id: "other" }, completed)).toBe(false);
  });

  it("rejects non-completed statuses including cancelled", () => {
    expect(canReopenService({ role: "shop_admin", id: "a" }, { status: "cancelled" })).toBe(false);
    expect(canReopenService({ role: "shop_admin", id: "a" }, { status: "in_progress" })).toBe(false);
    expect(canReopenService({ role: "shop_admin", id: "a" }, { status: "Completed" })).toBe(true);
  });

  it("rejects missing user or service", () => {
    expect(canReopenService(null, completed)).toBe(false);
    expect(canReopenService({ role: "shop_admin", id: "a" }, null)).toBe(false);
  });
});
```

- [x] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/lib/serviceReopen.test.ts`
Expected: FAIL — module not found / exports missing.

- [x] **Step 3: Implement helper + type fields**

Add to `Service` in `src/types/index.ts` (after `paidAt`):

```ts
  /** True after staff reopened a completed job (customer returned, not fixed). */
  isReopened?: boolean;
  /** Last required reopen reason. */
  reopenReason?: string;
  /** When the service was last reopened. */
  reopenedAt?: Date;
  /** How many times this service has been reopened. */
  reopenCount?: number;
```

Create `src/lib/serviceReopen.ts`:

```ts
import { normalizeStatus } from "./statusUtils";

export interface ReopenFields {
  status: "in_progress";
  isReopened: true;
  reopenReason: string;
  reopenedAt: Date;
  reopenCount: number;
}

export function buildReopenFields(
  reason: string,
  previousCount: number | undefined,
  now: Date
): ReopenFields {
  const reopenReason = reason.trim();
  if (!reopenReason) {
    throw new Error("Reopen reason is required");
  }
  return {
    status: "in_progress",
    isReopened: true,
    reopenReason,
    reopenedAt: now,
    reopenCount: (previousCount ?? 0) + 1,
  };
}

export function canReopenService(
  user: { role: string; id: string } | null | undefined,
  service: { status: string; technician_id?: string } | null | undefined
): boolean {
  if (!user || !service) return false;
  if (normalizeStatus(service.status) !== "completed") return false;
  if (user.role === "shop_admin" || user.role === "branch_admin") return true;
  if (user.role === "technician" && service.technician_id === user.id) return true;
  return false;
}
```

- [x] **Step 4: Map reopen fields in `mapServiceDoc`**

In `src/lib/serviceMapper.ts`, after `paidAt`:

```ts
    isReopened: data.isReopened === true,
    reopenReason: typeof data.reopenReason === "string" ? data.reopenReason : undefined,
    reopenedAt: readOptionalDate(data.reopenedAt),
    reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : undefined,
```

Note: `isReopened` should be `true` only when explicitly `true`; otherwise omit/`false`. Prefer:

```ts
    ...(data.isReopened === true
      ? {
          isReopened: true as const,
          reopenReason: typeof data.reopenReason === "string" ? data.reopenReason : undefined,
          reopenedAt: readOptionalDate(data.reopenedAt),
          reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : undefined,
        }
      : {}),
```

Or always set `isReopened: data.isReopened === true` so consumers can check boolean safely.

Use:

```ts
    isReopened: data.isReopened === true,
    reopenReason: typeof data.reopenReason === "string" ? data.reopenReason : undefined,
    reopenedAt: readOptionalDate(data.reopenedAt),
    reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : undefined,
```

Add tests in `serviceMapper.test.ts`:

```ts
describe("mapServiceDoc reopen fields", () => {
  it("maps reopen metadata when present", () => {
    const reopenedAt = new Date(2026, 7, 3);
    const service = mapServiceDoc(
      "s1",
      {
        isReopened: true,
        reopenReason: "Same issue",
        reopenedAt: ts(reopenedAt),
        reopenCount: 2,
      },
      NOW
    );
    expect(service.isReopened).toBe(true);
    expect(service.reopenReason).toBe("Same issue");
    expect(service.reopenedAt).toEqual(reopenedAt);
    expect(service.reopenCount).toBe(2);
  });

  it("defaults isReopened to false when absent", () => {
    expect(mapServiceDoc("s1", {}, NOW).isReopened).toBe(false);
  });
});
```

- [x] **Step 5: Run tests — expect PASS**

Run: `npx vitest run src/lib/serviceReopen.test.ts src/lib/serviceMapper.test.ts`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/serviceReopen.ts src/lib/serviceReopen.test.ts src/lib/serviceMapper.ts src/lib/serviceMapper.test.ts
git commit -m "$(cat <<'EOF'
feat: add reopen fields and pure reopen helpers

EOF
)"
```

---

### Task 2: Reopen dialog component

**Files:**
- Create: `src/components/service/ReopenServiceDialog.tsx`
- Modify: `src/components/service/index.ts` (export if that barrel exists; else skip)

**Interfaces:**
- Consumes: none from Task 1 helpers (validation of empty reason stays in dialog UI; confirm calls parent with trimmed reason)
- Produces: `<ReopenServiceDialog isOpen onClose onConfirm error submitting />`

- [x] **Step 1: Create dialog**

```tsx
"use client";

import { useEffect, useId, useState } from "react";

import { MdClose, MdRefresh } from "react-icons/md";

interface ReopenServiceDialogProps {
  isOpen: boolean;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function ReopenServiceDialog({
  isOpen,
  submitting,
  error,
  onClose,
  onConfirm,
}: ReopenServiceDialogProps) {
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setValidationError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError("Please enter a reason for reopening.");
      return;
    }
    setValidationError(null);
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-pointer"
        aria-label="Close dialog"
        onClick={submitting ? undefined : onClose}
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
              <MdRefresh className="h-5 w-5 text-amber-700" />
            </div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              Reopen Service
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Close"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-600">
          This will move the job back to In Progress and keep payment as-is. Enter why it is being reopened.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={reasonId} className="mb-1 block text-sm font-medium text-gray-700">
              Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              rows={3}
              placeholder="e.g. Same issue came back"
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            {(validationError || error) && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {validationError || error}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-11 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-11 cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            >
              {submitting ? "Reopening..." : "Confirm Reopen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add src/components/service/ReopenServiceDialog.tsx
git commit -m "$(cat <<'EOF'
feat: add Reopen Service reason dialog

EOF
)"
```

---

### Task 3: Wire reopen on service details page

**Files:**
- Modify: `src/app/(dashboard)/services/details/page.tsx`

**Interfaces:**
- Consumes: `buildReopenFields`, `canReopenService`, `ReopenServiceDialog`
- Produces: working Reopen button + badge on completed services

- [x] **Step 1: Extend local `Service` interface** with `isReopened?`, `reopenReason?`, `reopenedAt?`, `reopenCount?`

- [x] **Step 2: Load reopen fields in `fetchService`** (mirror mapper):

```ts
isReopened: data.isReopened === true,
reopenReason: typeof data.reopenReason === "string" ? data.reopenReason : undefined,
reopenedAt: data.reopenedAt?.toDate?.() ?? (data.reopenedAt instanceof Date ? data.reopenedAt : undefined),
reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : undefined,
```

- [x] **Step 3: Add state + handler**

```ts
const [showReopenDialog, setShowReopenDialog] = useState(false);
const [reopening, setReopening] = useState(false);
const [reopenError, setReopenError] = useState<string | null>(null);

const userCanReopen = canReopenService(
  user ? { role: user.role, id: user.id } : null,
  service
);

const handleConfirmReopen = async (reason: string) => {
  if (!serviceId || !service) return;
  setReopening(true);
  setReopenError(null);
  try {
    const now = new Date();
    const fields = buildReopenFields(reason, service.reopenCount, now);
    await updateDoc(doc(db, "services", serviceId), {
      ...fields,
      updatedAt: now,
      completedDate: deleteField(),
      actualCompletion: deleteField(),
    });
    setService((prev) =>
      prev
        ? {
            ...prev,
            ...fields,
            updatedAt: now,
            completedDate: undefined,
            actualCompletion: undefined,
          }
        : null
    );
    setStatus("in_progress");
    setStatusHistory((prev) => [
      { status: "in_progress", timestamp: now, updatedBy: user?.name || "Unknown" },
      ...prev,
    ]);
    setShowReopenDialog(false);
    setStatusUpdateSuccess(true);
    setTimeout(() => setStatusUpdateSuccess(false), 3000);
  } catch (err) {
    console.error("Error reopening service:", err);
    setReopenError("Failed to reopen service. Please try again.");
  } finally {
    setReopening(false);
  }
};
```

Important: do **not** optimistically change status before the write succeeds; only update local state after `updateDoc` resolves (as above). Keep dialog open on failure via `reopenError`.

- [x] **Step 4: UI — Reopened badge next to status chip**

In the hero status row (`flex items-center gap-2 flex-wrap`), after the status span:

```tsx
{service.isReopened && (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm text-amber-800 bg-amber-50 border border-amber-200">
    <MdRefresh className="w-4 h-4" aria-hidden="true" />
    Reopened
  </span>
)}
```

If `service.reopenReason` is set, show a small muted line under the chips:

```tsx
{service.isReopened && service.reopenReason && (
  <p className="text-xs text-gray-500 mt-1">Reopen reason: {service.reopenReason}</p>
)}
```

- [x] **Step 5: UI — Reopen button in Status Update section** when `userCanReopen`

Below the status select (or next to it on larger screens):

```tsx
{userCanReopen && (
  <button
    type="button"
    onClick={() => {
      setReopenError(null);
      setShowReopenDialog(true);
    }}
    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
  >
    <MdRefresh className="w-4 h-4" />
    Reopen Service
  </button>
)}
```

Also mount:

```tsx
<ReopenServiceDialog
  isOpen={showReopenDialog}
  submitting={reopening}
  error={reopenError}
  onClose={() => (reopening ? undefined : setShowReopenDialog(false))}
  onConfirm={handleConfirmReopen}
/>
```

Fix `onClose` to a stable noop-when-submitting pattern:

```tsx
onClose={() => {
  if (!reopening) setShowReopenDialog(false);
}}
```

- [x] **Step 6: Smoke TypeScript**

Run: `npx tsc --noEmit --pretty false 2>&1 | head -40`
Expected: no errors in touched files.

- [x] **Step 7: Commit**

```bash
git add src/app/(dashboard)/services/details/page.tsx
git commit -m "$(cat <<'EOF'
feat: reopen completed services from details page

EOF
)"
```

---

### Task 4: Reopened badge on services list

**Files:**
- Modify: `src/components/service/shared/ServiceTable.tsx`
- Modify: `src/app/(dashboard)/services/page.tsx` (ensure `isReopened` is on list items)

**Interfaces:**
- Consumes: `ServiceTableItem.isReopened?: boolean`
- Produces: Reopened chip beside status in desktop column + mobile card

- [x] **Step 1: Add `isReopened?: boolean` to `ServiceTableItem`**

- [x] **Step 2: Update status column cell** to show a second chip when reopened:

```tsx
cell: ({ row, getValue }) => {
  const status = getStatusConfig(getValue());
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${status.color} ${status.bg}`}
      >
        {status.label}
      </span>
      {row.original.isReopened && (
        <span className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 text-amber-800 bg-amber-50">
          Reopened
        </span>
      )}
    </div>
  );
},
```

Mirror the same chip under/next to the mobile card status badge.

- [x] **Step 3: Pass `isReopened` from services page** when mapping Firestore docs / list items. Grep for where `ServiceListItem` / table props are built; add `isReopened: data.isReopened === true` (or from mapped `Service`).

If list already uses `mapServiceDoc` / spreads Service fields into the table item, confirm `isReopened` is included in the cast/mapping — add explicitly if stripped.

- [x] **Step 4: Commit**

```bash
git add src/components/service/shared/ServiceTable.tsx src/app/(dashboard)/services/page.tsx
git commit -m "$(cat <<'EOF'
feat: show Reopened badge on services list

EOF
)"
```

---

### Task 5: Verification

- [x] **Step 1: Run unit tests**

Run: `npx vitest run src/lib/serviceReopen.test.ts src/lib/serviceMapper.test.ts`
Expected: PASS

- [x] **Step 2: Manual checklist (local app)**

1. Complete a service → **Reopen Service** appears.
2. Confirm with empty reason → inline validation, no write.
3. Confirm with reason → status In Progress, Reopened badge, payment unchanged.
4. Job shows in active list filters; list shows Reopened chip.
5. Complete again → completion dates set; badge + last reason remain.
6. Reopen second time → count increments, reason updates.
7. Cancelled job → no Reopen button.
8. Unassigned technician → no Reopen button on someone else's job.

---

## Spec coverage self-check

| Spec requirement | Task |
|---|---|
| Reopen button on completed only | Task 3 |
| Required reason dialog | Task 2–3 |
| status → `in_progress`, isReopened, reason, reopenedAt, reopenCount++ | Task 1 + 3 |
| Clear completion dates | Task 3 |
| Keep payment | Task 3 (no payment fields in update) |
| Badge on details + list | Task 3–4 |
| Permissions = updateStatus | Task 1 `canReopenService` + Task 3 |
| No reopen for cancelled | Task 1 + 3 |
| Error keeps dialog open | Task 3 |
| No new status enum | Global / Task 1 |
