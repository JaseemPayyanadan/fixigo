# Purchase Requests (Technician-Initiated, Repair-Linked)

**Date:** 2026-08-10
**Status:** Approved
**Scope:** Let a technician raise a purchase request for a spare part directly from a repair (Service), for a shop/branch admin to approve or reject. Fills in the "Purchase Requests" tab placeholder added in `7b1a402`.

## Problem

A technician diagnosing a repair often needs a spare part the shop doesn't have on hand. Today there's no way to flag that need — they either interrupt an admin verbally or the job stalls with no record of what's needed or why. `PurchaseTabs.tsx` already has a "Purchase Requests" tab and `purchases/requests/page.tsx` is a placeholder ("coming soon"); this spec is the real feature behind it.

## Goal

From a repair's details page, a technician can request one or more spare parts, with the request automatically carrying the repair's id and customer name. Shop/branch admins see pending requests in the Purchase Requests list and approve or reject each one. Approval does not itself create a Purchase — it just marks the request as cleared for an admin to act on manually via the existing Add Purchase flow.

## Non-goals

- Auto-generating a `Purchase` from an approved request, or linking a later `Purchase` back to the request that spawned it
- A spare-parts catalog/autocomplete — item entry is free text, same as `PurchaseItem` today
- Notifications (push/email/SMS) on status change
- Editing a request after submission (technician can only cancel a still-pending one; see below)
- Stock/inventory tracking of any kind

## Context: current state of the app

- **Repair = `Service`** (`src/types/index.ts`): has `id`, `customer.name`, `technician_id`, `shopId`, `branchId`. No existing concept of "repair id" separate from `Service.id`.
- **`PurchaseTabs.tsx`** already routes `/purchases/requests`, `/purchases`, `/purchases/suppliers`, `/purchases/returns`. The requests tab and page exist but render a placeholder only.
- **`PurchaseItem`** (`src/types/purchase.ts`) already carries an optional `serviceId`/`serviceRef` to link a purchased line back to a job — the new `PurchaseRequestItem` follows the same free-text shape (name, brand, model, quantity, remarks).
- **Roles** (`src/types/index.ts`): `shop_admin`, `branch_admin`, `technician`. Purchases/Suppliers are currently `shop_admin`/`branch_admin` only, scoped by `apiAuth.ts` helpers (`assertCanWritePurchase`, `assertCanReadPurchase`, etc.) that check shop/branch match plus role.
- **Data layer convention:** Firestore via `adminDb`, one `*Repo.ts` per domain (`purchaseRepo.ts`, `supplierRepo.ts`), HTTP handlers in `src/app/api/*`, feature UI in `src/modules/*`. Sequential per-shop-per-year refs are generated via `purchaseRef.ts`'s counter pattern (`PUR-2026-0012`).
- **Service details action buttons** live in `ServiceDetailsView.tsx` near the existing Edit/status-change buttons (`src/components/service/ServiceDetailsView.tsx:271-284`).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Entry point | Button on Service (repair) details page | Repair id and customer name are already on screen; pre-fills without re-entry |
| Who can create | `technician` (own assigned service) and `branch_admin`/`shop_admin` | Technicians are the primary requester; admins can also flag needs directly |
| Items per request | Multiple, in one item table | Mirrors the existing `PurchaseForm` item-table UX; avoids one-request-per-part churn for a multi-part job |
| Item entry | Free text (name, brand, model, qty, remarks) | No spares catalog exists; matches `PurchaseItem` today |
| Repair/customer fields | Denormalized onto the request (`serviceId`, `serviceRef`, `customerName`) | List and detail views render from one read, same pattern as `Purchase.supplierName` |
| Approval | `shop_admin` / `branch_admin` approve or reject each request | Same roles that already manage Purchases/Suppliers |
| Reject reason | Required free text on reject | Gives the technician a reason, mirrors purchase cancellation's `cancelReason` |
| Post-approval | Status flips to `approved`; no `Purchase` is created | Keeps this slice small; admin uses the existing Add Purchase flow separately |
| Technician cancel | Technician may cancel their own request while still `pending` | Lets them retract a mistaken request; no cancel once decided |
| Tenancy | Scoped by `shopId` + `branchId`, same as `Purchase` | Consistent with every other purchasing document |
| Ref numbering | New counter, `PR-2026-0001` style | Distinguishes from `PUR-...` purchase refs; reuses `purchaseRef.ts`'s counter mechanics |

