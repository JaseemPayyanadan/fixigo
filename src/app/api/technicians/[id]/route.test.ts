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
