// src/lib/purchaseRepo.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseAdmin", async () => {
  const { createFakeFirestore } = await import("@/lib/testing/fakeFirestore");
  return createFakeFirestore();
});

import * as firebaseAdmin from "@/lib/firebaseAdmin";
import {
  cancelPurchase,
  createPurchase,
  getPurchase,
  listItemSuggestions,
  listPurchases,
  recordPurchasePayment,
  updatePurchase,
} from "@/lib/purchaseRepo";

type TestHooks = {
  __reset: () => void;
  __seed: (collection: string, id: string, data: Record<string, unknown>) => void;
  __doc: (collection: string, id: string) => Record<string, unknown> | undefined;
  __writes: () => Array<{ op: string; collection: string; id: string }>;
  __transactionCount: () => number;
};
const hooks = firebaseAdmin as unknown as TestHooks;

function seedSupplier(id = "sup-1", shopId = "shop-1") {
  hooks.__seed("suppliers", id, {
    shopId,
    name: "ABC Mobiles",
    contactPerson: "Rahul",
    phone: "9876543210",
    status: "active",
    totalPurchased: 0,
    totalPaid: 0,
    outstanding: 0,
  });
}

function purchaseInput(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: "sup-1",
    purchaseDate: new Date(2026, 7, 5),
    items: [
      { name: "Display", brand: "Samsung", model: "A34", quantity: 3, purchasePrice: 1800 },
      { name: "Battery", brand: "Vivo", model: "V29", quantity: 5, purchasePrice: 550 },
    ],
    discount: { mode: "amount" as const, value: 0 },
    gstRate: 0,
    transportCharge: 0,
    dueDate: new Date(2026, 8, 5),
    shopId: "shop-1",
    branchId: "branch-1",
    purchasedBy: { userId: "user-1", name: "Naseem" },
    ...overrides,
  };
}

beforeEach(() => {
  hooks.__reset();
  seedSupplier();
});

