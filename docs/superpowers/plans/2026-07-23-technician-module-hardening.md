# Technician Module Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all technician data access behind session-verified Next.js API routes backed by `firebase-admin`, fix the broken edit page and non-atomic writes, and lock the `technicians` collection against direct client access.

**Architecture:** A new `firebase-admin` singleton (`src/lib/firebaseAdmin.ts`) bypasses Firestore rules server-side. `src/lib/apiAuth.ts` verifies the existing `session` JWT cookie and applies role scoping. `src/lib/technicianRepo.ts` holds the single Firestore↔`Technician` mapper and all transactional writes. REST routes under `/api/technicians` expose these; `useTechnicians` becomes a thin `fetch` client preserving its current return shape. The rules lock lands last, after every direct client reader has migrated.

**Tech Stack:** Next.js 15 App Router, TypeScript, `firebase` (client SDK, existing), `firebase-admin` (new), `jsonwebtoken`, `bcryptjs`, Vitest.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-23-technician-module-hardening-design.md`. Read it before starting.
- **Node env for tests:** `vitest.config.ts` sets `environment: "node"` and `include: ["src/**/*.test.ts"]`. Tests are co-located with source (e.g. `src/lib/apiAuth.test.ts`), **not** in a `tests/` directory. `.test.tsx` files are NOT picked up — do not write component tests.
- **Path alias:** `@/` → `./src` (configured in both `tsconfig.json` and `vitest.config.ts`).
- **Test command:** `npm test` (= `vitest run`). Single file: `npx vitest run src/lib/apiAuth.test.ts`.
- **Validation command:** `npm run validate` (= `type-check && lint && build`).
- **`src/lib/firebaseAdmin.ts` is server-only.** Never import it from a file containing `"use client"`, and never from `src/lib/rbac.ts` or `src/types/index.ts` (both are imported by client code).
- **Never trust client-supplied `shopId`.** Always take it from the verified session.
- **Branches live in the top-level `branches` collection.** Never `shops/{shopId}/branches/{branchId}` — that path does not exist and is the cause of spec defect 4.
- **Existing commit style:** conventional commits (`fix:`, `feat:`, `chore:`, `docs:`).
- **Branch:** work on `dev`. Per project memory, production ships from `main` only; pushes to `dev` build preview URLs.

---

### Task 1: Firebase Admin SDK singleton

**Files:**
- Modify: `package.json` (add dependency)
- Create: `src/lib/firebaseAdmin.ts`
- Modify: `README.md` (document the new env var)

**Interfaces:**
- Consumes: nothing
- Produces: `adminDb: Firestore` (from `firebase-admin/firestore`), `FieldValue` re-export

> **Operator prerequisite:** this task requires a Firebase service-account JSON. Generate it at
> Firebase Console → Project Settings → Service Accounts → "Generate new private key".
> The whole JSON object goes into one env var as a single-line string.

- [ ] **Step 1: Install firebase-admin**

```bash
npm install firebase-admin@^13.0.0
```

- [ ] **Step 2: Create the admin singleton**

Create `src/lib/firebaseAdmin.ts`:

```typescript
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Server-only. Bypasses Firestore security rules via a service account.
// Never import this from a "use client" module.

function initAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the Firebase service-account " +
        "JSON (single line) to .env.local locally and to the Vercel project settings."
    );
  }

  let credentials: { project_id: string; client_email: string; private_key: string };
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.");
  }

  return initializeApp({
    credential: cert({
      projectId: credentials.project_id,
      clientEmail: credentials.client_email,
      // Vercel stores newlines escaped; restore them.
      privateKey: credentials.private_key.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminDb = getFirestore(initAdminApp());
export { FieldValue, Timestamp } from "firebase-admin/firestore";
```

- [ ] **Step 3: Add local env var**

Create or append to `.env.local` (this file is gitignored — verify with `git check-ignore .env.local`):

```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"fixigo-8dc40",...}
```

Then add the same variable to Vercel:

```bash
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY production
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY preview
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run type-check`
Expected: exits 0, no output.

- [ ] **Step 5: Document the variable in README.md**

Add to the README under the setup/environment section:

```markdown
### Server-side environment variables

| Variable | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase service-account JSON (single line). Required by `src/lib/firebaseAdmin.ts` for all server-side technician data access. The app will fail to serve technician routes without it. |
| `JWT_SECRET` | Signing secret for the `session` cookie. |
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/firebaseAdmin.ts README.md
git commit -m "feat: add firebase-admin singleton for server-side data access"
```

---

### Task 2: Session verification and role scoping

**Files:**
- Create: `src/lib/apiAuth.ts`
- Create: `src/lib/apiAuth.test.ts`

**Interfaces:**
- Consumes: `AuthUser`, `verifyToken` from `src/lib/auth.ts`
- Produces:
  - `class ApiError extends Error { status: number }`
  - `requireUser(): Promise<AuthUser>`
  - `assertCanWriteTechnician(user: AuthUser, target: { shopId: string; branchId: string }): void`
  - `assertCanReadTechnician(user: AuthUser, target: { shopId: string; branchId: string }): void`
  - `listScopeFor(user: AuthUser, requestedBranchId?: string): { shopId: string; branchId?: string }`
  - `toErrorResponse(error: unknown): NextResponse`

This is the highest-value task in the plan: these assertions are the entire fix for the unauthenticated create endpoint.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/apiAuth.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  ApiError,
  assertCanReadTechnician,
  assertCanWriteTechnician,
  listScopeFor,
} from "@/lib/apiAuth";
import type { AuthUser } from "@/lib/auth";

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "u1",
    uid: "u1",
    email: "a@b.com",
    name: "Admin",
    role: "shop_admin",
    shopId: "shop-1",
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as AuthUser;
}

const target = { shopId: "shop-1", branchId: "branch-1" };

describe("assertCanWriteTechnician", () => {
  it("allows a shop admin to write any branch in their own shop", () => {
    expect(() => assertCanWriteTechnician(user(), target)).not.toThrow();
    expect(() =>
      assertCanWriteTechnician(user(), { shopId: "shop-1", branchId: "branch-9" })
    ).not.toThrow();
  });

  it("denies a shop admin writing into another shop", () => {
    expect(() =>
      assertCanWriteTechnician(user(), { shopId: "shop-2", branchId: "branch-1" })
    ).toThrow(ApiError);
  });

  it("allows a branch admin to write only their own branch", () => {
    const branchAdmin = user({ role: "branch_admin", branchId: "branch-1" });
    expect(() => assertCanWriteTechnician(branchAdmin, target)).not.toThrow();
  });

  it("denies a branch admin writing another branch in the same shop", () => {
    const branchAdmin = user({ role: "branch_admin", branchId: "branch-1" });
    expect(() =>
      assertCanWriteTechnician(branchAdmin, { shopId: "shop-1", branchId: "branch-2" })
    ).toThrow(ApiError);
  });

  it("denies a branch admin writing into another shop", () => {
    const branchAdmin = user({ role: "branch_admin", branchId: "branch-1" });
    expect(() =>
      assertCanWriteTechnician(branchAdmin, { shopId: "shop-2", branchId: "branch-1" })
    ).toThrow(ApiError);
  });

  it("denies technicians entirely", () => {
    const tech = user({ role: "technician", branchId: "branch-1" });
    expect(() => assertCanWriteTechnician(tech, target)).toThrow(ApiError);
  });

  it("denies a user with no shopId", () => {
    expect(() => assertCanWriteTechnician(user({ shopId: undefined }), target)).toThrow(
      ApiError
    );
  });

  it("throws 403, not 401, for an authenticated but unauthorized user", () => {
    try {
      assertCanWriteTechnician(user(), { shopId: "shop-2", branchId: "b" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as ApiError).status).toBe(403);
    }
  });
});

describe("assertCanReadTechnician", () => {
  it("allows a technician to read a record in their own branch", () => {
    const tech = user({ role: "technician", branchId: "branch-1" });
    expect(() => assertCanReadTechnician(tech, target)).not.toThrow();
  });

  it("denies a technician reading another branch", () => {
    const tech = user({ role: "technician", branchId: "branch-2" });
    expect(() => assertCanReadTechnician(tech, target)).toThrow(ApiError);
  });
});

describe("listScopeFor", () => {
  it("forces a branch admin to their own branch, ignoring the request", () => {
    const branchAdmin = user({ role: "branch_admin", branchId: "branch-1" });
    expect(listScopeFor(branchAdmin, "branch-9")).toEqual({
      shopId: "shop-1",
      branchId: "branch-1",
    });
  });

  it("honours a shop admin's branch filter", () => {
    expect(listScopeFor(user(), "branch-9")).toEqual({
      shopId: "shop-1",
      branchId: "branch-9",
    });
  });

  it("returns the whole shop for a shop admin with no filter", () => {
    expect(listScopeFor(user())).toEqual({ shopId: "shop-1", branchId: undefined });
  });

  it("always takes shopId from the session, never the request", () => {
    expect(listScopeFor(user()).shopId).toBe("shop-1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/apiAuth.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/apiAuth"`.

- [ ] **Step 3: Implement apiAuth**

Create `src/lib/apiAuth.ts`:

```typescript
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { verifyToken, type AuthUser } from "@/lib/auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Reads the HttpOnly `session` cookie set by /api/auth/login and verifies it. */
export async function requireUser(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value) {
    throw new ApiError(401, "Not authenticated");
  }

  const user = verifyToken(session.value);
  if (!user) {
    throw new ApiError(401, "Invalid session");
  }

  return user;
}

interface TechnicianScope {
  shopId: string;
  branchId: string;
}

export function assertCanWriteTechnician(user: AuthUser, target: TechnicianScope): void {
  if (!user.shopId || user.shopId !== target.shopId) {
    throw new ApiError(403, "Not permitted to modify technicians in this shop");
  }

  if (user.role === "shop_admin") return;

  if (user.role === "branch_admin") {
    if (user.branchId && user.branchId === target.branchId) return;
    throw new ApiError(403, "Not permitted to modify technicians in this branch");
  }

  throw new ApiError(403, "Not permitted to modify technicians");
}

export function assertCanReadTechnician(user: AuthUser, target: TechnicianScope): void {
  if (!user.shopId || user.shopId !== target.shopId) {
    throw new ApiError(403, "Not permitted to view technicians in this shop");
  }

  if (user.role === "shop_admin") return;

  if (user.branchId && user.branchId === target.branchId) return;

  throw new ApiError(403, "Not permitted to view technicians in this branch");
}

/**
 * Scope for list queries. shopId always comes from the session.
 * Non-shop-admins are pinned to their own branch regardless of what they ask for.
 */
export function listScopeFor(
  user: AuthUser,
  requestedBranchId?: string
): { shopId: string; branchId?: string } {
  if (!user.shopId) {
    throw new ApiError(403, "User is not associated with a shop");
  }

  if (user.role === "shop_admin") {
    return { shopId: user.shopId, branchId: requestedBranchId };
  }

  if (!user.branchId) {
    throw new ApiError(403, "User is not associated with a branch");
  }

  return { shopId: user.shopId, branchId: user.branchId };
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/apiAuth.test.ts`
Expected: PASS — 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/apiAuth.ts src/lib/apiAuth.test.ts
git commit -m "feat: add session verification and technician role scoping for API routes"
```

---

### Task 3: Technician payload validation

**Files:**
- Create: `src/lib/technicianValidation.ts`
- Create: `src/lib/technicianValidation.test.ts`

**Interfaces:**
- Consumes: `ApiError` from `src/lib/apiAuth.ts`
- Produces:
  - `interface CreateTechnicianInput { name, email, phone, password, branchId }` (all `string`)
  - `interface UpdateTechnicianInput { name?, email?, phone?, branchId?, status? }`
  - `parseCreateInput(body: unknown): CreateTechnicianInput`
  - `parseUpdateInput(body: unknown): UpdateTechnicianInput`

Note: `shopId` is deliberately absent from both inputs — it comes from the session only.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/technicianValidation.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiAuth";
import { parseCreateInput, parseUpdateInput } from "@/lib/technicianValidation";

const valid = {
  name: "Anshid",
  email: "anshid@example.com",
  phone: "9876543210",
  password: "secret123",
  branchId: "branch-1",
};

describe("parseCreateInput", () => {
  it("accepts and trims a valid payload", () => {
    expect(parseCreateInput({ ...valid, name: "  Anshid  " })).toEqual(valid);
  });

  it.each(["name", "email", "phone", "password", "branchId"])(
    "rejects a missing %s",
    (field) => {
      const body = { ...valid, [field]: undefined };
      expect(() => parseCreateInput(body)).toThrow(ApiError);
    }
  );

  it("rejects a malformed email", () => {
    expect(() => parseCreateInput({ ...valid, email: "not-an-email" })).toThrow(ApiError);
  });

  it("rejects a password under 6 characters", () => {
    expect(() => parseCreateInput({ ...valid, password: "12345" })).toThrow(ApiError);
  });

  it("lowercases the email so uniqueness checks are case-insensitive", () => {
    expect(parseCreateInput({ ...valid, email: "Anshid@Example.COM" }).email).toBe(
      "anshid@example.com"
    );
  });

  it("ignores a client-supplied shopId", () => {
    const parsed = parseCreateInput({ ...valid, shopId: "attacker-shop" });
    expect(parsed).not.toHaveProperty("shopId");
  });

  it("ignores a client-supplied role", () => {
    const parsed = parseCreateInput({ ...valid, role: "shop_admin" });
    expect(parsed).not.toHaveProperty("role");
  });

  it("throws 400 for a bad payload", () => {
    try {
      parseCreateInput({});
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as ApiError).status).toBe(400);
    }
  });
});

describe("parseUpdateInput", () => {
  it("accepts a partial payload", () => {
    expect(parseUpdateInput({ name: "New Name" })).toEqual({ name: "New Name" });
  });

  it("omits absent fields rather than setting them undefined", () => {
    expect(Object.keys(parseUpdateInput({ phone: "123" }))).toEqual(["phone"]);
  });

  it("accepts branchId and status, which the old edit form discarded", () => {
    expect(parseUpdateInput({ branchId: "branch-2", status: "inactive" })).toEqual({
      branchId: "branch-2",
      status: "inactive",
    });
  });

  it("rejects an invalid status", () => {
    expect(() => parseUpdateInput({ status: "busy" })).toThrow(ApiError);
  });

  it("rejects an empty payload", () => {
    expect(() => parseUpdateInput({})).toThrow(ApiError);
  });

  it("rejects a malformed email", () => {
    expect(() => parseUpdateInput({ email: "nope" })).toThrow(ApiError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/technicianValidation.test.ts`
Expected: FAIL — cannot resolve `@/lib/technicianValidation`.

- [ ] **Step 3: Implement validation**

Create `src/lib/technicianValidation.ts`:

```typescript
import { ApiError } from "@/lib/apiAuth";

export interface CreateTechnicianInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  branchId: string;
}

export interface UpdateTechnicianInput {
  name?: string;
  email?: string;
  phone?: string;
  branchId?: string;
  status?: "active" | "inactive";
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, `${field} is required`);
  }
  return value.trim();
}

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "Request body must be an object");
  }
  return body as Record<string, unknown>;
}

export function parseCreateInput(body: unknown): CreateTechnicianInput {
  const raw = asObject(body);

  const email = requireString(raw, "email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "A valid email address is required");
  }

  const password = requireString(raw, "password");
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  // shopId and role are intentionally not read from the body.
  return {
    name: requireString(raw, "name"),
    email,
    phone: requireString(raw, "phone"),
    password,
    branchId: requireString(raw, "branchId"),
  };
}

export function parseUpdateInput(body: unknown): UpdateTechnicianInput {
  const raw = asObject(body);
  const update: UpdateTechnicianInput = {};

  if (raw.name !== undefined) update.name = requireString(raw, "name");
  if (raw.phone !== undefined) update.phone = requireString(raw, "phone");
  if (raw.branchId !== undefined) update.branchId = requireString(raw, "branchId");

  if (raw.email !== undefined) {
    const email = requireString(raw, "email").toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw new ApiError(400, "A valid email address is required");
    }
    update.email = email;
  }

  if (raw.status !== undefined) {
    if (raw.status !== "active" && raw.status !== "inactive") {
      throw new ApiError(400, "status must be 'active' or 'inactive'");
    }
    update.status = raw.status;
  }

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, "No updatable fields supplied");
  }

  return update;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/technicianValidation.test.ts`
Expected: PASS — 18 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/technicianValidation.ts src/lib/technicianValidation.test.ts
git commit -m "feat: add technician payload validation"
```

---

### Task 4: Technician repository — mapper and reads

**Files:**
- Create: `src/lib/technicianRepo.ts`
- Create: `src/lib/technicianRepo.test.ts`

**Interfaces:**
- Consumes: `adminDb` from `src/lib/firebaseAdmin.ts`, `Technician` from `src/types`
- Produces:
  - `mapTechnician(id: string, data: Record<string, unknown>): Technician`
  - `listTechnicians(scope: { shopId: string; branchId?: string }): Promise<Technician[]>`
  - `getTechnician(id: string): Promise<Technician | null>`
  - `getTechnicianByUserId(userId: string): Promise<Technician | null>`

This replaces the five duplicated mappers: `useTechnicians.ts` lines 56, 132, 189, 241 and `edit/page.tsx:59`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/technicianRepo.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: {},
  FieldValue: { arrayUnion: vi.fn(), arrayRemove: vi.fn() },
}));

const { mapTechnician } = await import("@/lib/technicianRepo");

function timestamp(date: Date) {
  return { toDate: () => date };
}

describe("mapTechnician", () => {
  it("maps a fully populated document", () => {
    const created = new Date(2026, 0, 2);
    const result = mapTechnician("t1", {
      name: "Fasna",
      email: "fasna@example.com",
      phone: "999",
      role: "technician",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "u9",
      skills: ["screen"],
      status: "active",
      createdAt: timestamp(created),
      updatedAt: timestamp(created),
    });

    expect(result.id).toBe("t1");
    expect(result.name).toBe("Fasna");
    expect(result.skills).toEqual(["screen"]);
    expect(result.createdAt).toEqual(created);
  });

  it("defaults missing scalar fields rather than emitting undefined", () => {
    const result = mapTechnician("t2", {});
    expect(result.name).toBe("");
    expect(result.status).toBe("active");
    expect(result.role).toBe("technician");
    expect(result.skills).toEqual([]);
  });

  it("falls back to a Date when timestamps are absent", () => {
    expect(mapTechnician("t3", {}).createdAt).toBeInstanceOf(Date);
  });

  it("passes through a raw Date without calling toDate", () => {
    const created = new Date(2026, 5, 5);
    expect(mapTechnician("t4", { createdAt: created }).createdAt).toEqual(created);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/technicianRepo.test.ts`
Expected: FAIL — cannot resolve `@/lib/technicianRepo`.

- [ ] **Step 3: Implement the mapper and reads**

Create `src/lib/technicianRepo.ts`:

```typescript
import { adminDb } from "@/lib/firebaseAdmin";
import type { Technician } from "@/types";

export const TECHNICIANS = "technicians";
export const USERS = "users";
export const BRANCHES = "branches"; // top-level, NOT shops/{id}/branches

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

/** The single Firestore -> Technician mapper for the whole codebase. */
export function mapTechnician(id: string, data: Record<string, unknown>): Technician {
  return {
    id,
    name: (data.name as string) || "",
    email: (data.email as string) || "",
    phone: (data.phone as string) || "",
    role: (data.role as Technician["role"]) || "technician",
    shopId: (data.shopId as string) || "",
    branchId: (data.branchId as string) || "",
    userId: (data.userId as string) || "",
    created_by: (data.created_by as string) || "",
    skills: (data.skills as string[]) || [],
    status: (data.status as Technician["status"]) || "active",
    bio: (data.bio as string) || "",
    specializations: (data.specializations as string[]) || [],
    experience: (data.experience as number) || 0,
    rating: (data.rating as number) || 0,
    totalServices: (data.totalServices as number) || 0,
    completedServices: (data.completedServices as number) || 0,
    availability: (data.availability as Technician["availability"]) || undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function listTechnicians(scope: {
  shopId: string;
  branchId?: string;
}): Promise<Technician[]> {
  let query = adminDb
    .collection(TECHNICIANS)
    .where("shopId", "==", scope.shopId) as FirebaseFirestore.Query;

  if (scope.branchId) {
    query = query.where("branchId", "==", scope.branchId);
  }

  const snapshot = await query.orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => mapTechnician(doc.id, doc.data()));
}

export async function getTechnician(id: string): Promise<Technician | null> {
  const doc = await adminDb.collection(TECHNICIANS).doc(id).get();
  return doc.exists ? mapTechnician(doc.id, doc.data() as Record<string, unknown>) : null;
}

export async function getTechnicianByUserId(userId: string): Promise<Technician | null> {
  const snapshot = await adminDb
    .collection(TECHNICIANS)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return mapTechnician(doc.id, doc.data());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/technicianRepo.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/technicianRepo.ts src/lib/technicianRepo.test.ts
git commit -m "feat: add technician repository with single shared mapper"
```

---

### Task 5: Transactional create, update, and soft delete

**Files:**
- Modify: `src/lib/technicianRepo.ts`
- Modify: `src/lib/technicianRepo.test.ts`

**Interfaces:**
- Consumes: `CreateTechnicianInput`, `UpdateTechnicianInput` from Task 3; `hashPassword` from `src/lib/auth.ts`
- Produces:
  - `createTechnician(input: CreateTechnicianInput & { shopId: string; createdBy: string }): Promise<Technician>`
  - `updateTechnician(id: string, input: UpdateTechnicianInput): Promise<Technician>`
  - `deactivateTechnician(id: string): Promise<void>`
  - `emailExists(email: string, exceptUserId?: string): Promise<boolean>`

Each write touches `users`, `technicians`, and `branches/{branchId}.members` in one transaction. This fixes spec defects 3, 4, and 5.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/technicianRepo.test.ts`:

```typescript
describe("branch member paths", () => {
  it("targets the top-level branches collection, not shops/{id}/branches", async () => {
    // Guards against regressing spec defect 4: the historical
    // shops/{shopId}/branches/{branchId} path does not exist, so the members
    // write silently failed for every technician ever created.
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/lib/technicianRepo.ts", "utf8")
    );

    expect(source).not.toContain('"shops"');
    expect(source).toContain('BRANCHES = "branches"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/technicianRepo.test.ts`
Expected: FAIL — the `BRANCHES` assertion passes but no write functions exist yet; add them next.

- [ ] **Step 3: Implement the transactional writes**

Append to `src/lib/technicianRepo.ts`:

```typescript
import { hashPassword } from "@/lib/auth";
import { adminDb, FieldValue } from "@/lib/firebaseAdmin";
import type {
  CreateTechnicianInput,
  UpdateTechnicianInput,
} from "@/lib/technicianValidation";

export async function emailExists(email: string, exceptUserId?: string): Promise<boolean> {
  const snapshot = await adminDb
    .collection(USERS)
    .where("email", "==", email.toLowerCase())
    .get();

  return snapshot.docs.some((doc) => doc.id !== exceptUserId);
}

export async function createTechnician(
  input: CreateTechnicianInput & { shopId: string; createdBy: string }
): Promise<Technician> {
  const hashedPassword = await hashPassword(input.password);
  const now = new Date();

  const userRef = adminDb.collection(USERS).doc();
  const technicianRef = adminDb.collection(TECHNICIANS).doc();
  const branchRef = adminDb.collection(BRANCHES).doc(input.branchId);

  await adminDb.runTransaction(async (tx) => {
    const branchSnap = await tx.get(branchRef);
    if (!branchSnap.exists) {
      throw new Error(`Branch ${input.branchId} does not exist`);
    }

    tx.set(userRef, {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: "technician",
      shopId: input.shopId,
      branchId: input.branchId,
      phone: input.phone,
      status: "active",
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
    });

    tx.set(technicianRef, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: "technician",
      shopId: input.shopId,
      branchId: input.branchId,
      userId: userRef.id,
      // The ID of the admin performing the creation — see spec defect 5.
      created_by: input.createdBy,
      skills: [],
      status: "active",
      bio: "",
      specializations: [],
      experience: 0,
      rating: 0,
      totalServices: 0,
      completedServices: 0,
      availability: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      createdAt: now,
      updatedAt: now,
    });

    tx.update(branchRef, {
      members: FieldValue.arrayUnion({
        userId: userRef.id,
        role: "technician",
        name: input.name,
      }),
    });
  });

  const created = await getTechnician(technicianRef.id);
  if (!created) throw new Error("Technician creation failed");
  return created;
}

export async function updateTechnician(
  id: string,
  input: UpdateTechnicianInput
): Promise<Technician> {
  const technicianRef = adminDb.collection(TECHNICIANS).doc(id);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(technicianRef);
    if (!snap.exists) throw new Error("Technician not found");

    const current = mapTechnician(snap.id, snap.data() as Record<string, unknown>);
    const nextBranchId = input.branchId ?? current.branchId;

    tx.update(technicianRef, { ...input, updatedAt: new Date() });

    // Keep the linked login account in sync — spec defect 3.
    if (current.userId) {
      const userRef = adminDb.collection(USERS).doc(current.userId);
      const userUpdate: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) userUpdate.name = input.name;
      if (input.email !== undefined) userUpdate.email = input.email;
      if (input.phone !== undefined) userUpdate.phone = input.phone;
      if (input.branchId !== undefined) userUpdate.branchId = input.branchId;
      if (input.status !== undefined) {
        userUpdate.status = input.status === "inactive" ? "suspended" : "active";
      }
      tx.update(userRef, userUpdate);

      const memberEntry = {
        userId: current.userId,
        role: "technician",
        name: current.name,
      };

      if (input.branchId !== undefined && input.branchId !== current.branchId) {
        tx.update(adminDb.collection(BRANCHES).doc(current.branchId), {
          members: FieldValue.arrayRemove(memberEntry),
        });
        tx.update(adminDb.collection(BRANCHES).doc(nextBranchId), {
          members: FieldValue.arrayUnion({
            ...memberEntry,
            name: input.name ?? current.name,
          }),
        });
      } else if (input.name !== undefined && input.name !== current.name) {
        tx.update(adminDb.collection(BRANCHES).doc(current.branchId), {
          members: FieldValue.arrayRemove(memberEntry),
        });
        tx.update(adminDb.collection(BRANCHES).doc(current.branchId), {
          members: FieldValue.arrayUnion({ ...memberEntry, name: input.name }),
        });
      }
    }
  });

  const updated = await getTechnician(id);
  if (!updated) throw new Error("Technician not found after update");
  return updated;
}

/**
 * Soft delete. Sets the technician inactive and suspends the login, but leaves
 * services untouched so technician_id on past work and invoices still resolves
 * to a name.
 */
export async function deactivateTechnician(id: string): Promise<void> {
  const technicianRef = adminDb.collection(TECHNICIANS).doc(id);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(technicianRef);
    if (!snap.exists) throw new Error("Technician not found");

    const current = mapTechnician(snap.id, snap.data() as Record<string, unknown>);
    const now = new Date();

    tx.update(technicianRef, { status: "inactive", updatedAt: now });

    if (current.userId) {
      tx.update(adminDb.collection(USERS).doc(current.userId), {
        status: "suspended",
        updatedAt: now,
      });

      if (current.branchId) {
        tx.update(adminDb.collection(BRANCHES).doc(current.branchId), {
          members: FieldValue.arrayRemove({
            userId: current.userId,
            role: "technician",
            name: current.name,
          }),
        });
      }
    }
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/technicianRepo.test.ts && npm run type-check`
Expected: PASS — 5 tests; type-check exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/technicianRepo.ts src/lib/technicianRepo.test.ts
git commit -m "feat: add atomic technician create, update, and soft delete"
```

---

### Task 6: Collection routes — GET and POST /api/technicians

**Files:**
- Create: `src/app/api/technicians/route.ts`
- Create: `src/app/api/technicians/route.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `listScopeFor`, `assertCanWriteTechnician`, `toErrorResponse` (Task 2); `parseCreateInput` (Task 3); `listTechnicians`, `createTechnician`, `emailExists` (Tasks 4–5)
- Produces: `GET` and `POST` handlers. `GET` returns `{ technicians: Technician[] }`; `POST` returns `{ technician: Technician }` with status 201.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/technicians/route.test.ts`:

```typescript
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const listTechnicians = vi.fn();
const createTechnician = vi.fn();
const emailExists = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/technicianRepo", () => ({
  listTechnicians,
  createTechnician,
  emailExists,
}));

const { GET, POST } = await import("@/app/api/technicians/route");

const shopAdmin = {
  id: "admin-1",
  role: "shop_admin",
  shopId: "shop-1",
  email: "a@b.com",
  name: "Admin",
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/technicians", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  emailExists.mockResolvedValue(false);
});

describe("GET /api/technicians", () => {
  it("returns 401 when there is no session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await GET(new NextRequest("http://localhost/api/technicians"));
    expect(response.status).toBe(401);
  });

  it("scopes the query to the session shop", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    listTechnicians.mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/technicians"));

    expect(listTechnicians).toHaveBeenCalledWith({
      shopId: "shop-1",
      branchId: undefined,
    });
  });

  it("pins a branch admin to their own branch even if they ask for another", async () => {
    requireUser.mockResolvedValue({
      ...shopAdmin,
      role: "branch_admin",
      branchId: "branch-1",
    });
    listTechnicians.mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/technicians?branchId=branch-9"));

    expect(listTechnicians).toHaveBeenCalledWith({
      shopId: "shop-1",
      branchId: "branch-1",
    });
  });
});

describe("POST /api/technicians", () => {
  const body = {
    name: "Anshid",
    email: "anshid@example.com",
    phone: "999",
    password: "secret123",
    branchId: "branch-1",
  };

  it("returns 401 without a session — the old endpoint accepted this", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await POST(postRequest(body));

    expect(response.status).toBe(401);
    expect(createTechnician).not.toHaveBeenCalled();
  });

  it("returns 403 when a branch admin targets another branch", async () => {
    requireUser.mockResolvedValue({
      ...shopAdmin,
      role: "branch_admin",
      branchId: "branch-2",
    });

    const response = await POST(postRequest(body));

    expect(response.status).toBe(403);
    expect(createTechnician).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied shopId and uses the session's", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    createTechnician.mockResolvedValue({ id: "t1" });

    await POST(postRequest({ ...body, shopId: "attacker-shop" }));

    expect(createTechnician).toHaveBeenCalledWith(
      expect.objectContaining({ shopId: "shop-1", createdBy: "admin-1" })
    );
  });

  it("returns 400 for a duplicate email", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    emailExists.mockResolvedValue(true);

    const response = await POST(postRequest(body));

    expect(response.status).toBe(400);
    expect(createTechnician).not.toHaveBeenCalled();
  });

  it("returns 201 on success", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    createTechnician.mockResolvedValue({ id: "t1", name: "Anshid" });

    const response = await POST(postRequest(body));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      technician: { id: "t1", name: "Anshid" },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/technicians/route.test.ts`
Expected: FAIL — cannot resolve `@/app/api/technicians/route`.

- [ ] **Step 3: Implement the route**

Create `src/app/api/technicians/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  assertCanWriteTechnician,
  listScopeFor,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import { createTechnician, emailExists, listTechnicians } from "@/lib/technicianRepo";
import { parseCreateInput } from "@/lib/technicianValidation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const scope = listScopeFor(
      user,
      request.nextUrl.searchParams.get("branchId") ?? undefined
    );

    return NextResponse.json({ technicians: await listTechnicians(scope) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = parseCreateInput(await request.json());

    // shopId comes from the session, never the payload.
    assertCanWriteTechnician(user, {
      shopId: user.shopId ?? "",
      branchId: input.branchId,
    });

    if (await emailExists(input.email)) {
      throw new ApiError(400, "A user with this email already exists");
    }

    const technician = await createTechnician({
      ...input,
      shopId: user.shopId as string,
      createdBy: user.id,
    });

    return NextResponse.json({ technician }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/technicians/route.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/technicians/route.ts src/app/api/technicians/route.test.ts
git commit -m "feat: add authenticated technician collection API"
```

---

### Task 7: Item routes — GET, PATCH, DELETE /api/technicians/[id]

**Files:**
- Create: `src/app/api/technicians/[id]/route.ts`
- Create: `src/app/api/technicians/[id]/route.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–5
- Produces: `GET` → `{ technician }`; `PATCH` → `{ technician }`; `DELETE` → `{ success: true }`

Next.js 15 passes route params as a **Promise**: `{ params }: { params: Promise<{ id: string }> }`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/technicians/[id]/route.test.ts`:

```typescript
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getTechnician = vi.fn();
const updateTechnician = vi.fn();
const deactivateTechnician = vi.fn();
const emailExists = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/technicianRepo", () => ({
  getTechnician,
  updateTechnician,
  deactivateTechnician,
  emailExists,
}));

const { GET, PATCH, DELETE } = await import("@/app/api/technicians/[id]/route");

const shopAdmin = { id: "admin-1", role: "shop_admin", shopId: "shop-1" };
const technician = {
  id: "t1",
  shopId: "shop-1",
  branchId: "branch-1",
  userId: "u1",
  name: "Fasna",
};
const params = Promise.resolve({ id: "t1" });

function request(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/technicians/t1", {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  emailExists.mockResolvedValue(false);
  getTechnician.mockResolvedValue(technician);
});

