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
  it("returns 401 without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await GET(request("GET"), { params });
    expect(response.status).toBe(401);
  });

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

  it("returns 400 for a malformed (non-JSON) body instead of 500", async () => {
    requireUser.mockResolvedValue(shopAdmin);

    const malformedRequest = new NextRequest("http://localhost/api/technicians/t1", {
      method: "PATCH",
      body: "not json",
    });

    const response = await PATCH(malformedRequest, { params });

    expect(response.status).toBe(400);
    expect(updateTechnician).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing technician without calling updateTechnician (load-before-mutate ordering)", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    getTechnician.mockResolvedValue(null);

    const response = await PATCH(request("PATCH", { name: "X" }), { params });

    expect(response.status).toBe(404);
    expect(updateTechnician).not.toHaveBeenCalled();
  });

  it("returns 403 for a technician in another shop", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    getTechnician.mockResolvedValue({ ...technician, shopId: "shop-2" });

    const response = await PATCH(request("PATCH", { name: "X" }), { params });

    expect(response.status).toBe(403);
    expect(updateTechnician).not.toHaveBeenCalled();
  });

  it("returns 400 for a genuinely invalid payload via the real parseUpdateInput", async () => {
    requireUser.mockResolvedValue(shopAdmin);

    const response = await PATCH(request("PATCH", { status: "not-a-status" }), { params });

    expect(response.status).toBe(400);
    expect(updateTechnician).not.toHaveBeenCalled();
  });

  it("persists branchId and status, which the old form discarded, and returns the updated technician", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    const updated = { ...technician, branchId: "branch-2", status: "inactive" };
    updateTechnician.mockResolvedValue(updated);

    const response = await PATCH(request("PATCH", { branchId: "branch-2", status: "inactive" }), {
      params,
    });

    expect(updateTechnician).toHaveBeenCalledWith("t1", {
      branchId: "branch-2",
      status: "inactive",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ technician: updated });
  });

  it("checks the target branch when moving a technician (push INTO a foreign branch)", async () => {
    requireUser.mockResolvedValue({
      ...shopAdmin,
      role: "branch_admin",
      branchId: "branch-1",
    });

    const response = await PATCH(request("PATCH", { branchId: "branch-2" }), { params });

    expect(response.status).toBe(403);
    expect(updateTechnician).not.toHaveBeenCalled();
  });

  it("rejects pulling a technician OUT of a branch the admin does not administer", async () => {
    requireUser.mockResolvedValue({
      ...shopAdmin,
      role: "branch_admin",
      branchId: "branch-1",
    });
    getTechnician.mockResolvedValue({ ...technician, branchId: "branch-9" });

    const response = await PATCH(request("PATCH", { branchId: "branch-1" }), { params });

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
  it("returns 401 without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await DELETE(request("DELETE"), { params });
    expect(response.status).toBe(401);
  });

  it("returns 404 for a missing technician without calling deactivateTechnician (load-before-mutate ordering)", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    getTechnician.mockResolvedValue(null);

    const response = await DELETE(request("DELETE"), { params });

    expect(response.status).toBe(404);
    expect(deactivateTechnician).not.toHaveBeenCalled();
  });

  it("returns 403 for a technician in another shop", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    getTechnician.mockResolvedValue({ ...technician, shopId: "shop-2" });

    const response = await DELETE(request("DELETE"), { params });

    expect(response.status).toBe(403);
    expect(deactivateTechnician).not.toHaveBeenCalled();
  });

  it("soft-deletes rather than removing the document, and returns {success: true}", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    deactivateTechnician.mockResolvedValue(undefined);

    const response = await DELETE(request("DELETE"), { params });

    expect(response.status).toBe(200);
    expect(deactivateTechnician).toHaveBeenCalledWith("t1");
    await expect(response.json()).resolves.toEqual({ success: true });
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
