import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseAdmin", () => {
  const store = new Map<string, Record<string, unknown>>();
  const key = (collection: string, id: string) => `${collection}/${id}`;

  function makeDocRef(collectionPath: string, id: string) {
    return {
      id,
      collection(sub: string) {
        return makeCollectionRef(`${collectionPath}/${id}/${sub}`);
      },
      async get() {
        const data = store.get(key(collectionPath, id));
        return { id, exists: data !== undefined, data: () => data };
      },
      async update(data: Record<string, unknown>) {
        const current = store.get(key(collectionPath, id));
        if (!current) throw new Error(`NOT_FOUND: ${collectionPath}/${id}`);
        store.set(key(collectionPath, id), { ...current, ...data });
      },
      async delete() {
        store.delete(key(collectionPath, id));
      },
    };
  }

  function makeCollectionRef(collectionPath: string) {
    return {
      doc(id: string) {
        return makeDocRef(collectionPath, id);
      },
      where(field: string, _op: string, value: unknown) {
        return {
          async get() {
            const prefix = `${collectionPath}/`;
            const docs = [...store.entries()]
              .filter(([k, data]) => {
                if (!k.startsWith(prefix)) return false;
                const rest = k.slice(prefix.length);
                if (rest.includes("/")) return false;
                return data[field] === value;
              })
              .map(([k, data]) => ({ id: k.slice(prefix.length), data: () => data }));
            return { docs, empty: docs.length === 0 };
          },
        };
      },
      async get() {
        const prefix = `${collectionPath}/`;
        const docs = [...store.entries()]
          .filter(([k]) => {
            if (!k.startsWith(prefix)) return false;
            const rest = k.slice(prefix.length);
            return !rest.includes("/");
          })
          .map(([k, data]) => ({ id: k.slice(prefix.length), data: () => data }));
        return { docs, empty: docs.length === 0 };
      },
    };
  }

  return {
    adminDb: {
      collection(name: string) {
        return makeCollectionRef(name);
      },
      __reset() {
        store.clear();
      },
      __seed(collection: string, id: string, data: Record<string, unknown>) {
        store.set(key(collection, id), data);
      },
      __get(collection: string, id: string) {
        return store.get(key(collection, id));
      },
    },
  };
});

const firebaseAdminMock = (await import("@/lib/firebaseAdmin")) as unknown as {
  adminDb: {
    __reset: () => void;
    __seed: (c: string, id: string, data: Record<string, unknown>) => void;
    __get: (c: string, id: string) => Record<string, unknown> | undefined;
  };
};

const { listBranches, updateBranch, deleteBranch, mapBranch } = await import("@/lib/branchRepo");

function ts(date: Date) {
  return { toDate: () => date };
}

describe("mapBranch", () => {
  it("prefers name, then legacy name keys", () => {
    expect(mapBranch("b1", { branchName: "Legacy", shopId: "s1" }).name).toBe("Legacy");
    expect(mapBranch("b1", { name: "Main", shopId: "s1" }).name).toBe("Main");
  });
});

describe("listBranches", () => {
  beforeEach(() => {
    firebaseAdminMock.adminDb.__reset();
  });

  it("returns flat branches for the shop, newest first", async () => {
    const older = new Date("2026-01-01T00:00:00Z");
    const newer = new Date("2026-02-01T00:00:00Z");

    firebaseAdminMock.adminDb.__seed("branches", "b-old", {
      name: "Old",
      shopId: "shop-1",
      location: "A",
      phone: "1",
      email: "a@x.com",
      status: "active",
      createdAt: ts(older),
      updatedAt: ts(older),
    });
    firebaseAdminMock.adminDb.__seed("branches", "b-new", {
      name: "New",
      shopId: "shop-1",
      location: "B",
      phone: "2",
      email: "b@x.com",
      status: "active",
      createdAt: ts(newer),
      updatedAt: ts(newer),
    });
    firebaseAdminMock.adminDb.__seed("branches", "other-shop", {
      name: "Other",
      shopId: "shop-2",
      location: "C",
      phone: "3",
      email: "c@x.com",
      status: "active",
      createdAt: ts(newer),
      updatedAt: ts(newer),
    });

    const branches = await listBranches("shop-1");
    expect(branches.map((b) => b.id)).toEqual(["b-new", "b-old"]);
  });

  it("merges nested shop branches that are missing from the flat collection", async () => {
    firebaseAdminMock.adminDb.__seed("branches", "flat-1", {
      name: "Flat",
      shopId: "shop-1",
      location: "A",
      phone: "1",
      email: "a@x.com",
      status: "active",
      createdAt: ts(new Date("2026-01-01")),
      updatedAt: ts(new Date("2026-01-01")),
    });
    firebaseAdminMock.adminDb.__seed("shops/shop-1/branches", "nested-1", {
      name: "Nested",
      location: "B",
      phone: "2",
      email: "b@x.com",
      status: "active",
      createdAt: ts(new Date("2026-03-01")),
      updatedAt: ts(new Date("2026-03-01")),
    });

    const branches = await listBranches("shop-1");
    expect(branches.map((b) => b.id).sort()).toEqual(["flat-1", "nested-1"]);
    expect(branches.find((b) => b.id === "nested-1")?.shopId).toBe("shop-1");
  });
});

describe("updateBranch / deleteBranch", () => {
  beforeEach(() => {
    firebaseAdminMock.adminDb.__reset();
    firebaseAdminMock.adminDb.__seed("branches", "b1", {
      name: "Main",
      shopId: "shop-1",
      location: "A",
      phone: "1",
      email: "a@x.com",
      status: "active",
      createdAt: ts(new Date()),
      updatedAt: ts(new Date()),
    });
  });

  it("updates fields on a branch owned by the shop", async () => {
    await updateBranch("b1", "shop-1", { name: "Renamed", location: "Z" });
    expect(firebaseAdminMock.adminDb.__get("branches", "b1")?.name).toBe("Renamed");
  });

  it("refuses to update a branch from another shop", async () => {
    await expect(updateBranch("b1", "shop-other", { name: "Nope" })).rejects.toThrow(
      /not found|permitted/i
    );
  });

  it("deletes a branch owned by the shop", async () => {
    await deleteBranch("b1", "shop-1");
    expect(firebaseAdminMock.adminDb.__get("branches", "b1")).toBeUndefined();
  });
});