describe("GET /api/technicians/[id]", () => {
  it("returns 404 for a missing technician", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    getTechnician.mockResolvedValue(null);

    const response = await GET(request("GET"), { params });
    expect(response.status).toBe(404);
  });

  it("returns 403 for a technician in another shop", async () => {
    requireUser.mockResolvedValue({ ...shopAdmin, shopId: "shop-2" });

    const response = await GET(request("GET"), { params });
    expect(response.status).toBe(403);
  });

  it("returns the technician on success", async () => {
    requireUser.mockResolvedValue(shopAdmin);

    const response = await GET(request("GET"), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ technician });
  });
});

describe("PATCH /api/technicians/[id]", () => {
  it("returns 401 without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await PATCH(request("PATCH", { name: "X" }), { params });
    expect(response.status).toBe(401);
  });

  it("persists branchId and status, which the old form discarded", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    updateTechnician.mockResolvedValue({ ...technician, branchId: "branch-2" });

    await PATCH(request("PATCH", { branchId: "branch-2", status: "inactive" }), {
      params,
    });

    expect(updateTechnician).toHaveBeenCalledWith("t1", {
      branchId: "branch-2",
      status: "inactive",
    });
  });

  it("checks the target branch when moving a technician", async () => {
    requireUser.mockResolvedValue({
      ...shopAdmin,
      role: "branch_admin",
      branchId: "branch-1",
    });

    const response = await PATCH(request("PATCH", { branchId: "branch-2" }), { params });

    expect(response.status).toBe(403);
    expect(updateTechnician).not.toHaveBeenCalled();
  });

  it("rejects an email already used by another account", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    emailExists.mockResolvedValue(true);

    const response = await PATCH(request("PATCH", { email: "taken@example.com" }), {
      params,
    });

    expect(response.status).toBe(400);
  });

  it("allows a technician to keep their own email", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    emailExists.mockResolvedValue(false);
    updateTechnician.mockResolvedValue(technician);

    await PATCH(request("PATCH", { email: "same@example.com" }), { params });

    expect(emailExists).toHaveBeenCalledWith("same@example.com", "u1");
  });
});

