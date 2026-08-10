// src/lib/supplierRepo.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseAdmin", async () => {
  const { createFakeFirestore } = await import("@/lib/testing/fakeFirestore");
  return createFakeFirestore();
});

import * as firebaseAdmin from "@/lib/firebaseAdmin";
import { createPurchase, getPurchase } from "@/lib/purchaseRepo";
import {
  createSupplier,
  deleteSupplierPayment,
  getSupplier,
  listSuppliers,
  mapSupplier,
  recordSupplierPayment,
  updateSupplier,
  updateSupplierPayment,
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
  branchId: "branch-1",
  createdBy: "user-1",
};

function purchaseInput(supplierId: string, overrides: Record<string, unknown> = {}) {
  return {
    supplierId,
    purchaseDate: new Date(2026, 7, 5),
    items: [{ name: "Display", quantity: 1, purchasePrice: 1000 }],
    discount: { mode: "amount" as const, value: 0 },
    gstRate: 0,
    transportCharge: 0,
    shopId: "shop-1",
    branchId: "branch-1",
    purchasedBy: { userId: "user-1", name: "Naseem" },
    ...overrides,
  };
}

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

  it("seeds outstanding from an opening balance, leaving the other totals at zero", async () => {
    const supplier = await createSupplier({ ...baseInput, openingBalance: 1500 });

    expect(supplier.outstanding).toBe(1500);
    expect(supplier.totalPurchased).toBe(0);
    expect(supplier.totalPaid).toBe(0);
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

  it("filters to one branch when given a branchId", async () => {
    await createSupplier(baseInput);
    await createSupplier({ ...baseInput, name: "Branch 2 Vendor", branchId: "branch-2" });

    const suppliers = await listSuppliers("shop-1", "branch-2");
    expect(suppliers.map((s) => s.name)).toEqual(["Branch 2 Vendor"]);
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

describe("supplier-level payments allocate across the supplier's own bills", () => {
  it("recordSupplierPayment pays down the one outstanding bill, not just the aggregate", async () => {
    const supplier = await createSupplier(baseInput);
    const purchase = await createPurchase(purchaseInput(supplier.id));
    // createPurchase raises supplier.outstanding via its own transaction.
    expect((await getSupplier("shop-1", supplier.id)).outstanding).toBe(1000);

    const { supplier: after } = await recordSupplierPayment(
      "shop-1",
      supplier.id,
      { amount: 600, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );

    expect(after.outstanding).toBe(400);
    const bill = await getPurchase("shop-1", purchase.id);
    expect(bill.balance).toBe(400);
    expect(bill.paidAmount).toBe(600);
    expect(bill.paymentStatus).toBe("partial");
  });

  it("applies oldest-due-first across multiple bills", async () => {
    const supplier = await createSupplier(baseInput);
    const older = await createPurchase(
      purchaseInput(supplier.id, { dueDate: new Date(2026, 7, 10) })
    );
    const newer = await createPurchase(
      purchaseInput(supplier.id, { dueDate: new Date(2026, 7, 20) })
    );

    await recordSupplierPayment(
      "shop-1",
      supplier.id,
      { amount: 1500, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );

    expect((await getPurchase("shop-1", older.id)).balance).toBe(0);
    expect((await getPurchase("shop-1", newer.id)).balance).toBe(500);
  });

  it("rejects a payment larger than the supplier's outstanding balance", async () => {
    const supplier = await createSupplier(baseInput);
    await createPurchase(purchaseInput(supplier.id));

    await expect(
      recordSupplierPayment(
        "shop-1",
        supplier.id,
        { amount: 5000, method: "cash", paidAt: new Date(2026, 7, 6) },
        "user-1"
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("a bill can no longer be double-paid after its supplier is paid in full", async () => {
    const supplier = await createSupplier(baseInput);
    const purchase = await createPurchase(purchaseInput(supplier.id));

    await recordSupplierPayment(
      "shop-1",
      supplier.id,
      { amount: 1000, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );

    // Before allocation existed, this bill's balance was untouched by the
    // supplier-level payment, so paying it directly afterward drove the
    // supplier's outstanding negative. It should now correctly read 0 owed.
    expect((await getPurchase("shop-1", purchase.id)).balance).toBe(0);
    expect((await getSupplier("shop-1", supplier.id)).outstanding).toBe(0);
  });

  it("updateSupplierPayment re-allocates when the amount changes", async () => {
    const supplier = await createSupplier(baseInput);
    const purchase = await createPurchase(purchaseInput(supplier.id));
    const { payment } = await recordSupplierPayment(
      "shop-1",
      supplier.id,
      { amount: 400, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    expect((await getPurchase("shop-1", purchase.id)).balance).toBe(600);

    await updateSupplierPayment("shop-1", supplier.id, payment.id, {
      amount: 900,
      method: "upi",
      paidAt: new Date(2026, 7, 7),
    });

    expect((await getPurchase("shop-1", purchase.id)).balance).toBe(100);
    expect((await getSupplier("shop-1", supplier.id)).outstanding).toBe(100);
  });

  it("updateSupplierPayment rejects raising the amount past the outstanding balance", async () => {
    const supplier = await createSupplier(baseInput);
    await createPurchase(purchaseInput(supplier.id));
    const { payment } = await recordSupplierPayment(
      "shop-1",
      supplier.id,
      { amount: 400, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );

    await expect(
      updateSupplierPayment("shop-1", supplier.id, payment.id, {
        amount: 5000,
        method: "cash",
        paidAt: new Date(2026, 7, 7),
      })
    ).rejects.toMatchObject({ status: 400 });

    // Rejected before the reversal step runs, so the outstanding is untouched.
    expect((await getSupplier("shop-1", supplier.id)).outstanding).toBe(600);
  });

  it("deleteSupplierPayment restores the bill's balance and the supplier's outstanding", async () => {
    const supplier = await createSupplier(baseInput);
    const purchase = await createPurchase(purchaseInput(supplier.id));
    const { payment } = await recordSupplierPayment(
      "shop-1",
      supplier.id,
      { amount: 700, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );

    const after = await deleteSupplierPayment("shop-1", supplier.id, payment.id);

    expect(after.outstanding).toBe(1000);
    expect((await getPurchase("shop-1", purchase.id)).balance).toBe(1000);
  });
});
