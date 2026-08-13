import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getPurchaseRequest = vi.fn();
const approvePurchaseRequest = vi.fn();
const rejectPurchaseRequest = vi.fn();
const cancelPurchaseRequest = vi.fn();

vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiAuth")>("@/lib/apiAuth");
  return { ...actual, requireUser };
});

vi.mock("@/lib/purchaseRequestRepo", () => ({
  getPurchaseRequest,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  cancelPurchaseRequest,
}));

const { GET, PATCH } = await import("@/app/api/purchase-requests/[id]/route");

const technician = {
  id: "tech-1",
  role: "technician",
  shopId: "shop-1",
  branchId: "branch-1",
  email: "t@b.com",
  name: "Anshid",
};

const branchAdmin = {
  id: "admin-1",
  role: "branch_admin",
  shopId: "shop-1",
  branchId: "branch-1",
  email: "a@b.com",
  name: "Branch Admin",
};

const existingRequest = {
  id: "pr-1",
  shopId: "shop-1",
  branchId: "branch-1",
  status: "pending",
  requestedBy: { userId: "tech-1", name: "Anshid" },
};

function ctx(id = "pr-1") {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/purchase-requests/pr-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getPurchaseRequest.mockResolvedValue(existingRequest);
});

describe("GET /api/purchase-requests/[id]", () => {
  it("returns the request when in scope", async () => {
    requireUser.mockResolvedValue(technician);

    const response = await GET(new NextRequest("http://localhost/x"), ctx());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ purchaseRequest: existingRequest });
  });

  it("403s a technician in another branch", async () => {
    requireUser.mockResolvedValue({ ...technician, branchId: "branch-2" });

    const response = await GET(new NextRequest("http://localhost/x"), ctx());

    expect(response.status).toBe(403);
  });
});

describe("PATCH /api/purchase-requests/[id] — approve", () => {
  it("allows a branch_admin to approve", async () => {
    requireUser.mockResolvedValue(branchAdmin);
    approvePurchaseRequest.mockResolvedValue({ ...existingRequest, status: "approved" });

    const response = await PATCH(patchRequest({ action: "approve" }), ctx());

    expect(response.status).toBe(200);
    expect(approvePurchaseRequest).toHaveBeenCalledWith("shop-1", "pr-1", {
      userId: "admin-1",
      name: "Branch Admin",
    });
  });

  it("403s a technician trying to approve", async () => {
    requireUser.mockResolvedValue(technician);

    const response = await PATCH(patchRequest({ action: "approve" }), ctx());

    expect(response.status).toBe(403);
    expect(approvePurchaseRequest).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/purchase-requests/[id] — reject", () => {
  it("allows a branch_admin to reject with a reason", async () => {
    requireUser.mockResolvedValue(branchAdmin);
    rejectPurchaseRequest.mockResolvedValue({ ...existingRequest, status: "rejected" });

    const response = await PATCH(patchRequest({ action: "reject", reason: "no stock" }), ctx());

    expect(response.status).toBe(200);
    expect(rejectPurchaseRequest).toHaveBeenCalledWith("shop-1", "pr-1", "no stock", {
      userId: "admin-1",
      name: "Branch Admin",
    });
  });

  it("400s a reject with no reason", async () => {
    requireUser.mockResolvedValue(branchAdmin);

    const response = await PATCH(patchRequest({ action: "reject" }), ctx());

    expect(response.status).toBe(400);
    expect(rejectPurchaseRequest).not.toHaveBeenCalled();
  });

  it("403s a technician trying to reject", async () => {
    requireUser.mockResolvedValue(technician);

    const response = await PATCH(patchRequest({ action: "reject", reason: "no stock" }), ctx());

    expect(response.status).toBe(403);
    expect(rejectPurchaseRequest).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/purchase-requests/[id] — cancel", () => {
  it("allows the technician requester to cancel", async () => {
    requireUser.mockResolvedValue(technician);
    cancelPurchaseRequest.mockResolvedValue({ ...existingRequest, status: "cancelled" });

    const response = await PATCH(patchRequest({ action: "cancel" }), ctx());

    expect(response.status).toBe(200);
    expect(cancelPurchaseRequest).toHaveBeenCalledWith("shop-1", "pr-1", "tech-1");
  });
});