describe("DELETE /api/technicians/[id]", () => {
  it("soft-deletes rather than removing the document", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    deactivateTechnician.mockResolvedValue(undefined);

    const response = await DELETE(request("DELETE"), { params });

    expect(response.status).toBe(200);
    expect(deactivateTechnician).toHaveBeenCalledWith("t1");
  });

  it("returns 403 for a branch admin deleting outside their branch", async () => {
    requireUser.mockResolvedValue({
      ...shopAdmin,
      role: "branch_admin",
      branchId: "branch-9",
    });

    const response = await DELETE(request("DELETE"), { params });

    expect(response.status).toBe(403);
    expect(deactivateTechnician).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "src/app/api/technicians/[id]/route.test.ts"`
Expected: FAIL — cannot resolve the route module.

- [ ] **Step 3: Implement the route**

Create `src/app/api/technicians/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

import {
  ApiError,
  assertCanReadTechnician,
  assertCanWriteTechnician,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";
import {
  deactivateTechnician,
  emailExists,
  getTechnician,
  updateTechnician,
} from "@/lib/technicianRepo";
import { parseUpdateInput } from "@/lib/technicianValidation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function loadTechnician(id: string) {
  const technician = await getTechnician(id);
  if (!technician) throw new ApiError(404, "Technician not found");
  return technician;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const technician = await loadTechnician(id);

    assertCanReadTechnician(user, {
      shopId: technician.shopId,
      branchId: technician.branchId,
    });

    return NextResponse.json({ technician });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const technician = await loadTechnician(id);
    const input = parseUpdateInput(await request.json());

    // Must be permitted on the current branch...
    assertCanWriteTechnician(user, {
      shopId: technician.shopId,
      branchId: technician.branchId,
    });

    // ...and on the destination branch when moving.
    if (input.branchId && input.branchId !== technician.branchId) {
      assertCanWriteTechnician(user, {
        shopId: technician.shopId,
        branchId: input.branchId,
      });
    }

    if (input.email && (await emailExists(input.email, technician.userId))) {
      throw new ApiError(400, "A user with this email already exists");
    }

    return NextResponse.json({ technician: await updateTechnician(id, input) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const technician = await loadTechnician(id);

    assertCanWriteTechnician(user, {
      shopId: technician.shopId,
      branchId: technician.branchId,
    });

    await deactivateTechnician(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "src/app/api/technicians/[id]/route.test.ts"`
Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/technicians/[id]" && git commit -m "feat: add authenticated technician item API with soft delete"
```

---

### Task 8: Self-service route — GET/PATCH /api/technicians/me

**Files:**
- Create: `src/app/api/technicians/me/route.ts`

**Interfaces:**
- Consumes: `requireUser`, `toErrorResponse` (Task 2); `getTechnicianByUserId`, `updateTechnician` (Tasks 4–5)
- Produces: `GET` → `{ technician: Technician | null }`; `PATCH` → `{ technician }`

Needed by `TechnicianDashboard.tsx` and `profile/page.tsx`, which currently query the collection directly. A technician may edit only their own name/phone — not their branch or status.

> **Route ordering note:** `me` must be a literal segment. Next.js matches static segments before dynamic ones, so `/api/technicians/me` resolves here rather than to `[id]`. No extra configuration is needed.

- [ ] **Step 1: Implement the route**

Create `src/app/api/technicians/me/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

import { ApiError, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { getTechnicianByUserId, updateTechnician } from "@/lib/technicianRepo";
import { parseUpdateInput } from "@/lib/technicianValidation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ technician: await getTechnicianByUserId(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const technician = await getTechnicianByUserId(user.id);
    if (!technician) throw new ApiError(404, "No technician record for this account");

    const input = parseUpdateInput(await request.json());

    // Self-service is limited to contact details.
    if (input.branchId !== undefined || input.status !== undefined) {
      throw new ApiError(403, "You cannot change your own branch or status");
    }

    return NextResponse.json({
      technician: await updateTechnician(technician.id, input),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/technicians/me/route.ts
git commit -m "feat: add technician self-service API route"
```

---

### Task 9: Rewrite useTechnicians as a fetch client

**Files:**
- Modify: `src/hooks/useTechnicians.ts` (full rewrite, 301 → ~120 lines)
- Modify: `src/app/(dashboard)/technicians/new/page.tsx:28` (remove dead call)

**Interfaces:**
- Consumes: the API routes from Tasks 6–7
- Produces: **the existing return shape must be preserved** — `{ technicians, loading, error, createTechnician, updateTechnician, deleteTechnician, refresh }`

⚠️ Six call sites depend on this hook: `technicians/page.tsx:30`, `technicians/edit/page.tsx:34`, `technicians/new/page.tsx:28`, `services/page.tsx:69`, `services/new/page.tsx:22`, `ShopAdminDashboard.tsx:44`. Changing the shape breaks all of them.

`getTechnicianStats` (line 273) has **no callers** — `technicians/page.tsx` computes identical stats inline at lines 39–55. Drop it rather than porting its `Math.floor(total * 0.7)` mock.

- [ ] **Step 1: Replace the hook**

Overwrite `src/hooks/useTechnicians.ts`:

```typescript
"use client";
import { useCallback, useEffect, useState } from "react";

import { logger } from "@/lib/logger";
import type { Technician } from "@/types";

import { useUser } from "./useUser";

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function useTechnicians(shopId?: string, branchId?: string) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  // shopId is accepted for call-site compatibility but the server derives it
  // from the session; only branchId narrows the query.
  const refresh = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const url = branchId
        ? `/api/technicians?branchId=${encodeURIComponent(branchId)}`
        : "/api/technicians";

      const response = await fetch(url);
      if (!response.ok) throw new Error(await readError(response));

      const { technicians: list } = await response.json();
      setTechnicians(list);
      logger.debug("Technicians fetched successfully", { count: list.length, branchId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch technicians";
      setError(message);
      logger.error("Error fetching technicians", { error: message, branchId });
    } finally {
      setLoading(false);
    }
  }, [user, branchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTechnician = useCallback(
    async (input: {
      name: string;
      email: string;
      phone: string;
      password: string;
      branchId: string;
    }) => {
      const response = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(await readError(response));

      const { technician } = await response.json();
      await refresh();
      return technician.id as string;
    },
    [refresh]
  );

  const updateTechnician = useCallback(
    async (id: string, updates: Partial<Technician>) => {
      const response = await fetch(`/api/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(await readError(response));
      await refresh();
    },
    [refresh]
  );

  const deleteTechnician = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/technicians/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response));
      await refresh();
    },
    [refresh]
  );

  return {
    technicians,
    loading,
    error,
    createTechnician,
    updateTechnician,
    deleteTechnician,
    refresh,
  };
}
```

- [ ] **Step 2: Remove the dead call in new/page.tsx**

In `src/app/(dashboard)/technicians/new/page.tsx`, delete line 28:

```typescript
  const { } = useTechnicians(shopId, branchId);
