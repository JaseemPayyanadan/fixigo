import { describe, expect, it, vi, beforeEach } from "vitest";

import { verifyToken } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    verifyToken: vi.fn(),
  };
});

import { cookies } from "next/headers";

import {
  ApiError,
  assertCanReadPurchase,
  assertCanReadSupplier,
  assertCanReadTechnician,
  assertCanWritePurchase,
  assertCanWriteSupplier,
  assertCanWriteTechnician,
  listScopeFor,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from "@/lib/apiAuth";

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

  it("denies a shop mismatch", () => {
    expect(() =>
      assertCanReadTechnician(user(), { shopId: "shop-2", branchId: "branch-1" })
    ).toThrow(ApiError);

    try {
      assertCanReadTechnician(user(), { shopId: "shop-2", branchId: "branch-1" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as ApiError).status).toBe(403);
    }
  });

  it("allows a branch admin reading within their own branch", () => {
    const branchAdmin = user({ role: "branch_admin", branchId: "branch-1" });
    expect(() => assertCanReadTechnician(branchAdmin, target)).not.toThrow();
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

describe("requireUser", () => {
  beforeEach(() => {
    vi.mocked(cookies).mockReset();
    vi.mocked(verifyToken).mockReset();
  });

  it("throws a 401 ApiError when the session cookie is absent", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(requireUser()).rejects.toThrow(ApiError);

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    try {
      await requireUser();
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as ApiError).status).toBe(401);
    }
  });

  it("throws a 401 ApiError when the cookie is present but verifyToken rejects it", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ name: "session", value: "bad-token" }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(verifyToken).mockReturnValue(null);

    try {
      await requireUser();
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(401);
    }
  });

  it("returns the AuthUser when the cookie holds a valid token", async () => {
    const validUser = user();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ name: "session", value: "good-token" }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(verifyToken).mockReturnValue(validUser);

    await expect(requireUser()).resolves.toEqual(validUser);
  });
});

describe("readJsonBody", () => {
  it("returns the parsed JSON body when it is valid", async () => {
    const request = new Request("http://localhost/x", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });

    await expect(readJsonBody(request)).resolves.toEqual({ a: 1 });
  });

  it("throws a 400 ApiError for an empty body", async () => {
    const request = new Request("http://localhost/x", { method: "POST" });

    try {
      await readJsonBody(request);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
    }
  });

  it("throws a 400 ApiError for a non-JSON body", async () => {
    const request = new Request("http://localhost/x", {
      method: "POST",
      body: "not json",
    });

    try {
      await readJsonBody(request);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
    }
  });
});

function purchaseUser(overrides: Partial<AuthUser>): AuthUser {
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
      assertCanWritePurchase(purchaseUser({ role: "shop_admin" }), {
        shopId: "shop-1",
        branchId: "branch-9",
      })
    ).not.toThrow();
  });

  it("allows a branch_admin in their own branch", () => {
    expect(() =>
      assertCanWritePurchase(purchaseUser({ role: "branch_admin" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).not.toThrow();
  });

  it("rejects a branch_admin in another branch", () => {
    expect(() =>
      assertCanWritePurchase(purchaseUser({ role: "branch_admin" }), {
        shopId: "shop-1",
        branchId: "branch-2",
      })
    ).toThrow(/not permitted/i);
  });

  it("rejects a technician outright", () => {
    expect(() =>
      assertCanWritePurchase(purchaseUser({ role: "technician" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).toThrow(/not permitted/i);
  });

  it("rejects any user from another shop", () => {
    expect(() =>
      assertCanWritePurchase(purchaseUser({ role: "shop_admin", shopId: "shop-2" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).toThrow(/not permitted/i);
  });

  it("rejects a user with no shop", () => {
    expect(() =>
      assertCanWritePurchase(purchaseUser({ shopId: undefined }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).toThrow(/not permitted/i);
  });
});

describe("assertCanReadPurchase", () => {
  it("rejects a technician", () => {
    expect(() =>
      assertCanReadPurchase(purchaseUser({ role: "technician" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).toThrow(/not permitted/i);
  });

  it("allows a branch_admin in their own branch", () => {
    expect(() =>
      assertCanReadPurchase(purchaseUser({ role: "branch_admin" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).not.toThrow();
  });
});

describe("assertCanWriteSupplier", () => {
  it("allows a shop_admin anywhere in their own shop", () => {
    expect(() =>
      assertCanWriteSupplier(purchaseUser({ role: "shop_admin" }), {
        shopId: "shop-1",
        branchId: "branch-9",
      })
    ).not.toThrow();
  });

  it("allows a branch_admin in their own branch", () => {
    expect(() =>
      assertCanWriteSupplier(purchaseUser({ role: "branch_admin" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).not.toThrow();
  });

  it("rejects a branch_admin in another branch", () => {
    expect(() =>
      assertCanWriteSupplier(purchaseUser({ role: "branch_admin" }), {
        shopId: "shop-1",
        branchId: "branch-2",
      })
    ).toThrow(/not permitted/i);
  });

  it("rejects a technician", () => {
    expect(() =>
      assertCanWriteSupplier(purchaseUser({ role: "technician" }), {
        shopId: "shop-1",
        branchId: "branch-1",
      })
    ).toThrow(/not permitted/i);
  });
});

describe("assertCanReadSupplier", () => {
  it("rejects a supplier from another shop", () => {
    expect(() =>
      assertCanReadSupplier(purchaseUser({ role: "shop_admin" }), {
        shopId: "shop-2",
        branchId: "branch-1",
      })
    ).toThrow(/not permitted/i);
  });
});

describe("toErrorResponse", () => {
  it("maps an ApiError to a response carrying its status and message", async () => {
    const response = toErrorResponse(new ApiError(403, "Not permitted"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "Not permitted" });
  });

  it("maps an unknown thrown value to a 500 without leaking the original error message", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = toErrorResponse(new Error("secret internal detail"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(body)).not.toContain("secret internal detail");

    consoleErrorSpy.mockRestore();
  });
});
