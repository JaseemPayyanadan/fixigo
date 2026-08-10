import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseAdmin", async () => {
  const { createFakeFirestore } = await import("@/lib/testing/fakeFirestore");
  return createFakeFirestore();
});

import * as firebaseAdmin from "@/lib/firebaseAdmin";
import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  createPurchaseRequest,
  getPurchaseRequest,
  listPurchaseRequests,
  rejectPurchaseRequest,
} from "@/lib/purchaseRequestRepo";

type TestHooks = {
  __reset: () => void;
  __seed: (collection: string, id: string, data: Record<string, unknown>) => void;
  __doc: (collection: string, id: string) => Record<string, unknown> | undefined;
  __writes: () => Array<{ op: string; collection: string; id: string }>;
  __transactionCount: () => number;
};
const hooks = firebaseAdmin as unknown as TestHooks;

function requestInput(overrides: Record<string, unknown> = {}) {
  return {
    shopId: "shop-1",
    branchId: "branch-1",
    serviceId: "service-1",
    customerName: "Naseem",
    items: [{ name: "Display", brand: "Samsung", model: "A34", quantity: 2 }],
    requestedBy: { userId: "tech-1", name: "Anshid" },
    ...overrides,
  };
}

beforeEach(() => {
  hooks.__reset();
});

describe("createPurchaseRequest", () => {
  it("creates a pending request carrying the denormalized service fields", async () => {
    const request = await createPurchaseRequest(requestInput({ serviceRef: "ervice-1" }));
    expect(request.status).toBe("pending");
    expect(request.serviceId).toBe("service-1");
    expect(request.serviceRef).toBe("ervice-1");
    expect(request.customerName).toBe("Naseem");
    expect(request.items).toHaveLength(1);
    expect(request.items[0].name).toBe("Display");
    expect(request.items[0].id).toBeTruthy();
  });

  it("assigns a sequential per-shop reference with the PR prefix", async () => {
    const first = await createPurchaseRequest(requestInput());
    const second = await createPurchaseRequest(requestInput());
    expect(first.ref).toMatch(/^PR-\d{4}-0001$/);
    expect(second.ref.endsWith("-0002")).toBe(true);
  });

  it("records requestedBy and requestedAt", async () => {
    const request = await createPurchaseRequest(requestInput());
    expect(request.requestedBy).toEqual({ userId: "tech-1", name: "Anshid" });
    expect(request.requestedAt).toBeInstanceOf(Date);
  });

  it("writes the request and the counter in ONE transaction", async () => {
    await createPurchaseRequest(requestInput());
    expect(hooks.__transactionCount()).toBe(1);
    const collections = hooks.__writes().map((w) => w.collection).sort();
    expect(collections).toEqual(["purchaseRequestCounters", "purchaseRequests"]);
  });

  it("never deletes anything on create", async () => {
    await createPurchaseRequest(requestInput());
    expect(hooks.__writes().some((w) => w.op === "delete")).toBe(false);
  });
});

describe("getPurchaseRequest", () => {
  it("404s for a missing request", async () => {
    await expect(getPurchaseRequest("shop-1", "ghost")).rejects.toMatchObject({ status: 404 });
  });

  it("403s for a request in another shop", async () => {
    const created = await createPurchaseRequest(requestInput());
    await expect(getPurchaseRequest("shop-2", created.id)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("returns the request for the owning shop", async () => {
    const created = await createPurchaseRequest(requestInput());
    const fetched = await getPurchaseRequest("shop-1", created.id);
    expect(fetched.id).toBe(created.id);
  });
});

describe("listPurchaseRequests", () => {
  it("filters by branch", async () => {
    await createPurchaseRequest(requestInput());
    await createPurchaseRequest(requestInput({ branchId: "branch-2" }));
    const requests = await listPurchaseRequests({ shopId: "shop-1", branchId: "branch-2" });
    expect(requests).toHaveLength(1);
    expect(requests[0].branchId).toBe("branch-2");
  });

  it("never returns another shop's requests", async () => {
    await createPurchaseRequest(requestInput());
    await createPurchaseRequest(requestInput({ shopId: "shop-2" }));
    const requests = await listPurchaseRequests({ shopId: "shop-2" });
    expect(requests).toHaveLength(1);
    expect(requests[0].shopId).toBe("shop-2");
  });

  it("returns newest first", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1));
    const older = await createPurchaseRequest(requestInput());
    vi.setSystemTime(new Date(2026, 7, 9));
    const newer = await createPurchaseRequest(requestInput());
    vi.useRealTimers();

    const requests = await listPurchaseRequests({ shopId: "shop-1" });
    expect(requests.map((r) => r.id)).toEqual([newer.id, older.id]);
  });
});