```

and remove the now-unused import on line 9:

```typescript
import { useTechnicians } from "@/hooks/useTechnicians";
```

- [ ] **Step 3: Verify the app compiles and lints**

Run: `npm run type-check && npm run lint`
Expected: both exit 0. If `shopId` is flagged as unused in the hook, prefix it — the parameter must stay for call-site compatibility.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTechnicians.ts "src/app/(dashboard)/technicians/new/page.tsx"
git commit -m "refactor: rewrite useTechnicians as an API client"
```

---

### Task 10: Fix the edit page

**Files:**
- Modify: `src/app/(dashboard)/technicians/edit/page.tsx`
- Modify: `src/modules/technician/TechnicianForm.tsx` (submit `status`)

**Interfaces:**
- Consumes: `GET`/`PATCH /api/technicians/[id]` (Task 7), `useTechnicians` (Task 9)
- Produces: a working edit page

This fixes spec defects 1 and 2 — the page that currently hangs forever.

- [ ] **Step 1: Switch to useSearchParams and the API**

In `src/app/(dashboard)/technicians/edit/page.tsx`, replace the import on line 5:

```typescript
import { useRouter, useSearchParams } from "next/navigation";
```

Replace lines 27 and 41:

```typescript
  const searchParams = useSearchParams();
  // ...
  const technicianId = searchParams.get("id");
```

