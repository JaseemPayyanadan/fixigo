# Persist Status History — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each service status change on the Firestore service document and reload it on the details page so Status History survives refresh.

**Architecture:** Keep existing client `updateDoc` status/reopen writes. Add `statusHistory` on `Service`, map it in `mapServiceDoc`, extract a pure `appendStatusHistory` helper (TDD), then wire details-page load + write so local state mirrors Firestore. Do not change `ServiceDetailsView` layout.

**Tech Stack:** Next 14 App Router, React, TypeScript, Firebase client Firestore, Vitest, existing Status History panel.

**Spec:** `docs/superpowers/specs/2026-08-04-status-history-design.md`

## Global Constraints

- History records **status changes only** (dropdown + reopen → `in_progress`). Never payment toggles or field edits.
- Store `status` as the same string written on that update (do not invent a separate history-normalization layer).
- Newest-first array order (prepend on append).
- No backfill / migration for existing docs; missing `statusHistory` → empty list.
- Rewrite the full `statusHistory` array in the same `updateDoc` as the status write (no `arrayUnion`).
- If `updateDoc` fails, do not update local history (same revert as today).
- No `any`; reusable helpers under `src/lib`; keep Tailwind on the view unchanged.
- `ServiceDetailsView` keeps rendering the prop; no UI redesign.

## File map

| File | Responsibility |
|---|---|
| `src/types/index.ts` | Export `StatusHistoryEntry`; add optional `statusHistory` on `Service` |
| `src/lib/serviceStatusHistory.ts` | NEW — pure `appendStatusHistory` + `mapStatusHistoryEntries` |
| `src/lib/serviceStatusHistory.test.ts` | NEW — unit tests for append + map helpers |
| `src/lib/serviceMapper.ts` | Map `statusHistory` via helper |
| `src/lib/serviceMapper.test.ts` | Cover statusHistory mapping |
| `src/app/(dashboard)/services/details/page.tsx` | Load persisted history; include it in status + reopen writes |
| `src/components/service/ServiceDetailsView.tsx` | Prefer shared `StatusHistoryEntry` type (behavior unchanged) |

---

### Task 1: Types + append/map helpers (TDD)

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/serviceStatusHistory.ts`
- Create: `src/lib/serviceStatusHistory.test.ts`
- Modify: `src/lib/serviceMapper.ts`
- Modify: `src/lib/serviceMapper.test.ts`

**Interfaces:**
- Produces:
  - `StatusHistoryEntry { status: string; timestamp: Date; updatedBy: string }`
  - `Service.statusHistory?: StatusHistoryEntry[]`
  - `appendStatusHistory(existing: StatusHistoryEntry[] | undefined, entry: { status: string; timestamp: Date; updatedBy: string }): StatusHistoryEntry[]`
  - `mapStatusHistoryEntries(raw: unknown): StatusHistoryEntry[]`
- Consumes: `readOptionalDate` from `./serviceMapper` inside `mapStatusHistoryEntries` (already exported; no reverse dependency on history).

- [ ] **Step 1: Add types on `Service`**

In `src/types/index.ts`, above `export interface Service`, add:

```ts
export interface StatusHistoryEntry {
  status: string;
  timestamp: Date;
  updatedBy: string;
}
```

Inside `Service`, after the reopen fields block, add:

```ts
  /** Newest-first log of status changes. Absent until the first persisted change. */
  statusHistory?: StatusHistoryEntry[];
```

- [ ] **Step 2: Write failing tests for `appendStatusHistory` and `mapStatusHistoryEntries`**

Create `src/lib/serviceStatusHistory.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { appendStatusHistory, mapStatusHistoryEntries } from "./serviceStatusHistory";

const NOW = new Date(2026, 7, 4, 12, 0, 0);
const EARLIER = new Date(2026, 7, 4, 10, 0, 0);

function ts(date: Date) {
  return { toDate: () => date };
}

describe("appendStatusHistory", () => {
  it("prepends an entry onto an empty list", () => {
    expect(
      appendStatusHistory(undefined, {
        status: "in_progress",
        timestamp: NOW,
        updatedBy: "Ada",
      })
    ).toEqual([
      { status: "in_progress", timestamp: NOW, updatedBy: "Ada" },
    ]);
  });

  it("prepends onto existing newest-first history", () => {
    const existing = [
      { status: "pending", timestamp: EARLIER, updatedBy: "Bob" },
    ];
    const next = appendStatusHistory(existing, {
      status: "completed",
      timestamp: NOW,
      updatedBy: "Ada",
    });
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual({ status: "completed", timestamp: NOW, updatedBy: "Ada" });
    expect(next[1]).toEqual(existing[0]);
  });

  it("trims status and updatedBy", () => {
    const [entry] = appendStatusHistory([], {
      status: "  completed  ",
      timestamp: NOW,
      updatedBy: "  Ada  ",
    });
    expect(entry.status).toBe("completed");
    expect(entry.updatedBy).toBe("Ada");
  });

  it("throws when status is empty or whitespace", () => {
    expect(() =>
      appendStatusHistory([], { status: "   ", timestamp: NOW, updatedBy: "Ada" })
    ).toThrow(/status/i);
    expect(() =>
      appendStatusHistory([], { status: "", timestamp: NOW, updatedBy: "Ada" })
    ).toThrow(/status/i);
  });

  it("defaults blank updatedBy to Unknown", () => {
    const [entry] = appendStatusHistory([], {
      status: "pending",
      timestamp: NOW,
      updatedBy: "  ",
    });
    expect(entry.updatedBy).toBe("Unknown");
  });
});

