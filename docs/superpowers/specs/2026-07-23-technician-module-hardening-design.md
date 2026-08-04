# Technician Module: Correctness and Security Hardening

**Date:** 2026-07-23
**Status:** Approved design, not yet implemented
**Scope:** Make technician CRUD actually work, and move it off the unauthenticated client-side Firestore path.

## Problem

An audit of the technician module found twenty-one defects. This spec addresses the
correctness and security subset. Cosmetic and feature gaps are deferred (see
[Out of Scope](#out-of-scope)).

### Broken behaviour

1. **Edit is entirely non-functional.** `TechnicianList.tsx:196` and `:311` navigate to
   `/technicians/edit?id=<id>` (a query string), but `edit/page.tsx:27,41` reads
   `useParams().id` — a *route* param. The route is `technicians/edit/page.tsx`, not
   `[id]`, so `technicianId` is always `undefined`. The effect returns early at line 45
   without calling `setLoading(false)`, leaving the page on "Loading Technician" forever.

2. **Edit silently discards fields.** `handleEdit` (`edit/page.tsx:94`) accepts only
   name/email/phone. The form still renders a branch selector for shop admins; selecting
   a branch and submitting does nothing.

3. **Writes are never atomic and one has never worked.** Create touches three locations
   (`users`, `technicians`, branch `members`). Edit touches only `technicians`, so
   name/email/phone drift out of sync with the `users` doc used for login. Delete removes
   only the `technicians` doc, orphaning a working login and every service holding that
   `technician_id`.

4. **The branch-members write targets a path that does not exist.**
   `technicians/create/route.ts:115` writes to `shops/{shopId}/branches/{branchId}`, but
   branches live in the **top-level `branches`** collection (`useBranches.ts:46`,
   `branches/create/route.ts:33`). `updateDoc` on a missing document throws, and line 123
   swallows the error. This write has never succeeded. `src/lib/userManagement.ts` exists
   as a manual repair script for the resulting drift, and introduces a *third* competing
   layout at line 275 (`shops/{}/branches/{}/technicians`).

5. **`created_by` holds the wrong value.** `route.ts:103` sets it to the new technician's
   own `userId`, contradicting the field's documented meaning ("ID of the user who created
   this technician").

6. **No email-uniqueness check on update**, and no way to reset a technician's password
   after creation.

### Security posture

7. **`/api/technicians/create` has no authentication or authorization.** No session check,
   no verification that the caller owns `shopId` or administers `branchId`. An
   unauthenticated POST creates an active user account with working login credentials in
   any shop.

8. **The application never authenticates to Firebase.** `src/lib/firebase.ts` imports only
   `firebase/app` and `firebase/firestore`; there is no `firebase/auth` import or
   `signInWith*` call anywhere in `src/`. Authentication is entirely custom — bcrypt plus a
   `jsonwebtoken` JWT in an HttpOnly `session` cookie (`src/lib/auth.ts`,
   `api/auth/login/route.ts:24`).

   Therefore `request.auth` is **null on every client-side Firestore call**, and every rule
   in `firestore.rules` is gated behind `isAuthenticated()` → `request.auth != null` →
   permanently false. Were that file the deployed ruleset, the app could not read a single
   document.

   Since the app works, the **deployed** rules are inferred to be permissive — open, or an
   expired test-mode default. This is an inference from observed behaviour, not a fact read
   from the repo; confirm via the Firebase console or
   `firebase deploy --only firestore:rules --dry-run` before relying on it. If it holds, the
   database is world-readable and world-writable to anyone holding the project ID — which is
   hardcoded as a fallback at `src/lib/firebase.ts:8` and shipped to every browser regardless.
   That exposes the `users` collection, bcrypt password hashes included.

9. **The rules file does not describe the real schema.** `isBranchAdmin()` (rules:19) checks
   a top-level `/branches/{id}` for an `adminId` field, but branches carry `managerId`.
   `isTechnician()` (rules:25) compares `auth.uid` against the technician's autoId document
   ID, which can never match. `allow delete: if false` (rules:55) means the client-side
   `deleteTechnician` would be rejected even under a working ruleset.

## Approach

Two options were considered.

**A — Give Firestore an identity.** Add `firebase-admin`, mint a Firebase custom token at
login carrying `shopId`/`branchId`/`role` as claims, sign the client in alongside the
existing JWT. Rules become enforceable; the client keeps reading Firestore directly.

**B — Take Firestore off the client (chosen).** Technician reads and writes move behind
Next.js API routes that verify the `session` cookie. The `technicians` collection is locked
to server-only access.

B was chosen because defect 3 requires updating `users`, `technicians`, and `branches`
atomically, which cannot be done safely from a client under any ruleset — it belongs in a
server-side transaction. Option A would mean authoring intricate rules to permit a
multi-collection write that should not be client-side at all. B additionally resolves the
duplicated-mapper and refetch-scope defects (17–19) as a side effect of moving that logic
to the server.

**Cost, stated plainly:** B is the larger refactor, and it covers only the technician
module. Branches and services remain on the client SDK, leaving the app in a mixed state
until they are migrated under separate specs.

### Hard dependency

The Firestore **client SDK enforces security rules regardless of where it executes** —
including inside a Next.js route handler. Every existing API route uses it
(`import { db } from "@/lib/firebase"`). Locking the `technicians` collection would
therefore break the server routes too.

Option B consequently **requires `firebase-admin`**, which bypasses rules via a service
account. This depends on an operator action outside the codebase: provisioning a
`FIREBASE_SERVICE_ACCOUNT_KEY` secret (the service-account JSON) in Vercel and in local
`.env.local`. **No part of this design functions without it.**

## Components

### `src/lib/firebaseAdmin.ts` (new)

Initializes a `firebase-admin` app from `FIREBASE_SERVICE_ACCOUNT_KEY`, guarding against
double-init in dev via `getApps()`. Exports `adminDb`. Throws a clear startup error naming
the missing variable if the key is absent, rather than failing obscurely at first query.

Server-only. Never imported from a `"use client"` module.

### `src/lib/apiAuth.ts` (new)

- `requireUser(request): Promise<AuthUser>` — reads the `session` cookie, runs the existing
  `verifyToken` from `src/lib/auth.ts`, returns the user or throws a typed `ApiError(401)`.
- `assertCanWriteTechnician(user, { shopId, branchId }): void` — applies the authorization
  already encoded in `src/lib/rbac.ts`, server-side:
  - `shop_admin` — any branch within their own `shopId`
  - `branch_admin` — only their own `branchId`
  - `technician` — denied
  Throws `ApiError(403)` otherwise.
- `assertCanReadTechnician(user, technician)` — same scoping for reads.

Caller-supplied `shopId` is never trusted; it is always taken from the verified session.

### `src/lib/technicianRepo.ts` (new)

The single Firestore↔`Technician` mapper, replacing the four copies in
`useTechnicians.ts` (lines 56, 132, 189, 241) and the fifth in `edit/page.tsx:59`.

Also hosts the transactional write functions described under
[Write integrity](#write-integrity).

### API routes

`/api/technicians/create` is replaced by a REST surface. Every handler calls `requireUser`
first.

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/api/technicians` | List, scoped to caller's shop; branch admins forced to their own branch. Optional `branchId` filter for shop admins. |
| `POST` | `/api/technicians` | Create. |
| `GET` | `/api/technicians/[id]` | Fetch one, for the edit page. |
| `PATCH` | `/api/technicians/[id]` | Update. |
| `DELETE` | `/api/technicians/[id]` | Soft delete (see below). |

### `src/hooks/useTechnicians.ts` (rewritten)

Becomes a thin `fetch` client — no Firestore imports, no mapper. Post-mutation refetch
preserves the `branchId` argument, fixing the defect where a branch admin's list silently
widened to the whole shop after any mutation. Expected to drop from 301 lines to roughly 120.

`new/page.tsx:28` contains `const { } = useTechnicians(shopId, branchId);` — a dead
destructure triggering a full collection fetch for nothing. Removed.

## Firestore rules

The repo's rules file **cannot be deployed as written** — its `isAuthenticated()` gates
would break every module still using the client SDK (branches, services, users). The file is
rewritten to state the actual posture:

```
match /technicians/{id} { allow read, write: if false; }   // server-only via admin SDK
match /branches/{id}    { allow read, write: if true;  }   // TODO: unmigrated — client SDK
match /services/{id}    { allow read, write: if true;  }   // TODO: unmigrated — client SDK
match /users/{id}       { allow read, write: if true;  }   // TODO: unmigrated — client SDK
```

The explicit `if true` lines look alarming, and should. They do not make the application
less secure than it is today; they make today's actual posture visible in version control
rather than implied by a file that was never deployed. Each future module migration flips one
line to `false`.

The dead helper functions (`isShopOwner`, `isBranchAdmin`, `isTechnician`) are deleted rather
than left as documentation of a schema that does not exist.

## Write integrity

Each operation becomes a single `runTransaction` on the admin SDK.

**Create** — writes the `users` doc, the `technicians` doc, and
`branches/{branchId}.members` atomically, using the **correct top-level `branches` path**.
`created_by` is set to the **caller's** ID. Rejects duplicate emails against `users`.

**Update** — syncs `name`/`email`/`phone` to the linked `users` doc and to the `members`
entry; persists `branchId` and `status`, which the form already collects and currently
discards. Re-checks email uniqueness, excluding the technician's own record.

**Delete — soft delete.** Sets `status: "inactive"` on the technician and
`status: "suspended"` on the linked `users` doc, and removes the entry from
`branches.members`. Services are left untouched.

Rationale: login stops working immediately, while history stays intact — `technician_id` on
past services and invoices still resolves to a name. Hard deletion would destroy the record
of who performed past work, which is unacceptable for a business that issues invoices
against it.

The `DELETE` verb is retained for the route; the UI's button label and confirmation copy
change from "Delete" to "Deactivate" to match the real behaviour. Deactivated technicians
remain visible under the existing "Inactive" status filter.

### Required follow-on change

`TechnicianDashboard.tsx:124` falls back to `where("created_by", "==", user.id)` to locate a
technician's own record. That works **only because `created_by` is currently mis-set**.
Correcting the field breaks the lookup, so the dashboard must switch to querying `userId`
within the same change.

Existing rows need a one-time backfill to correct `created_by` and to populate the
`branches.members` entries that never got written. `src/lib/userManagement.ts` is the natural
home — it already performs this class of repair.

## Edit page

Keep the query-parameter convention (`?id=`) used by `services/details` and reinforced by
commit `20ed83a`: switch `useParams()` → `useSearchParams()` rather than restructuring to
`[id]/edit`. Data loading moves from the inline Firestore call to
`GET /api/technicians/[id]`.

Add the missing `setLoading(false)` on the early-return path so an absent or invalid ID
renders the existing "Technician Not Found" state instead of spinning indefinitely.

`handleEdit` is widened to submit `branchId` and `status` alongside name/email/phone.

## Testing

Vitest is already configured (`vitest.config.ts`); `src/lib/dashboardAnalytics.test.ts` is
currently the only test in the repo.

- **`apiAuth` authorization matrix** — each role × own/other shop × own/other branch.
  Pure functions, and the highest-value coverage in this spec: these assertions are what
  stand between the module and defect 7.
- **Payload validation** — required fields, email format, duplicate-email rejection.
- **`technicianRepo` transactions** — against a mocked `adminDb`, asserting each transaction
  is *assembled* correctly (right paths, right documents, all-or-nothing). Notably that
  branch members target `branches/{id}` and not the historical `shops/...` path.
- **Route handlers** — 401 without a session cookie, 403 for cross-shop and cross-branch
  access, 200 on the happy path.

An emulator-backed integration suite is deliberately not included in this pass.

## Out of scope

Deferred to later specs, tracked but not addressed here:

- **Fabricated data** — `Math.random()` metrics in `TechnicianList.tsx:29-42` (which
  re-randomize on every render, visibly changing as the user types in the search box); the
  hardcoded `Math.floor(total * 0.7)` "Online Now" figure in `page.tsx:42` and
  `useTechnicians.ts:276`; and `rating`/`totalServices`/`completedServices`, which are seeded
  to 0 and never aggregated from services.
- **Missing UI** — no editor for `skills`, `specializations`, `bio`, `experience`, or
  `availability`, despite all five existing on the type and being seeded at creation; no
  activate/deactivate control; no technician detail page; no pagination; no self-profile view
  for the technician role.
- **Invalid filter option** — the status filter offers "busy", which is not a valid
  `Technician["status"]`.
- **Password reset** for existing technicians.
- **Migrating branches and services** off the client SDK.
- **README correction** — it documents a
  `shops/{}/branches/{}/technicians/{}` subcollection layout that the code does not use.