Replace the whole `useEffect` fetch block (lines 43–92) with:

```typescript
  useEffect(() => {
    const fetchTechnician = async () => {
      if (!technicianId) {
        // Previously returned without clearing loading, hanging the page forever.
        setError("No technician specified");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/technicians/${technicianId}`);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to fetch technician");
        }

        const { technician: data } = await response.json();
        setTechnician(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch technician");
      } finally {
        setLoading(false);
      }
    };

    void fetchTechnician();
  }, [technicianId]);
```

- [ ] **Step 2: Widen handleEdit to submit branch and status**

Replace `handleEdit` (lines 94–117):

```typescript
  const handleEdit = async (data: {
    name: string;
    email: string;
    phone: string;
    branchId: string;
    status?: "active" | "inactive";
  }) => {
    if (!technician) return;

    setFormLoading(true);
    setError(null);

    try {
      await updateTechnician(technician.id, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        branchId: data.branchId,
        ...(data.status ? { status: data.status } : {}),
      });

      router.push("/technicians");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update technician");
    } finally {
      setFormLoading(false);
    }
  };
```

- [ ] **Step 3: Wrap the page in Suspense**

`useSearchParams` requires a Suspense boundary in the App Router or the build fails. In the same file, change the exported component:

```typescript
export default function TechnicianEditPage() {
  return (
    <RoleGuard allowedRoles={["shop_admin", "branch_admin"]}>
      <PermissionGuard permissions={["technician:write"]}>
        <Suspense fallback={null}>
          <TechnicianEditContent />
        </Suspense>
      </PermissionGuard>
    </RoleGuard>
  );
}
```

Add `Suspense` to the React import on line 2:

```typescript
import React, { useState, useEffect, Suspense } from "react";
```

- [ ] **Step 4: Verify the build passes**

Run: `npm run type-check && npm run build`
Expected: both exit 0. A missing Suspense boundary surfaces here as a prerender error naming `useSearchParams`.

- [ ] **Step 5: Manually verify the fix**

Run `npm run dev`, log in as a shop admin, open `/technicians`, click the pencil icon on any row.
Expected: the form loads populated within a second. Before this task it span forever.
Change the name, save, and confirm the list reflects it.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/technicians/edit/page.tsx"
git commit -m "fix: repair technician edit page routing and persist branch and status"
```

