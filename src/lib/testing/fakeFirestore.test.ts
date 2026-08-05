import { beforeEach, describe, expect, it } from "vitest";

import { createFakeFirestore } from "@/lib/testing/fakeFirestore";

const fake = createFakeFirestore();
const { adminDb } = fake;

beforeEach(() => fake.__reset());

describe("document access", () => {
  it("reads a seeded document", async () => {
    fake.__seed("suppliers", "s1", { name: "ABC Mobiles", shopId: "shop-1" });
    const snap = await adminDb.collection("suppliers").doc("s1").get();
    expect(snap.exists).toBe(true);
    expect(snap.data()).toEqual({ name: "ABC Mobiles", shopId: "shop-1" });
  });

  it("reports a missing document as not existing", async () => {
    const snap = await adminDb.collection("suppliers").doc("nope").get();
    expect(snap.exists).toBe(false);
    expect(snap.data()).toBeUndefined();
  });

  it("mints an id when doc() is called without one", () => {
    const a = adminDb.collection("purchases").doc();
    const b = adminDb.collection("purchases").doc();
    expect(a.id).not.toBe(b.id);
  });
});

describe("queries", () => {
  beforeEach(() => {
    fake.__seed("purchases", "p1", { shopId: "s", branchId: "b1", total: 100, date: 3 });
    fake.__seed("purchases", "p2", { shopId: "s", branchId: "b1", total: 200, date: 1 });
    fake.__seed("purchases", "p3", { shopId: "s", branchId: "b2", total: 300, date: 2 });
    fake.__seed("purchases", "p4", { shopId: "other", branchId: "b1", total: 400, date: 4 });
  });

  it("filters on a single where", async () => {
    const result = await adminDb.collection("purchases").where("shopId", "==", "s").get();
    expect(result.docs.map((d) => d.id).sort()).toEqual(["p1", "p2", "p3"]);
  });

  it("chains two wheres", async () => {
    const result = await adminDb
      .collection("purchases")
      .where("shopId", "==", "s")
      .where("branchId", "==", "b1")
      .get();
    expect(result.docs.map((d) => d.id).sort()).toEqual(["p1", "p2"]);
  });

  it("orders descending", async () => {
    const result = await adminDb
      .collection("purchases")
      .where("shopId", "==", "s")
      .orderBy("date", "desc")
      .get();
    expect(result.docs.map((d) => d.id)).toEqual(["p1", "p3", "p2"]);
  });

  it("orders ascending by default", async () => {
    const result = await adminDb.collection("purchases").where("shopId", "==", "s").orderBy("date").get();
    expect(result.docs.map((d) => d.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("limits after ordering", async () => {
    const result = await adminDb
      .collection("purchases")
      .where("shopId", "==", "s")
      .orderBy("date", "desc")
      .limit(2)
      .get();
    expect(result.docs.map((d) => d.id)).toEqual(["p1", "p3"]);
  });

  it("reports an empty result", async () => {
    const result = await adminDb.collection("purchases").where("shopId", "==", "missing").get();
    expect(result.empty).toBe(true);
    expect(result.docs).toHaveLength(0);
  });
});

describe("transactions", () => {
  it("records every write and counts one transaction", async () => {
    fake.__seed("suppliers", "s1", { outstanding: 0 });

    await adminDb.runTransaction(async (tx) => {
      const ref = adminDb.collection("purchases").doc("p1");
      tx.set(ref, { grandTotal: 500 });
      tx.update(adminDb.collection("suppliers").doc("s1"), { outstanding: 500 });
    });

    expect(fake.__transactionCount()).toBe(1);
    expect(fake.__writes()).toHaveLength(2);
    expect(fake.__doc("suppliers", "s1")).toEqual({ outstanding: 500 });
  });

  it("throws when updating a document that does not exist", async () => {
    await expect(
      adminDb.runTransaction(async (tx) => {
        tx.update(adminDb.collection("suppliers").doc("ghost"), { outstanding: 1 });
      })
    ).rejects.toThrow(/NOT_FOUND/);
  });

  it("rolls back every write when the callback throws", async () => {
    fake.__seed("suppliers", "s1", { outstanding: 0 });

    await expect(
      adminDb.runTransaction(async (tx) => {
        tx.update(adminDb.collection("suppliers").doc("s1"), { outstanding: 999 });
        throw new Error("business rule rejected");
      })
    ).rejects.toThrow("business rule rejected");

    expect(fake.__doc("suppliers", "s1")).toEqual({ outstanding: 0 });
  });
});

describe("FieldValue array operations", () => {
  it("appends with arrayUnion", async () => {
    fake.__seed("branches", "b1", { members: ["u1"] });
    await adminDb.runTransaction(async (tx) => {
      tx.update(adminDb.collection("branches").doc("b1"), {
        members: fake.FieldValue.arrayUnion("u2"),
      });
    });
    expect(fake.__doc("branches", "b1")).toEqual({ members: ["u1", "u2"] });
  });

  it("does not duplicate an existing arrayUnion value", async () => {
    fake.__seed("branches", "b1", { members: ["u1"] });
    await adminDb.runTransaction(async (tx) => {
      tx.update(adminDb.collection("branches").doc("b1"), {
        members: fake.FieldValue.arrayUnion("u1"),
      });
    });
    expect(fake.__doc("branches", "b1")).toEqual({ members: ["u1"] });
  });

  it("removes with arrayRemove", async () => {
    fake.__seed("branches", "b1", { members: ["u1", "u2"] });
    await adminDb.runTransaction(async (tx) => {
      tx.update(adminDb.collection("branches").doc("b1"), {
        members: fake.FieldValue.arrayRemove("u1"),
      });
    });
    expect(fake.__doc("branches", "b1")).toEqual({ members: ["u2"] });
  });
});
