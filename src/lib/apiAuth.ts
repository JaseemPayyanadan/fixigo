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

/**
 * Reads and parses a request body as JSON, translating a malformed body
 * (empty, non-JSON) into a 400 ApiError instead of letting the underlying
 * SyntaxError propagate and get mapped to a 500 by `toErrorResponse`.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

interface BranchScope {
  shopId: string;
  branchId: string;
}

/**
 * Shared shop_admin/branch_admin/technician rule for anything scoped to a
 * branch: shop_admin reaches every branch in their shop, branch_admin only
 * their own, technicians never (they use neither purchases nor suppliers).
 */
function assertBranchScopedAccess(
  user: AuthUser,
  target: BranchScope,
  resource: string,
  verb: string
): void {
  if (!user.shopId || user.shopId !== target.shopId) {
    throw new ApiError(403, `Not permitted to ${verb} ${resource} in this shop`);
  }

  if (user.role === "shop_admin") return;

  if (user.role === "branch_admin") {
    if (user.branchId && user.branchId === target.branchId) return;
    throw new ApiError(403, `Not permitted to ${verb} ${resource} in this branch`);
  }

  throw new ApiError(403, `Not permitted to ${verb} ${resource}`);
}

type PurchaseScope = BranchScope;

/**
 * Purchasing is money-handling, so technicians are excluded at every level —
 * the nav entry is hidden and these guards are the enforcement behind it.
 */
function assertPurchaseAccess(user: AuthUser, target: PurchaseScope, verb: string): void {
  assertBranchScopedAccess(user, target, "purchases", verb);
}

export function assertCanReadPurchase(user: AuthUser, target: PurchaseScope): void {
  assertPurchaseAccess(user, target, "view");
}

export function assertCanWritePurchase(user: AuthUser, target: PurchaseScope): void {
  assertPurchaseAccess(user, target, "modify");
}

/** Suppliers belong to one branch, same access rule as purchases. */
type SupplierScope = BranchScope;

export function assertCanReadSupplier(user: AuthUser, target: SupplierScope): void {
  assertBranchScopedAccess(user, target, "suppliers", "view");
}

export function assertCanWriteSupplier(user: AuthUser, target: SupplierScope): void {
  assertBranchScopedAccess(user, target, "suppliers", "modify");
}
