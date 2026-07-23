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