describe("approvePurchaseRequest", () => {
  it("moves a pending request to approved and stamps the decider", async () => {
    const created = await createPurchaseRequest(requestInput());
    const approved = await approvePurchaseRequest("shop-1", created.id, {
      userId: "admin-1",
      name: "Shop Admin",
    });
    expect(approved.status).toBe("approved");
    expect(approved.decidedBy).toEqual({ userId: "admin-1", name: "Shop Admin" });
    expect(approved.decidedAt).toBeInstanceOf(Date);
  });

  it("409s on a request that is not pending", async () => {
    const created = await createPurchaseRequest(requestInput());
    await approvePurchaseRequest("shop-1", created.id, { userId: "admin-1", name: "Admin" });
    await expect(
      approvePurchaseRequest("shop-1", created.id, { userId: "admin-1", name: "Admin" })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("403s across shops and leaves the status untouched", async () => {
    const created = await createPurchaseRequest(requestInput());
    await expect(
      approvePurchaseRequest("shop-2", created.id, { userId: "admin-1", name: "Admin" })
    ).rejects.toMatchObject({ status: 403 });
    expect((await getPurchaseRequest("shop-1", created.id)).status).toBe("pending");
  });
});

describe("rejectPurchaseRequest", () => {
  it("moves a pending request to rejected with a reason", async () => {
    const created = await createPurchaseRequest(requestInput());
    const rejected = await rejectPurchaseRequest("shop-1", created.id, "no stock", {
      userId: "admin-1",
      name: "Admin",
    });
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectReason).toBe("no stock");
    expect(rejected.decidedBy).toEqual({ userId: "admin-1", name: "Admin" });
  });

  it("409s on a request that is not pending", async () => {
    const created = await createPurchaseRequest(requestInput());
    await rejectPurchaseRequest("shop-1", created.id, "no stock", {
      userId: "admin-1",
      name: "Admin",
    });
    await expect(
      rejectPurchaseRequest("shop-1", created.id, "again", { userId: "admin-1", name: "Admin" })
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("cancelPurchaseRequest", () => {
  it("lets the original requester cancel their own pending request", async () => {
    const created = await createPurchaseRequest(requestInput());
    const cancelled = await cancelPurchaseRequest("shop-1", created.id, "tech-1");
    expect(cancelled.status).toBe("cancelled");
  });

  it("403s a different user cancelling someone else's request", async () => {
    const created = await createPurchaseRequest(requestInput());
    await expect(cancelPurchaseRequest("shop-1", created.id, "someone-else")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("409s cancelling a request that is no longer pending", async () => {
    const created = await createPurchaseRequest(requestInput());
    await approvePurchaseRequest("shop-1", created.id, { userId: "admin-1", name: "Admin" });
    await expect(cancelPurchaseRequest("shop-1", created.id, "tech-1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("never deletes the document", async () => {
    const created = await createPurchaseRequest(requestInput());
    await cancelPurchaseRequest("shop-1", created.id, "tech-1");
    expect(hooks.__doc("purchaseRequests", created.id)).toBeDefined();
    expect(hooks.__writes().some((w) => w.op === "delete")).toBe(false);
  });
});