### Rejected alternatives

- **Auto-create a draft Purchase on approval.** Considered, but the request has no supplier, price, or GST — an admin has to fill all of that in regardless, so a linked draft would add plumbing (draft state, orphan cleanup) without saving real steps this slice. Deferred until there's evidence admins want the link.
- **Item picked from a spares catalog.** No catalog exists anywhere in the app yet; building one is a prerequisite-sized project of its own, not a detail of this feature.

## Data model

```ts
// src/types/purchaseRequest.ts
export type PurchaseRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface PurchaseRequestItem {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
  remarks?: string;
}

export interface PurchaseRequest {
  id: string;
  shopId: string;
  branchId: string;
  /** App-generated, sequential per shop per year: "PR-2026-0007". */
  ref: string;

  serviceId: string;
  /** Denormalized so the list renders from one read. */
  serviceRef?: string;
  customerName: string;

  items: PurchaseRequestItem[];

  status: PurchaseRequestStatus;
  requestedBy: { userId: string; name: string };
  requestedAt: Date;

  decidedBy?: { userId: string; name: string };
  decidedAt?: Date;
  /** Required when status is "rejected". */
  rejectReason?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

Stored in a new top-level `purchaseRequests` Firestore collection (parallel to `purchases`), with its own `purchaseRequestCounters` collection following `purchaseRef.ts`'s existing pattern.

## API

Following `src/app/api/purchases/route.ts` conventions:

- `POST /api/purchase-requests` — create. `technician` (must be the service's assigned technician or a service in their branch), `branch_admin`, `shop_admin`. Validates `serviceId` resolves to a `Service` in the caller's shop/branch, denormalizes `serviceRef`/`customerName` from it.
- `GET /api/purchase-requests` — list, scoped like `GET /api/purchases` (shop-wide for `shop_admin`, branch-scoped for `branch_admin`/`technician`).
- `GET /api/purchase-requests/[id]` — detail.
- `PATCH /api/purchase-requests/[id]` — status transition:
  - `{ action: "approve" }` — `branch_admin`/`shop_admin` only, request must be `pending`.
  - `{ action: "reject", reason }` — `branch_admin`/`shop_admin` only, `pending` only, `reason` required.
  - `{ action: "cancel" }` — original `requestedBy` only, `pending` only.

New `apiAuth.ts` helpers `assertCanReadPurchaseRequest` / `assertCanWritePurchaseRequest`, modeled on the existing `assertCanReadPurchase` / `assertCanWritePurchase`, but additionally permitting `technician` for create/cancel of their own requests.

## UI

- **Service details page** (`ServiceDetailsView.tsx`): new "Request Spare Part" button next to the existing action buttons, visible to `technician` (own service), `branch_admin`, `shop_admin`. Opens a form (modal or slide-over, matching how `PurchaseForm` is hosted) with repair id + customer name shown read-only, and an editable item table (name, brand, model, qty, remarks) with add/remove rows.
- **Purchase Requests list** (`purchases/requests/page.tsx`, replacing the placeholder): table of ref, repair id (links to the service), customer name, item count, requested by, requested date, status badge — mirrors `PurchaseList.tsx`'s structure.
- **Request details**: full item table, status, and for `branch_admin`/`shop_admin` on a `pending` request, Approve / Reject actions (Reject opens a small dialog asking for the reason, mirroring purchase cancellation's flow). For the original requester on a `pending` request, a Cancel action.

## Testing

- `purchaseRequestRepo.test.ts` — create denormalizes service fields correctly; ref counter increments per shop/year; approve/reject/cancel enforce valid status transitions; reject without a reason is rejected.
- `apiAuth.test.ts` additions — technician can create/cancel own request, cannot approve/reject; branch_admin/shop_admin can approve/reject within their scope but not cross-shop; technician cannot read another branch's requests when scoped that way (matching existing purchase scoping tests).
- API route tests for `/api/purchase-requests` and `/api/purchase-requests/[id]`, following the existing `purchases` route test shape.
