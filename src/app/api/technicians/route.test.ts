import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const listTechnicians = vi.fn();
const createTechnician = vi.fn();
const emailExists = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/technicianRepo", () => ({
  listTechnicians,
  createTechnician,
  emailExists,
}));

const { GET, POST } = await import("@/app/api/technicians/route");

const shopAdmin = {
  id: "admin-1",
  role: "shop_admin",
  shopId: "shop-1",
  email: "a@b.com",
  name: "Admin",
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/technicians", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  emailExists.mockResolvedValue(false);
});

describe("GET /api/technicians", () => {
  it("returns 401 when there is no session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await GET(new NextRequest("http://localhost/api/technicians"));
    expect(response.status).toBe(401);
  });

  it("scopes the query to the session shop", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    listTechnicians.mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/technicians"));

    expect(listTechnicians).toHaveBeenCalledWith({
      shopId: "shop-1",
      branchId: undefined,
    });
  });

  it("pins a branch admin to their own branch even if they ask for another", async () => {
    requireUser.mockResolvedValue({
      ...shopAdmin,
      role: "branch_admin",
      branchId: "branch-1",
    });
    listTechnicians.mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/technicians?branchId=branch-9"));

    expect(listTechnicians).toHaveBeenCalledWith({
      shopId: "shop-1",
      branchId: "branch-1",
    });
  });
});

describe("POST /api/technicians", () => {
  const body = {
    name: "Anshid",
    email: "anshid@example.com",
    phone: "999",
    password: "secret123",
    branchId: "branch-1",
  };

  it("returns 400 for a malformed (non-JSON) body instead of 500", async () => {
    requireUser.mockResolvedValue(shopAdmin);

    const malformedRequest = new NextRequest("http://localhost/api/technicians", {
      method: "POST",
      body: "not json",
    });

    const response = await POST(malformedRequest);

    expect(response.status).toBe(400);
    expect(createTechnician).not.toHaveBeenCalled();
  });

  it("returns 401 without a session — the old endpoint accepted this", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await POST(postRequest(body));

    expect(response.status).toBe(401);
    expect(createTechnician).not.toHaveBeenCalled();
  });

  it("returns 403 when a branch admin targets another branch", async () => {
    requireUser.mockResolvedValue({
      ...shopAdmin,
      role: "branch_admin",
      branchId: "branch-2",
    });

    const response = await POST(postRequest(body));

    expect(response.status).toBe(403);
    expect(createTechnician).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied shopId and uses the session's", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    createTechnician.mockResolvedValue({ id: "t1" });

    await POST(postRequest({ ...body, shopId: "attacker-shop" }));

    expect(createTechnician).toHaveBeenCalledWith(
      expect.objectContaining({ shopId: "shop-1", createdBy: "admin-1" })
    );
  });

  it("returns 400 for a duplicate email", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    emailExists.mockResolvedValue(true);

    const response = await POST(postRequest(body));

    expect(response.status).toBe(400);
    expect(createTechnician).not.toHaveBeenCalled();
  });

  it("returns 201 on success", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    createTechnician.mockResolvedValue({ id: "t1", name: "Anshid" });

    const response = await POST(postRequest(body));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      technician: { id: "t1", name: "Anshid" },
    });
  });
});