describe("mapStatusHistoryEntries", () => {
  it("returns [] when missing or not an array", () => {
    expect(mapStatusHistoryEntries(undefined)).toEqual([]);
    expect(mapStatusHistoryEntries(null)).toEqual([]);
    expect(mapStatusHistoryEntries("nope")).toEqual([]);
  });

  it("maps Timestamp entries and sorts newest-first", () => {
    const mapped = mapStatusHistoryEntries([
      { status: "pending", timestamp: ts(EARLIER), updatedBy: "Bob" },
      { status: "completed", timestamp: ts(NOW), updatedBy: "Ada" },
    ]);
    expect(mapped).toEqual([
      { status: "completed", timestamp: NOW, updatedBy: "Ada" },
      { status: "pending", timestamp: EARLIER, updatedBy: "Bob" },
    ]);
  });

  it("drops entries with missing status or unreadable timestamp", () => {
    const mapped = mapStatusHistoryEntries([
      { status: "pending", timestamp: ts(NOW), updatedBy: "Ada" },
      { status: "", timestamp: ts(NOW), updatedBy: "Ada" },
      { status: "completed", timestamp: "not-a-date", updatedBy: "Ada" },
      { status: "cancelled", updatedBy: "Ada" },
    ]);
    expect(mapped).toEqual([
      { status: "pending", timestamp: NOW, updatedBy: "Ada" },
    ]);
  });

  it("defaults missing updatedBy to Unknown", () => {
    const mapped = mapStatusHistoryEntries([
      { status: "pending", timestamp: ts(NOW) },
    ]);
    expect(mapped[0]?.updatedBy).toBe("Unknown");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/serviceStatusHistory.test.ts`

Expected: FAIL (module / exports not found).

- [ ] **Step 4: Implement helpers**

Create `src/lib/serviceStatusHistory.ts`:

```ts
import type { StatusHistoryEntry } from "@/types";
import { readOptionalDate } from "./serviceMapper";

export function appendStatusHistory(
  existing: StatusHistoryEntry[] | undefined,
  entry: { status: string; timestamp: Date; updatedBy: string }
): StatusHistoryEntry[] {
  const status = entry.status.trim();
  if (!status) {
    throw new Error("status is required");
  }
  const updatedBy = entry.updatedBy.trim() || "Unknown";
  const next: StatusHistoryEntry = {
    status,
    timestamp: entry.timestamp,
    updatedBy,
  };
  return [next, ...(existing ?? [])];
}

export function mapStatusHistoryEntries(raw: unknown): StatusHistoryEntry[] {
  if (!Array.isArray(raw)) return [];

  const mapped: StatusHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const status = typeof row.status === "string" ? row.status.trim() : "";
    if (!status) continue;
    const timestamp = readOptionalDate(row.timestamp);
    if (!timestamp) continue;
    const updatedBy =
      typeof row.updatedBy === "string" && row.updatedBy.trim()
        ? row.updatedBy.trim()
        : "Unknown";
    mapped.push({ status, timestamp, updatedBy });
  }

  return mapped.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
```

- [ ] **Step 5: Run helper tests — expect PASS**

Run: `npx vitest run src/lib/serviceStatusHistory.test.ts`

Expected: PASS.

- [ ] **Step 6: Wire mapper + failing mapper tests**

Add to `src/lib/serviceMapper.test.ts`:

```ts
describe("mapServiceDoc statusHistory", () => {
  it("maps and sorts statusHistory newest-first", () => {
    const earlier = new Date(2026, 7, 1);
    const later = new Date(2026, 7, 4);
    const service = mapServiceDoc(
      "s1",
      {
        statusHistory: [
          { status: "pending", timestamp: ts(earlier), updatedBy: "Bob" },
          { status: "completed", timestamp: ts(later), updatedBy: "Ada" },
        ],
      },
      NOW
    );
    expect(service.statusHistory).toEqual([
      { status: "completed", timestamp: later, updatedBy: "Ada" },
      { status: "pending", timestamp: earlier, updatedBy: "Bob" },
    ]);
  });

  it("defaults missing statusHistory to []", () => {
    expect(mapServiceDoc("s1", {}, NOW).statusHistory).toEqual([]);
  });
});
```

In `src/lib/serviceMapper.ts`, import and use the helper:

```ts
import { mapStatusHistoryEntries } from "./serviceStatusHistory";
```

Inside the `mapServiceDoc` return object (near reopen fields):

```ts
    statusHistory: mapStatusHistoryEntries(data.statusHistory),
```

- [ ] **Step 7: Run mapper tests — expect PASS**

Run: `npx vitest run src/lib/serviceMapper.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/lib/serviceStatusHistory.ts src/lib/serviceStatusHistory.test.ts src/lib/serviceMapper.ts src/lib/serviceMapper.test.ts
git commit -m "$(cat <<'EOF'
feat: add status history types, append helper, and mapper support

EOF
)"
```

---

### Task 2: Details page — load + persist on status change and reopen

**Files:**
- Modify: `src/app/(dashboard)/services/details/page.tsx`
- Modify: `src/components/service/ServiceDetailsView.tsx` (shared type only)

**Interfaces:**
- Consumes: `appendStatusHistory`, `mapStatusHistoryEntries`, `StatusHistoryEntry`
- Produces: details page hydrates `statusHistory` from Firestore; status + reopen writes include rewritten `statusHistory`

- [ ] **Step 1: Share the entry type in the view**

In `src/components/service/ServiceDetailsView.tsx`:

- Remove the local `interface StatusHistoryEntry { ... }`.
- Import: `import type { StatusHistoryEntry } from "@/types";`

Keep `statusHistory: StatusHistoryEntry[]` on props unchanged otherwise.

- [ ] **Step 2: Update details page imports and drop local `StatusHistory` interface**

In `src/app/(dashboard)/services/details/page.tsx`:

- Remove local `interface StatusHistory { ... }`.
- Add imports:

```ts
import type { StatusHistoryEntry } from "@/types";
import { appendStatusHistory, mapStatusHistoryEntries } from "@/lib/serviceStatusHistory";
```

- Change state to:

```ts
const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
```

- [ ] **Step 3: Hydrate history when fetching the service**

In `fetchService`, when building `serviceData`, after reopen fields add:

```ts
            statusHistory: mapStatusHistoryEntries(data.statusHistory),
```

Immediately after `setService(serviceData);` add:

```ts
          setStatusHistory(serviceData.statusHistory ?? []);
```

- [ ] **Step 4: Persist history in `handleStatusChange`**

Replace the local-only history append with a write that includes the array.

Inside the existing `try` after `const now = new Date();`, before `updateDoc`:

```ts
        const nextHistory = appendStatusHistory(statusHistory, {
          status: newStatus,
          timestamp: now,
          updatedBy: user?.name || "Unknown",
        });
```

Add `statusHistory: nextHistory` to the `updateDoc` payload object (same write as `status` / `updatedAt`).

After successful write, when mirroring local service state, also set `statusHistory: nextHistory` on the service object, and replace the old `setStatusHistory` block with:

```ts
        setStatusHistory(nextHistory);
```

Do **not** call `setStatusHistory` before a successful `updateDoc`. On catch, leave history untouched (existing revert of `status` remains).

- [ ] **Step 5: Persist history in `handleConfirmReopen`**

Before `updateDoc` in reopen:

```ts
      const nextHistory = appendStatusHistory(statusHistory, {
        status: "in_progress",
        timestamp: now,
        updatedBy: user?.name || "Unknown",
      });
```

Include `statusHistory: nextHistory` in the reopen `updateDoc` payload.

After success, update local service with `statusHistory: nextHistory`, and:

```ts
      setStatusHistory(nextHistory);
```

Remove the previous inline `setStatusHistory((prev) => [...])` that only mutated React state.

Confirm `handlePaymentChange` still does **not** touch `statusHistory`.

- [ ] **Step 6: Manual verification**

With `npm run dev` running:

1. Open a service details page → toggle Status History → expect empty (or prior persisted entries).
2. Change status → open Status History → see new row.
3. Hard refresh → same row still present.
4. Reopen a completed service (if applicable) → `in_progress` row appears and survives refresh.
5. Toggle payment → Status History unchanged.

- [ ] **Step 7: Run unit tests**

Run: `npx vitest run src/lib/serviceStatusHistory.test.ts src/lib/serviceMapper.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/services/details/page.tsx" src/components/service/ServiceDetailsView.tsx
git commit -m "$(cat <<'EOF'
feat: persist and reload service status history on details

EOF
)"
```

---

### Task 3: Spec coverage check (no code unless gaps)

**Files:** none unless a gap is found

- [ ] **Step 1: Walk the approved spec against the implementation**

Checklist (all must be true):

- [ ] Status dropdown change writes `statusHistory`
- [ ] Reopen writes `statusHistory` with `in_progress`
- [ ] Payment toggle does not write history
- [ ] Refresh reloads history
- [ ] Missing field shows empty copy
- [ ] No migration / seed on load
- [ ] Mapper drops invalid rows
- [ ] `ServiceDetailsView` UI unchanged aside from shared type

- [ ] **Step 2: If any gap, fix in place and re-run the relevant vitest file**

- [ ] **Step 3: Final commit only if Task 3 produced fixes**

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix: close status history gaps found in spec check

EOF
)"
```

(Skip this commit when the checklist is already fully green.)
