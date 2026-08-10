import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const listPurchaseRequests = vi.fn();
const createPurchaseRequest = vi.fn();
const getService = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/purchaseRequestRepo", () => ({
  listPurchaseRequests,
  createPurchaseRequest,
}));

vi.mock("@/lib/serviceRepo", () => ({
  getService,
}));

const { GET, POST } = await import("@/app/api/purchase-requests/route");

const technician = {
  id: "tech-1",
  role: "technician",
  shopId: "shop-1",
  branchId: "branch-1",
  email: "t@b.com",
  name: "Anshid",
};

const shopAdmin = {
  id: "admin-1",
  role: "shop_admin",
  shopId: "shop-1",
  email: "a@b.com",
  name: "Admin",
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/purchase-requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/purchase-requests", () => {
  it("returns 401 with no session", async () => {
    const { ApiError } = await import("@/lib/apiAuth");
    requireUser.mockRejectedValue(new ApiError(401, "Not authenticated"));

    const response = await GET(new NextRequest("http://localhost/api/purchase-requests"));
    expect(response.status).toBe(401);
  });

  it("pins a technician to their own branch", async () => {
    requireUser.mockResolvedValue(technician);
    listPurchaseRequests.mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/purchase-requests?branchId=branch-9"));

    expect(listPurchaseRequests).toHaveBeenCalledWith({
      shopId: "shop-1",
      branchId: "branch-1",
    });
  });

  it("honours a shop_admin's branch filter", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    listPurchaseRequests.mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/purchase-requests?branchId=branch-9"));

    expect(listPurchaseRequests).toHaveBeenCalledWith({
      shopId: "shop-1",
      branchId: "branch-9",
    });
  });
});

describe("POST /api/purchase-requests", () => {
  const body = {
    serviceId: "service-1",
    items: [{ name: "Display", quantity: 1 }],
  };

  it("returns 400 for a malformed body", async () => {
    requireUser.mockResolvedValue(technician);

    const response = await POST(
      new NextRequest("http://localhost/api/purchase-requests", { method: "POST", body: "not json" })
    );

    expect(response.status).toBe(400);
    expect(createPurchaseRequest).not.toHaveBeenCalled();
  });

  it("404s when the service does not exist", async () => {
    requireUser.mockResolvedValue(technician);
    getService.mockResolvedValue(null);

    const response = await POST(postRequest(body));

    expect(response.status).toBe(404);
    expect(createPurchaseRequest).not.toHaveBeenCalled();
  });

  it("403s when the service belongs to another shop", async () => {
    requireUser.mockResolvedValue(technician);
    getService.mockResolvedValue({
      id: "service-1",
      shopId: "shop-9",
      branchId: "branch-1",
      customer: { name: "Naseem" },
    });

    const response = await POST(postRequest(body));

    expect(response.status).toBe(403);
    expect(createPurchaseRequest).not.toHaveBeenCalled();
  });

  it("403s a technician requesting for a service in another branch", async () => {
    requireUser.mockResolvedValue(technician);
    getService.mockResolvedValue({
      id: "service-1",
      shopId: "shop-1",
      branchId: "branch-2",
      customer: { name: "Naseem" },
    });

    const response = await POST(postRequest(body));

    expect(response.status).toBe(403);
    expect(createPurchaseRequest).not.toHaveBeenCalled();
  });

  it("denormalizes the service's branch and customer name onto the request", async () => {
    requireUser.mockResolvedValue(technician);
    getService.mockResolvedValue({
      id: "service-1",
      shopId: "shop-1",
      branchId: "branch-1",
      customer: { name: "Naseem" },
    });
    createPurchaseRequest.mockResolvedValue({ id: "pr-1" });

    await POST(postRequest(body));

    expect(createPurchaseRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        branchId: "branch-1",
        serviceId: "service-1",
        customerName: "Naseem",
        requestedBy: { userId: "tech-1", name: "Anshid" },
      })
    );
  });

  it("returns 201 on success", async () => {
    requireUser.mockResolvedValue(shopAdmin);
    getService.mockResolvedValue({
      id: "service-1",
      shopId: "shop-1",
      branchId: "branch-1",
      customer: { name: "Naseem" },
    });
    createPurchaseRequest.mockResolvedValue({ id: "pr-1", ref: "PR-2026-0001" });

    const response = await POST(postRequest(body));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      purchaseRequest: { id: "pr-1", ref: "PR-2026-0001" },
    });
  });
});
