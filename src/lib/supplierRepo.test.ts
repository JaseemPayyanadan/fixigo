// src/lib/supplierRepo.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseAdmin", async () => {
  const { createFakeFirestore } = await import("@/lib/testing/fakeFirestore");
  return createFakeFirestore();
});

import * as firebaseAdmin from "@/lib/firebaseAdmin";
import {
  createSupplier,
  getSupplier,
  listSuppliers,
  mapSupplier,
  updateSupplier,
} from "@/lib/supplierRepo";

type TestHooks = {
  __reset: () => void;
  __seed: (collection: string, id: string, data: Record<string, unknown>) => void;
  __doc: (collection: string, id: string) => Record<string, unknown> | undefined;
};
const hooks = firebaseAdmin as unknown as TestHooks;

const baseInput = {
  name: "ABC Mobiles",
  contactPerson: "Rahul",
  phone: "9876543210",
  status: "active" as const,
  shopId: "shop-1",
  createdBy: "user-1",
};

beforeEach(() => hooks.__reset());

describe("createSupplier", () => {
  it("stores the supplier with zeroed running totals", async () => {
    const supplier = await createSupplier(baseInput);

    expect(supplier.name).toBe("ABC Mobiles");
    expect(supplier.shopId).toBe("shop-1");
    expect(supplier.totalPurchased).toBe(0);
    expect(supplier.totalPaid).toBe(0);
    expect(supplier.outstanding).toBe(0);
    expect(supplier.status).toBe("active");
  });

  it("persists the document under the suppliers collection", async () => {
    const supplier = await createSupplier(baseInput);
    expect(hooks.__doc("suppliers", supplier.id)).toBeDefined();
  });
});

describe("listSuppliers", () => {
  it("returns only this shop's suppliers", async () => {
    await createSupplier(baseInput);
    await createSupplier({ ...baseInput, name: "Other Shop Vendor", shopId: "shop-2" });

    const suppliers = await listSuppliers("shop-1");
    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toBe("ABC Mobiles");
  });

  it("sorts by name", async () => {
    await createSupplier({ ...baseInput, name: "Zenith Spares" });
    await createSupplier({ ...baseInput, name: "ABC Mobiles" });

    const suppliers = await listSuppliers("shop-1");
    expect(suppliers.map((s) => s.name)).toEqual(["ABC Mobiles", "Zenith Spares"]);
  });

  it("returns an empty array when the shop has no suppliers", async () => {
    expect(await listSuppliers("shop-1")).toEqual([]);
  });
});

describe("getSupplier", () => {
  it("returns the supplier", async () => {
    const created = await createSupplier(baseInput);
    expect((await getSupplier("shop-1", created.id)).name).toBe("ABC Mobiles");
  });

  it("404s for a missing supplier", async () => {
    await expect(getSupplier("shop-1", "ghost")).rejects.toMatchObject({ status: 404 });
  });

  it("403s for a supplier belonging to another shop", async () => {
    const created = await createSupplier(baseInput);
    await expect(getSupplier("shop-2", created.id)).rejects.toMatchObject({ status: 403 });
  });

  it("fails closed on a supplier document with no shopId", async () => {
    hooks.__seed("suppliers", "legacy", { name: "Legacy Vendor" });
    await expect(getSupplier("shop-1", "legacy")).rejects.toMatchObject({ status: 403 });
  });
});

describe("updateSupplier", () => {
  it("changes editable fields", async () => {
    const created = await createSupplier(baseInput);
    const updated = await updateSupplier("shop-1", created.id, { phone: "9000011122" });
    expect(updated.phone).toBe("9000011122");
  });

  it("cannot overwrite the running totals even if they are passed in", async () => {
    const created = await createSupplier(baseInput);
    await updateSupplier("shop-1", created.id, {
      outstanding: 999999,
      totalPurchased: 999999,
    } as never);

    const after = await getSupplier("shop-1", created.id);
    expect(after.outstanding).toBe(0);
    expect(after.totalPurchased).toBe(0);
  });

  it("403s across shops and leaves the document untouched", async () => {
    const created = await createSupplier(baseInput);
    const before = { ...hooks.__doc("suppliers", created.id) };

    await expect(
      updateSupplier("shop-2", created.id, { phone: "9000011122" })
    ).rejects.toMatchObject({ status: 403 });

    // The rejection alone is not enough: this pins that the tenancy check runs
    // BEFORE any write, so a future reordering cannot mutate another shop's data.
    expect(hooks.__doc("suppliers", created.id)).toEqual(before);
  });
});

describe("mapSupplier", () => {
  it("defaults absent running totals to 0 rather than undefined", () => {
    const supplier = mapSupplier("s1", { name: "ABC", shopId: "shop-1" });
    expect(supplier.totalPurchased).toBe(0);
    expect(supplier.outstanding).toBe(0);
    expect(supplier.status).toBe("active");
  });

  it("converts Firestore timestamps to Dates", () => {
    const stamp = { toDate: () => new Date(2026, 7, 5) };
    const supplier = mapSupplier("s1", { shopId: "shop-1", createdAt: stamp, lastPurchaseAt: stamp });
    expect(supplier.createdAt).toBeInstanceOf(Date);
    expect(supplier.lastPurchaseAt).toBeInstanceOf(Date);
  });

  it("leaves lastPurchaseAt undefined when absent", () => {
    expect(mapSupplier("s1", { shopId: "shop-1" }).lastPurchaseAt).toBeUndefined();
  });
});
