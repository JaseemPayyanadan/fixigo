import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseAdmin", () => {
  const store = new Map<string, Record<string, unknown>>();
  const key = (collection: string, id: string) => `${collection}/${id}`;

  function makeDocRef(collection: string, id: string) {
    return {
      id,
      async get() {
        const data = store.get(key(collection, id));
        return { id, exists: data !== undefined, data: () => data };
      },
      async update(data: Record<string, unknown>) {
        const current = store.get(key(collection, id));
        if (!current) throw new Error(`NOT_FOUND ${collection}/${id}`);
        const next = { ...current };
        for (const [field, value] of Object.entries(data)) {
          if (value && typeof value === "object" && (value as { __op?: string }).__op === "delete") {
            delete next[field];
          } else if (value && typeof value === "object" && (value as { __op?: string }).__op === "arrayUnion") {
            const existing = Array.isArray(next[field]) ? [...(next[field] as unknown[])] : [];
            existing.push((value as { value: unknown }).value);
            next[field] = existing;
          } else {
            next[field] = value;
          }
        }
        store.set(key(collection, id), next);
      },
      async delete() {
        store.delete(key(collection, id));
      },
    };
  }

  function makeCollectionRef(collection: string) {
    return {
      doc(id: string) {
        return makeDocRef(collection, id);
      },
      where(field: string, _op: string, value: unknown) {
        const filters: Array<{ field: string; value: unknown }> = [{ field, value }];
        const chain = {
          where(nextField: string, __op: string, nextValue: unknown) {
            filters.push({ field: nextField, value: nextValue });
            return chain;
          },
          async get() {
            const prefix = `${collection}/`;
            const docs = [...store.entries()]
              .filter(([k, data]) => {
                if (!k.startsWith(prefix) || k.slice(prefix.length).includes("/")) return false;
                return filters.every((f) => data[f.field] === f.value);
              })
              .map(([k, data]) => ({ id: k.slice(prefix.length), data: () => data }));
            return { docs, empty: docs.length === 0 };
          },
        };
        return chain;
      },
    };
  }

  return {
    adminDb: {
      collection: (name: string) => makeCollectionRef(name),
      __reset() {
        store.clear();
      },
      __seed(collection: string, id: string, data: Record<string, unknown>) {
        store.set(key(collection, id), data);
      },
    },
    FieldValue: {
      delete: () => ({ __op: "delete" }),
      arrayUnion: (value: unknown) => ({ __op: "arrayUnion", value }),
    },
  };
});


const firebaseAdminMock = (await import("@/lib/firebaseAdmin")) as unknown as {
  adminDb: {
    __reset: () => void;
    __seed: (c: string, id: string, data: Record<string, unknown>) => void;
  };
};

const { listServices } = await import("@/lib/serviceRepo");

function ts(date: Date) {
  return { toDate: () => date };
}

describe("listServices", () => {
  beforeEach(() => {
    firebaseAdminMock.adminDb.__reset();
  });

  it("returns shop services newest first", async () => {
    firebaseAdminMock.adminDb.__seed("services", "s-old", {
      name: "Old",
      shopId: "shop-1",
      branchId: "b1",
      status: "pending",
      createdAt: ts(new Date("2026-01-01")),
      updatedAt: ts(new Date("2026-01-01")),
    });
    firebaseAdminMock.adminDb.__seed("services", "s-new", {
      name: "New",
      shopId: "shop-1",
      branchId: "b1",
      status: "pending",
      createdAt: ts(new Date("2026-03-01")),
      updatedAt: ts(new Date("2026-03-01")),
    });
    firebaseAdminMock.adminDb.__seed("services", "other", {
      name: "Other",
      shopId: "shop-2",
      branchId: "b9",
      status: "pending",
      createdAt: ts(new Date("2026-04-01")),
      updatedAt: ts(new Date("2026-04-01")),
    });

    const services = await listServices({ shopId: "shop-1" });
    expect(services.map((s) => s.id)).toEqual(["s-new", "s-old"]);
  });

  it("filters by branch when provided", async () => {
    firebaseAdminMock.adminDb.__seed("services", "b1-job", {
      name: "A",
      shopId: "shop-1",
      branchId: "b1",
      status: "pending",
      createdAt: ts(new Date("2026-01-01")),
      updatedAt: ts(new Date("2026-01-01")),
    });
    firebaseAdminMock.adminDb.__seed("services", "b2-job", {
      name: "B",
      shopId: "shop-1",
      branchId: "b2",
      status: "pending",
      createdAt: ts(new Date("2026-02-01")),
      updatedAt: ts(new Date("2026-02-01")),
    });

    const services = await listServices({ shopId: "shop-1", branchId: "b1" });
    expect(services.map((s) => s.id)).toEqual(["b1-job"]);
  });
});

describe("getService / updateService", () => {
  beforeEach(() => {
    firebaseAdminMock.adminDb.__reset();
    firebaseAdminMock.adminDb.__seed("services", "s1", {
      name: "Screen",
      shopId: "shop-1",
      branchId: "b1",
      status: "pending",
      createdAt: ts(new Date("2026-01-01")),
      updatedAt: ts(new Date("2026-01-01")),
    });
  });

  it("loads a service by id", async () => {
    const { getService } = await import("@/lib/serviceRepo");
    const service = await getService("s1");
    expect(service?.name).toBe("Screen");
    expect(service?.shopId).toBe("shop-1");
  });

  it("rejects updates for another shop", async () => {
    const { updateService } = await import("@/lib/serviceRepo");
    await expect(
      updateService("s1", "shop-other", { fields: { status: "completed" } })
    ).rejects.toThrow(/permitted/i);
  });
});