---

### Task 11: Relabel delete as deactivate

**Files:**
- Modify: `src/modules/technician/TechnicianList.tsx:200-212` (table) and `:318-331` (cards)

**Interfaces:**
- Consumes: `deleteTechnician` from `useTechnicians` (unchanged name; behaviour is now a soft delete)
- Produces: UI copy matching real behaviour

- [ ] **Step 1: Update the table action**

In `src/modules/technician/TechnicianList.tsx`, replace the confirm text and title in the table row's delete button:

```tsx
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Deactivate '${tech.name}'? They will no longer be able to log in, but their service history is kept.`
                                )
                              ) {
                                onDelete(tech.id);
                              }
                            }}
                            title="Deactivate technician"
```

- [ ] **Step 2: Update the mobile card action**

Replace the corresponding card button's handler, title, and label:

```tsx
                      onClick={() => {
                        if (
                          window.confirm(
                            `Deactivate '${tech.name}'? They will no longer be able to log in, but their service history is kept.`
                          )
                        ) {
                          onDelete(tech.id);
                        }
                      }}
                      title="Deactivate technician"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Deactivate
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run type-check`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/modules/technician/TechnicianList.tsx
git commit -m "fix: label technician removal as deactivation to match behaviour"
```

---

### Task 12: Migrate the remaining direct Firestore readers

**Files:**
- Modify: `src/components/dashboard/TechnicianDashboard.tsx:110-135`
- Modify: `src/app/(dashboard)/profile/page.tsx:84,182`
- Modify: `src/app/(dashboard)/services/page.tsx:181`
- Modify: `src/app/(dashboard)/services/details/page.tsx:242`
- Modify: `src/components/branch/TechnicianBranchList.tsx:39`
- Modify: `src/components/branch/ShopAdminBranchList.tsx:39`
- Modify: `src/components/branch/BranchAdminBranchList.tsx:39`
- Modify: `src/hooks/useDashboardStats.ts:61,88`

**Interfaces:**
- Consumes: `GET /api/technicians`, `GET/PATCH /api/technicians/me`
- Produces: zero client-side reads of the `technicians` collection

This task gates Task 14. The rules lock cannot land until every one of these is migrated, or the app breaks.

⚠️ `TechnicianDashboard.tsx:124` falls back to `where("created_by", "==", user.id)`, which works **only because `created_by` is currently mis-set** to the technician's own userId. Task 5 corrects that field, so this fallback must go — `/api/technicians/me` queries `userId`, which is correct in both old and new data.

- [ ] **Step 1: Migrate TechnicianDashboard**

Replace the technician lookup block (lines 110–135) — both queries and the `created_by` fallback — with:

```typescript
        const response = await fetch("/api/technicians/me");
        if (!response.ok) throw new Error("Failed to load technician record");
        const { technician } = await response.json();

        if (technician) {
          const technicianServices = services.filter(
            (service) =>
              service.technician_id === technician.id ||
              service.technician_id === user.id
          );
          setMyServices(technicianServices);
        } else {
          setMyServices([]);
        }
```

Remove the now-unused `collection`, `getDocs`, `query`, `where` imports from line 5 and the `db` import from line 18 if nothing else in the file uses them.

- [ ] **Step 2: Migrate the profile page**

In `src/app/(dashboard)/profile/page.tsx`, replace the read at line 84:

```typescript
            const response = await fetch("/api/technicians/me");
            const { technician: technicianDoc } = await response.json();
```

and the write at line 182:

```typescript
      const response = await fetch("/api/technicians/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name, phone: profile.phone }),
      });
      if (!response.ok) throw new Error("Failed to update profile");
```

Adjust the surrounding code to use the returned object directly — it is already a mapped `Technician`, not a Firestore snapshot, so `.data()` and `.exists` calls must go.

- [ ] **Step 3: Migrate the three branch list components**

Each of `TechnicianBranchList.tsx`, `ShopAdminBranchList.tsx`, and `BranchAdminBranchList.tsx` has the same block at line 39. Replace the Firestore query in each with:

```typescript
              const response = await fetch("/api/technicians");
              const { technicians } = await response.json();
              const forBranch = technicians.filter(
                (technician: Technician) => technician.branchId === branch.id
              );
```

Keep the surrounding `techniciansByBranch` accumulation unchanged.

- [ ] **Step 4: Migrate the services pages**

In `src/app/(dashboard)/services/page.tsx:181`, replace the `created_by` query with `await fetch("/api/technicians/me")` and use the returned `technician.id`.

In `src/app/(dashboard)/services/details/page.tsx:242`, replace the collection read with `await fetch("/api/technicians")` and use the returned `technicians` array.

- [ ] **Step 5: Migrate useDashboardStats**

In `src/hooks/useDashboardStats.ts`, replace both queries (lines 61 and 88) with a single call:

```typescript
        const response = await fetch(
          branchId ? `/api/technicians?branchId=${encodeURIComponent(branchId)}` : "/api/technicians"
        );
        const { technicians } = await response.json();
```

The server already applies the shop scope and the `createdAt desc` ordering, so the `where`/`orderBy` clauses are no longer needed.

- [ ] **Step 6: Verify no client-side reads remain**

Run:

```bash
grep -rn 'collection(db, "technicians")\|doc(db, "technicians"' src/ | grep -v "src/app/api/"
```

Expected: **no output**. Any hit is a reader that Task 14 would break.

- [ ] **Step 7: Verify the build**

Run: `npm run validate`
Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "refactor: move all technician reads behind the API"
```

---

### Task 13: Backfill existing data

**Files:**
- Create: `scripts/backfill-technicians.ts`
- Modify: `package.json` (add script entry)

**Interfaces:**
- Consumes: `adminDb` (Task 1), `mapTechnician` (Task 4)
- Produces: a one-shot repair for `created_by` and missing `branches.members` entries

Two historical defects need repair: `created_by` holds the technician's own userId, and the `branches.members` entry was never written because the old code targeted a nonexistent path.

`created_by` cannot be recovered — the creating admin was never recorded. The script clears it where it equals `userId`, so the wrong value stops being mistaken for the right one.

- [ ] **Step 1: Write the script**

Create `scripts/backfill-technicians.ts`:

```typescript
/**
 * One-shot repair for technician records created before the API migration.
 *
 *   npm run backfill:technicians -- --dry-run
 *   npm run backfill:technicians
 *
 * Fixes:
 *  1. created_by mis-set to the technician's own userId (unrecoverable — cleared).
 *  2. branches.members entries never written, because the old create route
 *     targeted shops/{shopId}/branches/{branchId}, which does not exist.
 */
