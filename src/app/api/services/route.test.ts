import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const listServices = vi.fn();
const getTechnicianByUserId = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/serviceRepo", async () => {
  const actual = await vi.importActual<typeof import("@/lib/serviceRepo")>("@/lib/serviceRepo");
  return { ...actual, listServices };
});
vi.mock("@/lib/technicianRepo", () => ({ getTechnicianByUserId }));

const { GET } = await import("@/app/api/services/route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/services", () => {
  it("lists services scoped to the session shop", async () => {
    requireUser.mockResolvedValue({
      id: "u1",
      role: "shop_admin",
      shopId: "shop-1",
      email: "a@b.com",
      name: "Admin",
    });
    listServices.mockResolvedValue([{ id: "s1", name: "Fix screen", shopId: "shop-1" }]);

    const response = await GET(new NextRequest("http://localhost/api/services"));
    expect(response.status).toBe(200);
    expect(listServices).toHaveBeenCalledWith({ shopId: "shop-1", branchId: undefined });
    await expect(response.json()).resolves.toEqual({
      services: [{ id: "s1", name: "Fix screen", shopId: "shop-1" }],
    });
  });

  it("pins non-admins to their branch", async () => {
    requireUser.mockResolvedValue({
      id: "u2",
      role: "branch_admin",
      shopId: "shop-1",
      branchId: "b1",
      email: "b@b.com",
      name: "Branch",
    });
    listServices.mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/services"));
    expect(listServices).toHaveBeenCalledWith({ shopId: "shop-1", branchId: "b1" });
  });

  it("filters technician results to assigned or self-created jobs", async () => {
    requireUser.mockResolvedValue({
      id: "user-tech",
      role: "technician",
      shopId: "shop-1",
      branchId: "b1",
      email: "t@b.com",
      name: "Tech",
    });
    getTechnicianByUserId.mockResolvedValue({ id: "tech-doc-1", userId: "user-tech" });
    listServices.mockResolvedValue([
      {
        id: "assigned",
        shopId: "shop-1",
        branchId: "b1",
        technician_id: "tech-doc-1",
        created_by: { id: "other" },
      },
      {
        id: "created",
        shopId: "shop-1",
        branchId: "b1",
        technician_id: "someone-else",
        created_by: { id: "user-tech" },
      },
      {
        id: "other",
        shopId: "shop-1",
        branchId: "b1",
        technician_id: "other-tech",
        created_by: { id: "other" },
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/services"));
    const body = await response.json();
    expect(body.services.map((s: { id: string }) => s.id).sort()).toEqual(["assigned", "created"]);
  });
});
