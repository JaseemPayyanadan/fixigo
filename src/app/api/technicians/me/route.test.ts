import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getTechnicianByUserId = vi.fn();
const updateTechnician = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/technicianRepo", () => ({
  getTechnicianByUserId,
  updateTechnician,
}));

const { GET, PATCH } = await import("@/app/api/technicians/me/route");

const currentUser = { id: "u1", role: "technician", shopId: "shop-1", branchId: "branch-1" };
const technician = {
  id: "t1",
  shopId: "shop-1",
  branchId: "branch-1",
  userId: "u1",
  name: "Fasna",
};

function request(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/technicians/me", {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/technicians/me", () => {
  it("returns 401 without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the caller's own technician record, looked up by their user ID", async () => {
    requireUser.mockResolvedValue(currentUser);
    getTechnicianByUserId.mockResolvedValue(technician);

    const response = await GET();

    expect(getTechnicianByUserId).toHaveBeenCalledWith("u1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ technician });
  });

  it("returns {technician: null} when the caller has no technician record", async () => {
    requireUser.mockResolvedValue(currentUser);
    getTechnicianByUserId.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ technician: null });
  });
});

describe("PATCH /api/technicians/me", () => {
  it("returns 401 without a session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await PATCH(request("PATCH", { name: "X" }));
    expect(response.status).toBe(401);
  });

  it("returns 404 when the caller has no technician record", async () => {
    requireUser.mockResolvedValue(currentUser);
    getTechnicianByUserId.mockResolvedValue(null);

    const response = await PATCH(request("PATCH", { name: "X" }));

    expect(response.status).toBe(404);
    expect(updateTechnician).not.toHaveBeenCalled();
  });

  it("rejects branchId with 403 and does not call updateTechnician", async () => {
    requireUser.mockResolvedValue(currentUser);
    getTechnicianByUserId.mockResolvedValue(technician);

    const response = await PATCH(request("PATCH", { branchId: "branch-2" }));

    expect(response.status).toBe(403);
    expect(updateTechnician).not.toHaveBeenCalled();
  });

  it("rejects status with 403 and does not call updateTechnician", async () => {
    requireUser.mockResolvedValue(currentUser);
    getTechnicianByUserId.mockResolvedValue(technician);

    const response = await PATCH(request("PATCH", { status: "inactive" }));

    expect(response.status).toBe(403);
    expect(updateTechnician).not.toHaveBeenCalled();
  });

  it("updates name and phone successfully, using the caller's OWN technician id", async () => {
    requireUser.mockResolvedValue(currentUser);
    getTechnicianByUserId.mockResolvedValue(technician);
    const updated = { ...technician, name: "New Name", phone: "1234567890" };
    updateTechnician.mockResolvedValue(updated);

    const response = await PATCH(
      request("PATCH", { name: "New Name", phone: "1234567890" })
    );

    expect(updateTechnician).toHaveBeenCalledWith("t1", {
      name: "New Name",
      phone: "1234567890",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ technician: updated });
  });

  it("returns 400 on a malformed body", async () => {
    requireUser.mockResolvedValue(currentUser);
    getTechnicianByUserId.mockResolvedValue(technician);

    const malformedRequest = new NextRequest("http://localhost/api/technicians/me", {
      method: "PATCH",
      body: "not json",
    });

    const response = await PATCH(malformedRequest);

    expect(response.status).toBe(400);
    expect(updateTechnician).not.toHaveBeenCalled();
  });
});