import { adminDb, FieldValue } from "../src/lib/firebaseAdmin";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const snapshot = await adminDb.collection("technicians").get();
  console.log(`Inspecting ${snapshot.size} technicians (dryRun=${dryRun})`);

  let clearedCreatedBy = 0;
  let addedMembers = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { userId, branchId, name, created_by: createdBy } = data;

    if (createdBy && userId && createdBy === userId) {
      console.log(`  ${doc.id}: clearing self-referential created_by`);
      if (!dryRun) await doc.ref.update({ created_by: "" });
      clearedCreatedBy++;
    }

    if (!userId || !branchId) {
      console.warn(`  ${doc.id}: missing userId or branchId, skipping members repair`);
      continue;
    }

    const branchRef = adminDb.collection("branches").doc(branchId);
    const branchSnap = await branchRef.get();
    if (!branchSnap.exists) {
      console.warn(`  ${doc.id}: branch ${branchId} not found, skipping`);
      continue;
    }

    const members: Array<{ userId: string; role: string }> =
      branchSnap.data()?.members ?? [];
    if (members.some((member) => member.userId === userId)) continue;

    console.log(`  ${doc.id}: adding to branch ${branchId} members`);
    if (!dryRun) {
      await branchRef.update({
        members: FieldValue.arrayUnion({ userId, role: "technician", name: name ?? "" }),
      });
    }
    addedMembers++;
  }

  console.log(
    `Done. created_by cleared: ${clearedCreatedBy}, members added: ${addedMembers}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add to `scripts`:

```json
    "backfill:technicians": "npx tsx --env-file=.env.local scripts/backfill-technicians.ts",
```

Install the runner:

```bash
npm install --save-dev tsx
```

- [ ] **Step 3: Dry-run against real data**

Run: `npm run backfill:technicians -- --dry-run`
Expected: a per-technician report ending in a summary line, with **no writes performed**. Read the output before proceeding.

- [ ] **Step 4: Run for real**

Run: `npm run backfill:technicians`
Expected: same report; re-running it immediately should report `created_by cleared: 0, members added: 0` (the script is idempotent).

- [ ] **Step 5: Commit**

```bash
git add scripts/backfill-technicians.ts package.json package-lock.json
git commit -m "chore: add technician data backfill script"
```

---

### Task 14: Lock the technicians collection

**Files:**
- Modify: `firestore.rules` (full rewrite)
- Delete: `src/app/api/technicians/create/route.ts`
- Modify: `src/lib/userManagement.ts` (remove the dead sync helper)

**Interfaces:**
- Consumes: Task 12's guarantee that no client reads the collection
- Produces: `technicians` readable and writable only via the admin SDK

**Do not start this task until Task 12 Step 6 reports no output.**

The rewritten file makes the project's real posture explicit. The `if true` lines are not a new exposure — they describe what is already deployed. Each future module migration flips one to `false`.

- [ ] **Step 1: Rewrite the rules**

Overwrite `firestore.rules`:

```
rules_version = '2';

// This application does NOT use Firebase Auth. Authentication is a custom JWT
// in an HttpOnly `session` cookie (src/lib/auth.ts), so request.auth is always
// null on client calls. Rules referencing request.auth can therefore never
// pass — the previous version of this file gated everything behind
// `request.auth != null` and would have blocked the entire app if deployed.
//
// Collections marked `if false` are served exclusively through Next.js API
// routes using the Firebase Admin SDK, which bypasses these rules.
// Collections marked `if true` are still read directly by the browser and are
// consequently unprotected. Each is a migration target; flip it to `false` as
// its module moves server-side.

service cloud.firestore {
  match /databases/{database}/documents {

    // Migrated: server-only via src/lib/technicianRepo.ts
    match /technicians/{technicianId} {
      allow read, write: if false;
    }

    // TODO: unmigrated — read directly by the client SDK
    match /users/{userId}            { allow read, write: if true; }
    match /shops/{shopId}            { allow read, write: if true; }
    match /branches/{branchId}       { allow read, write: if true; }
    match /services/{serviceId}      { allow read, write: if true; }
    match /customers/{customerId}    { allow read, write: if true; }
    match /parts/{partId}            { allow read, write: if true; }
    match /notifications/{id}        { allow read, write: if true; }
    match /audit_logs/{logId}        { allow read, write: if true; }
  }
}
```

- [ ] **Step 2: Delete the unauthenticated create route**

```bash
git rm src/app/api/technicians/create/route.ts
```

Verify nothing still calls it:

```bash
grep -rn "api/technicians/create" src/
```

Expected: no output. (`new/page.tsx` was migrated to the hook in Task 9.)

- [ ] **Step 3: Remove the dead sync helper**

In `src/lib/userManagement.ts`, delete `syncTechniciansWithBranchMembers` (the function reading `technicians` at line 45) and the technician-writing helper at line 275, which used a third layout — `shops/{}/branches/{}/technicians` — that nothing reads. Task 13's script replaces both.

Verify nothing imported them:

```bash
grep -rn "syncTechnicians" src/
```

Expected: no output.

- [ ] **Step 4: Deploy the rules**

Preview first:

```bash
npx firebase deploy --only firestore:rules --dry-run
```

Read the diff carefully — this is also the moment to confirm what the previously deployed rules actually were, which the spec flagged as an unverified inference.

Then deploy:

```bash
npm run firebase:deploy:rules
```

- [ ] **Step 5: Verify the app still works end to end**

Run `npm run dev` and confirm, logged in as a shop admin:

1. `/technicians` lists technicians
2. Creating a technician succeeds and the new row appears
3. Editing that technician saves
4. Deactivating sets them inactive and they survive under the "Inactive" filter
5. `/branch` shows correct per-branch technician counts
6. `/dashboard` loads without console errors

Then log in as that technician and confirm `/dashboard` and `/profile` load.

Any `permission-denied` in the browser console means a client reader was missed — find it with the Task 12 Step 6 grep.

- [ ] **Step 6: Run the full suite**

Run: `npm test && npm run validate`
Expected: all tests pass; validate exits 0.

- [ ] **Step 7: Commit**

```bash
git add firestore.rules src/lib/userManagement.ts
git commit -m "feat: lock technicians collection to server-side access only"
```

---

## Self-Review

**Spec coverage.** Defect 1 → Task 10. Defect 2 → Tasks 3, 7, 10. Defect 3 → Task 5. Defect 4 → Tasks 5, 13. Defect 5 → Tasks 5, 12, 13. Defect 6 → Tasks 5, 7 (email uniqueness). Defect 7 → Tasks 2, 6, 14. Defects 8–9 → Task 14. Duplicated mapper (17) → Task 4. Refetch scope (18) → Task 9. Dead destructure (19) → Task 9.

**Two deliberate deviations from the spec**, both discovered while mapping files:

1. The spec scoped the rules lock to the technician module alone. Ten client-side readers exist outside it, so **Task 12 was added** and Task 14 gated behind it.
2. The spec did not mention password reset; it remains out of scope, so `POST` is the only route that accepts a password.

**Known gap carried forward:** spec defect 6's "no password reset" is documented as out of scope and is not addressed here.

**Type consistency check.** `mapTechnician(id, data)`, `listTechnicians({shopId, branchId})`, `getTechnician(id)`, `getTechnicianByUserId(userId)`, `createTechnician({...input, shopId, createdBy})`, `updateTechnician(id, input)`, `deactivateTechnician(id)`, `emailExists(email, exceptUserId?)` are used consistently across Tasks 4–9. `ApiError(status, message)` argument order is consistent. The hook's exported names match all six existing call sites.

---

## Out of Scope

Unchanged from the spec: fabricated `Math.random()` metrics, the hardcoded "Online Now" figure, unpopulated rating/service counters, missing skills/availability/status UI, the invalid "busy" filter option, technician detail page, pagination, password reset, migrating branches and services off the client SDK, and the README's incorrect subcollection documentation.