describe("createPurchase", () => {
  it("computes totals server-side from the line items", async () => {
    const purchase = await createPurchase(purchaseInput());
    expect(purchase.subtotal).toBe(8150);
    expect(purchase.grandTotal).toBe(8150);
    expect(purchase.items[0].lineTotal).toBe(5400);
  });

  it("assigns a sequential per-shop reference", async () => {
    const first = await createPurchase(purchaseInput());
    const second = await createPurchase(purchaseInput());
    expect(first.ref).toBe("PUR-2026-0001");
    expect(second.ref).toBe("PUR-2026-0002");
  });

  it("keeps each shop's sequence independent", async () => {
    seedSupplier("sup-2", "shop-2");
    const shopOne = await createPurchase(purchaseInput());
    const shopTwo = await createPurchase(
      purchaseInput({ supplierId: "sup-2", shopId: "shop-2" })
    );
    expect(shopOne.ref).toBe("PUR-2026-0001");
    expect(shopTwo.ref).toBe("PUR-2026-0001");
  });

  it("opens as unpaid with no initial payment", async () => {
    const purchase = await createPurchase(purchaseInput());
    expect(purchase.paymentStatus).toBe("unpaid");
    expect(purchase.paidAmount).toBe(0);
    expect(purchase.balance).toBe(8150);
    expect(purchase.payments).toEqual([]);
  });

  it("records an initial payment as partial", async () => {
    const purchase = await createPurchase(
      purchaseInput({
        initialPayment: { amount: 5000, method: "upi", paidAt: new Date(2026, 7, 5) },
      })
    );
    expect(purchase.paymentStatus).toBe("partial");
    expect(purchase.paidAmount).toBe(5000);
    expect(purchase.balance).toBe(3150);
    expect(purchase.payments).toHaveLength(1);
    expect(purchase.payments[0].method).toBe("upi");
  });

  it("updates the supplier's running totals", async () => {
    await createPurchase(
      purchaseInput({
        initialPayment: { amount: 5000, method: "cash", paidAt: new Date(2026, 7, 5) },
      })
    );
    const supplier = hooks.__doc("suppliers", "sup-1");
    expect(supplier?.totalPurchased).toBe(8150);
    expect(supplier?.totalPaid).toBe(5000);
    expect(supplier?.outstanding).toBe(3150);
    expect(supplier?.lastPurchaseAt).toBeInstanceOf(Date);
  });

  it("denormalizes the supplier name onto the purchase", async () => {
    expect((await createPurchase(purchaseInput())).supplierName).toBe("ABC Mobiles");
  });

  it("writes the purchase, the counter and the supplier in ONE transaction", async () => {
    await createPurchase(purchaseInput());
    expect(hooks.__transactionCount()).toBe(1);
    const collections = hooks.__writes().map((w) => w.collection).sort();
    expect(collections).toEqual(["purchaseCounters", "purchases", "suppliers"]);
  });

  it("403s and writes nothing for a supplier in another shop", async () => {
    seedSupplier("sup-2", "shop-2");
    await expect(
      createPurchase(purchaseInput({ supplierId: "sup-2" }))
    ).rejects.toMatchObject({ status: 403 });

    expect(hooks.__doc("suppliers", "sup-2")?.totalPurchased).toBe(0);
    expect(hooks.__writes()).toHaveLength(0);
  });

  it("404s for a supplier that does not exist", async () => {
    await expect(createPurchase(purchaseInput({ supplierId: "ghost" }))).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("recordPurchasePayment", () => {
  it("moves unpaid to partial", async () => {
    const created = await createPurchase(purchaseInput());
    const updated = await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 3000, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    expect(updated.paymentStatus).toBe("partial");
    expect(updated.balance).toBe(5150);
  });

  it("moves to paid when the exact balance is settled", async () => {
    const created = await createPurchase(purchaseInput());
    const updated = await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 8150, method: "bank", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    expect(updated.paymentStatus).toBe("paid");
    expect(updated.balance).toBe(0);
  });

  it("drives the supplier's outstanding to zero when fully paid", async () => {
    const created = await createPurchase(purchaseInput());
    await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 8150, method: "bank", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    const supplier = hooks.__doc("suppliers", "sup-1");
    expect(supplier?.outstanding).toBe(0);
    expect(supplier?.totalPaid).toBe(8150);
  });

  it("rejects a payment larger than the remaining balance", async () => {
    const created = await createPurchase(purchaseInput());
    await expect(
      recordPurchasePayment(
        "shop-1",
        created.id,
        { amount: 9000, method: "cash", paidAt: new Date(2026, 7, 6) },
        "user-1"
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("cannot be overdrawn by successive payments", async () => {
    const created = await createPurchase(purchaseInput());
    await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 8000, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    // The balance is re-read inside the transaction, so this sees 150, not 8150.
    await expect(
      recordPurchasePayment(
        "shop-1",
        created.id,
        { amount: 8000, method: "cash", paidAt: new Date(2026, 7, 7) },
        "user-1"
      )
    ).rejects.toMatchObject({ status: 400 });

    expect(hooks.__doc("suppliers", "sup-1")?.outstanding).toBe(150);
  });

  it("rejects a payment against a cancelled purchase", async () => {
    const created = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", created.id, "wrong supplier");
    await expect(
      recordPurchasePayment(
        "shop-1",
        created.id,
        { amount: 100, method: "cash", paidAt: new Date(2026, 7, 6) },
        "user-1"
      )
    ).rejects.toMatchObject({ status: 409 });
  });

  it("403s across shops and leaves the balance untouched", async () => {
    const created = await createPurchase(purchaseInput());
    await expect(
      recordPurchasePayment(
        "shop-2",
        created.id,
        { amount: 100, method: "cash", paidAt: new Date(2026, 7, 6) },
        "user-1"
      )
    ).rejects.toMatchObject({ status: 403 });
    expect((await getPurchase("shop-1", created.id)).balance).toBe(8150);
  });

  it("writes the purchase and supplier in ONE transaction", async () => {
    const created = await createPurchase(purchaseInput());
    await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 100, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    expect(hooks.__transactionCount()).toBe(2); // create + payment
    const collections = hooks.__writes().map((w) => w.collection).sort();
    expect(collections).toEqual(["purchases", "suppliers"]);
  });
});

describe("updatePurchase", () => {
  it("recomputes totals and applies the delta to the supplier", async () => {
    const created = await createPurchase(purchaseInput());
    const updated = await updatePurchase("shop-1", created.id, {
      ...purchaseInput(),
      items: [{ name: "Display", quantity: 1, purchasePrice: 1800 }],
    });

    expect(updated.grandTotal).toBe(1800);
    const supplier = hooks.__doc("suppliers", "sup-1");
    expect(supplier?.totalPurchased).toBe(1800);
    expect(supplier?.outstanding).toBe(1800);
  });

  it("409s once a payment exists", async () => {
    const created = await createPurchase(purchaseInput());
    await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 100, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    await expect(
      updatePurchase("shop-1", created.id, purchaseInput())
    ).rejects.toMatchObject({ status: 409 });
  });

  it("409s on a cancelled purchase", async () => {
    const created = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", created.id, "duplicate entry");
    await expect(
      updatePurchase("shop-1", created.id, purchaseInput())
    ).rejects.toMatchObject({ status: 409 });
  });

  it("keeps the original ref", async () => {
    const created = await createPurchase(purchaseInput());
    const updated = await updatePurchase("shop-1", created.id, purchaseInput());
    expect(updated.ref).toBe(created.ref);
  });
});

describe("cancelPurchase", () => {
  it("marks the purchase cancelled with a reason", async () => {
    const created = await createPurchase(purchaseInput());
    const cancelled = await cancelPurchase("shop-1", created.id, "wrong supplier");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelReason).toBe("wrong supplier");
    expect(cancelled.cancelledAt).toBeInstanceOf(Date);
  });

  it("reverses the supplier totals exactly", async () => {
    const before = hooks.__doc("suppliers", "sup-1");
    const created = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", created.id, "wrong supplier");
    const after = hooks.__doc("suppliers", "sup-1");
    expect(after?.totalPurchased).toBe(before?.totalPurchased);
    expect(after?.outstanding).toBe(before?.outstanding);
  });

  it("409s once a payment exists", async () => {
    const created = await createPurchase(purchaseInput());
    await recordPurchasePayment(
      "shop-1",
      created.id,
      { amount: 100, method: "cash", paidAt: new Date(2026, 7, 6) },
      "user-1"
    );
    await expect(cancelPurchase("shop-1", created.id, "changed my mind")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("never deletes the document", async () => {
    const created = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", created.id, "wrong supplier");
    expect(hooks.__doc("purchases", created.id)).toBeDefined();
    expect(hooks.__writes().some((w) => w.op === "delete")).toBe(false);
  });
});

describe("listPurchases", () => {
  it("excludes cancelled purchases by default", async () => {
    const keep = await createPurchase(purchaseInput());
    const drop = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", drop.id, "duplicate");

    const purchases = await listPurchases({ shopId: "shop-1" });
    expect(purchases.map((p) => p.id)).toEqual([keep.id]);
  });

  it("includes cancelled purchases when asked", async () => {
    const drop = await createPurchase(purchaseInput());
    await cancelPurchase("shop-1", drop.id, "duplicate");
    const purchases = await listPurchases({ shopId: "shop-1", includeCancelled: true });
    expect(purchases).toHaveLength(1);
  });

  it("filters by branch", async () => {
    await createPurchase(purchaseInput());
    await createPurchase(purchaseInput({ branchId: "branch-2" }));
    const purchases = await listPurchases({ shopId: "shop-1", branchId: "branch-2" });
    expect(purchases).toHaveLength(1);
    expect(purchases[0].branchId).toBe("branch-2");
  });

  it("never returns another shop's purchases", async () => {
    seedSupplier("sup-2", "shop-2");
    await createPurchase(purchaseInput());
    await createPurchase(purchaseInput({ supplierId: "sup-2", shopId: "shop-2" }));
    const purchases = await listPurchases({ shopId: "shop-2" });
    expect(purchases).toHaveLength(1);
    expect(purchases[0].shopId).toBe("shop-2");
  });

  it("returns newest first", async () => {
    const older = await createPurchase(purchaseInput({ purchaseDate: new Date(2026, 7, 1) }));
    const newer = await createPurchase(purchaseInput({ purchaseDate: new Date(2026, 7, 9) }));
    const purchases = await listPurchases({ shopId: "shop-1" });
    expect(purchases.map((p) => p.id)).toEqual([newer.id, older.id]);
  });
});

describe("listItemSuggestions", () => {
  it("returns distinct names, brands and models for the shop", async () => {
    await createPurchase(purchaseInput());
    await createPurchase(purchaseInput());
    const suggestions = await listItemSuggestions("shop-1");
    expect(suggestions.names.sort()).toEqual(["Battery", "Display"]);
    expect(suggestions.brands.sort()).toEqual(["Samsung", "Vivo"]);
    expect(suggestions.models.sort()).toEqual(["A34", "V29"]);
  });

  it("does not leak another shop's item names", async () => {
    seedSupplier("sup-2", "shop-2");
    await createPurchase(
      purchaseInput({
        supplierId: "sup-2",
        shopId: "shop-2",
        items: [{ name: "Secret Part", quantity: 1, purchasePrice: 1 }],
      })
    );
    expect((await listItemSuggestions("shop-1")).names).not.toContain("Secret Part");
  });
});
