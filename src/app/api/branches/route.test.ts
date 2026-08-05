import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const listBranches = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/branchRepo", () => ({ listBranches }));

const { GET } = await import("@/app/api/branches/route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/branches", () => {
  it("lists branches for the session shop", async () => {
    requireUser.mockResolvedValue({
      id: "u1",
      role: "shop_admin",
      shopId: "shop-1",
      email: "a@b.com",
      name: "Admin",
    });
    listBranches.mockResolvedValue([{ id: "b1", name: "Main", shopId: "shop-1" }]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(listBranches).toHaveBeenCalledWith("shop-1");
    await expect(response.json()).resolves.toEqual({
      branches: [{ id: "b1", name: "Main", shopId: "shop-1" }],
    });
  });

  it("rejects users without a shop", async () => {
    requireUser.mockResolvedValue({
      id: "u1",
      role: "shop_admin",
      email: "a@b.com",
      name: "Admin",
    });

    const response = await GET();
    expect(response.status).toBe(403);
    expect(listBranches).not.toHaveBeenCalled();
  });
});
