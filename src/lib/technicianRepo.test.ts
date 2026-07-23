import { describe, expect, it, vi } from "vitest";

// --- Fake Firestore --------------------------------------------------------
// A minimal in-memory stand-in for `adminDb` that supports the subset of the
// firebase-admin API technicianRepo.ts uses: collection().doc(), .get(),
// .where(), and a runTransaction(tx => ...) with tx.get/set/update. It also
// records every write made through a transaction so tests can assert that
// create/update/deactivate perform all their writes inside ONE transaction.

interface ArrayOp {
  __op: "arrayUnion" | "arrayRemove";
  value: unknown;
}

function isArrayOp(value: unknown): value is ArrayOp {
  return !!value && typeof value === "object" && "__op" in (value as Record<string, unknown>);
}

function applyUpdate(
  current: Record<string, unknown> | undefined,
  updates: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...(current ?? {}) };
  for (const [field, raw] of Object.entries(updates)) {
    if (isArrayOp(raw)) {
      const existing = Array.isArray(result[field]) ? [...(result[field] as unknown[])] : [];
      if (raw.__op === "arrayUnion") {
        if (!existing.some((item) => JSON.stringify(item) === JSON.stringify(raw.value))) {
          existing.push(raw.value);
        }
        result[field] = existing;
      } else {
        result[field] = existing.filter(
          (item) => JSON.stringify(item) !== JSON.stringify(raw.value)
        );
      }
    } else {
      result[field] = raw;
    }
  }
  return result;
}

vi.mock("@/lib/firebaseAdmin", () => {
  const store = new Map<string, Record<string, unknown>>();
  let autoId = 0;
  const transactionWrites: Array<{
    op: "set" | "update" | "delete";
    collection: string;
    id: string;
    data: Record<string, unknown>;
  }> = [];
  let transactionCallCount = 0;

  const key = (collection: string, id: string) => `${collection}/${id}`;

  function makeDocRef(collection: string, id: string) {
    return {
      id,
      collectionName: collection,
      async get() {
        const data = store.get(key(collection, id));
        return { id, exists: data !== undefined, data: () => data };
      },
    };
  }

  function makeCollectionRef(collection: string) {
    return {
      doc(id?: string) {
        const docId = id ?? `auto-${++autoId}`;
        return makeDocRef(collection, docId);
      },
      where(field: string, _op: string, value: unknown) {
        return {
          async get() {
            const prefix = `${collection}/`;
            const docs = [...store.entries()]
              .filter(([k, data]) => k.startsWith(prefix) && data[field] === value)
              .map(([k, data]) => ({ id: k.slice(prefix.length), data: () => data }));
            return { docs, empty: docs.length === 0 };
          },
        };
      },
    };
  }

  const adminDb = {
    collection: (name: string) => makeCollectionRef(name),
    async runTransaction(fn: (tx: unknown) => Promise<void>) {
      transactionCallCount += 1;
      transactionWrites.length = 0;
      const tx = {
        get: async (ref: { get: () => Promise<unknown> }) => ref.get(),
        set: (
          ref: { collectionName: string; id: string },
          data: Record<string, unknown>
        ) => {
          transactionWrites.push({
            op: "set",
            collection: ref.collectionName,
            id: ref.id,
            data,
          });
          store.set(key(ref.collectionName, ref.id), data);
        },
        update: (
          ref: { collectionName: string; id: string },
          data: Record<string, unknown>
        ) => {
          transactionWrites.push({
            op: "update",
            collection: ref.collectionName,
            id: ref.id,
            data,
          });
          const current = store.get(key(ref.collectionName, ref.id));
          store.set(key(ref.collectionName, ref.id), applyUpdate(current, data));
        },
        delete: (ref: { collectionName: string; id: string }) => {
          transactionWrites.push({
            op: "delete",
            collection: ref.collectionName,
            id: ref.id,
            data: {},
          });
          store.delete(key(ref.collectionName, ref.id));
        },
      };
      await fn(tx);
    },
    __reset() {
      store.clear();
      transactionWrites.length = 0;
      transactionCallCount = 0;
      autoId = 0;
    },
    __seed(collection: string, id: string, data: Record<string, unknown>) {
      store.set(key(collection, id), data);
    },
    __get(collection: string, id: string) {
      return store.get(key(collection, id));
    },
    __hasKeyContaining(needle: string) {
      return [...store.keys()].some((k) => k.includes(needle));
    },
    __transactionWrites: transactionWrites,
    __transactionCallCount: () => transactionCallCount,
  };

  return {
    adminDb,
    FieldValue: {
      arrayUnion: (value: unknown): ArrayOp => ({ __op: "arrayUnion", value }),
      arrayRemove: (value: unknown): ArrayOp => ({ __op: "arrayRemove", value }),
    },
  };
});

const firebaseAdminMock = (await import("@/lib/firebaseAdmin")) as unknown as {
  adminDb: {
    __reset: () => void;
    __seed: (collection: string, id: string, data: Record<string, unknown>) => void;
    __get: (collection: string, id: string) => Record<string, unknown> | undefined;
    __hasKeyContaining: (needle: string) => boolean;
    __transactionWrites: Array<{ op: "set" | "update" | "delete"; collection: string; id: string; data: unknown }>;
    __transactionCallCount: () => number;
  };
};
const fakeDb = firebaseAdminMock.adminDb;

const {
  mapTechnician,
  createTechnician,
  updateTechnician,
  deactivateTechnician,
  emailExists,
  BRANCHES,
  TECHNICIANS,
  USERS,
} = await import("@/lib/technicianRepo");

function timestamp(date: Date) {
  return { toDate: () => date };
}

describe("mapTechnician", () => {
  it("maps a fully populated document", () => {
    const created = new Date(2026, 0, 2);
    const result = mapTechnician("t1", {
      name: "Fasna",
      email: "fasna@example.com",
      phone: "999",
      role: "technician",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "u9",
      skills: ["screen"],
      status: "active",
      createdAt: timestamp(created),
      updatedAt: timestamp(created),
    });

    expect(result.id).toBe("t1");
    expect(result.name).toBe("Fasna");
    expect(result.skills).toEqual(["screen"]);
    expect(result.createdAt).toEqual(created);
  });

  it("defaults missing scalar fields rather than emitting undefined", () => {
    const result = mapTechnician("t2", {});
    expect(result.name).toBe("");
    expect(result.status).toBe("active");
    expect(result.role).toBe("technician");
    expect(result.skills).toEqual([]);
  });

  it("falls back to a Date when timestamps are absent", () => {
    expect(mapTechnician("t3", {}).createdAt).toBeInstanceOf(Date);
  });

  it("passes through a raw Date without calling toDate", () => {
    const created = new Date(2026, 5, 5);
    expect(mapTechnician("t4", { createdAt: created }).createdAt).toEqual(created);
  });
});

describe("createTechnician", () => {
  it("writes the users doc, technicians doc, and branch member update inside a single transaction", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", { name: "Main Branch", members: [] });

    const created = await createTechnician({
      name: "Rahul",
      email: "rahul@example.com",
      phone: "111",
      password: "plaintext-pw",
      branchId: "branch-1",
      shopId: "shop-1",
      createdBy: "admin-1",
    });

    expect(fakeDb.__transactionCallCount()).toBe(1);

    const ops = fakeDb.__transactionWrites;
    expect(ops.some((w) => w.collection === USERS && w.op === "set")).toBe(true);
    expect(ops.some((w) => w.collection === TECHNICIANS && w.op === "set")).toBe(true);
    expect(
      ops.some((w) => w.collection === BRANCHES && w.id === "branch-1" && w.op === "update")
    ).toBe(true);

    const branchDoc = fakeDb.__get(BRANCHES, "branch-1");
    expect(branchDoc?.members).toEqual([
      { userId: created.userId, role: "technician", name: "Rahul" },
    ]);
  });

  it("targets the top-level branches/{branchId} collection, never shops/{shopId}/branches/{branchId}", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", { name: "Main Branch", members: [] });

    await createTechnician({
      name: "Rahul",
      email: "rahul@example.com",
      phone: "111",
      password: "plaintext-pw",
      branchId: "branch-1",
      shopId: "shop-1",
      createdBy: "admin-1",
    });

    const branchWrite = fakeDb.__transactionWrites.find((w) => w.collection === BRANCHES);
    // Assert the actual document path used for the member write, not just
    // that BRANCHES === "branches" (which the earlier assertion reduced to).
    expect(`${branchWrite?.collection}/${branchWrite?.id}`).toBe("branches/branch-1");
    expect(fakeDb.__hasKeyContaining("shops")).toBe(false);
    expect(fakeDb.__get(BRANCHES, "branch-1")).toBeDefined();
  });

  it("throws when the target branch does not exist, and writes nothing", async () => {
    fakeDb.__reset();
    // No branch seeded.

    await expect(
      createTechnician({
        name: "Rahul",
        email: "rahul@example.com",
        phone: "111",
        password: "plaintext-pw",
        branchId: "missing-branch",
        shopId: "shop-1",
        createdBy: "admin-1",
      })
    ).rejects.toThrow();

    expect(fakeDb.__transactionWrites.length).toBe(0);
  });

  it("stores a hashed password on the users doc, never the plaintext", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", { name: "Main Branch", members: [] });

    const created = await createTechnician({
      name: "Rahul",
      email: "rahul@example.com",
      phone: "111",
      password: "plaintext-pw",
      branchId: "branch-1",
      shopId: "shop-1",
      createdBy: "admin-1",
    });

    expect(created.userId).toBeTruthy();
    const userDoc = fakeDb.__get(USERS, created.userId as string);
    expect(userDoc?.password).toBeDefined();
    expect(userDoc?.password).not.toBe("plaintext-pw");
    expect(typeof userDoc?.password).toBe("string");
    expect((userDoc?.password as string).startsWith("$2")).toBe(true);
  });

  it("sets created_by to the acting admin (createdBy), not the new technician's userId", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", { name: "Main Branch", members: [] });

    const created = await createTechnician({
      name: "Rahul",
      email: "rahul@example.com",
      phone: "111",
      password: "plaintext-pw",
      branchId: "branch-1",
      shopId: "shop-1",
      createdBy: "admin-1",
    });

    expect(created.created_by).toBe("admin-1");
    expect(created.created_by).not.toBe(created.userId);
  });
});

describe("updateTechnician", () => {
  it("syncs name/email/phone to the linked users doc, and maps status:inactive to suspended", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", {
      members: [{ userId: "user-1", role: "technician", name: "Old Name" }],
    });
    fakeDb.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    fakeDb.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    await updateTechnician("tech-1", {
      name: "New Name",
      email: "new@example.com",
      phone: "222",
      status: "inactive",
    });

    // Atomicity: all writes (technician, user, branch member removal) must
    // land inside exactly one transaction — otherwise a fake that performed
    // three separate non-transactional writes would pass this test just as
    // happily.
    expect(fakeDb.__transactionCallCount()).toBe(1);
    const ops = fakeDb.__transactionWrites;
    expect(ops.some((w) => w.collection === TECHNICIANS && w.id === "tech-1")).toBe(true);
    expect(ops.some((w) => w.collection === USERS && w.id === "user-1")).toBe(true);
    expect(ops.some((w) => w.collection === BRANCHES && w.id === "branch-1")).toBe(true);

    const userDoc = fakeDb.__get(USERS, "user-1");
    expect(userDoc?.name).toBe("New Name");
    expect(userDoc?.email).toBe("new@example.com");
    expect(userDoc?.phone).toBe("222");
    expect(userDoc?.status).toBe("suspended");
  });

  it("moving a technician between branches removes the old branch member and adds it to the new branch", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", {
      members: [{ userId: "user-1", role: "technician", name: "Old Name" }],
    });
    fakeDb.__seed(BRANCHES, "branch-2", { members: [] });
    fakeDb.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    fakeDb.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    await updateTechnician("tech-1", { branchId: "branch-2" });

    // Atomicity: technician doc, old branch, and new branch all update in a
    // single transaction.
    expect(fakeDb.__transactionCallCount()).toBe(1);
    const ops = fakeDb.__transactionWrites;
    expect(ops.some((w) => w.collection === TECHNICIANS && w.id === "tech-1")).toBe(true);
    expect(ops.some((w) => w.collection === BRANCHES && w.id === "branch-1")).toBe(true);
    expect(ops.some((w) => w.collection === BRANCHES && w.id === "branch-2")).toBe(true);

    const oldBranch = fakeDb.__get(BRANCHES, "branch-1");
    const newBranch = fakeDb.__get(BRANCHES, "branch-2");
    expect(oldBranch?.members).toEqual([]);
    expect(newBranch?.members).toEqual([{ userId: "user-1", role: "technician", name: "Old Name" }]);
  });

  it("removes a legacy 2-field {userId, role} member entry (no `name`) when moving branches", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", {
      // Legacy shape written by userManagement.ts:31-36 — no `name` field.
      members: [{ userId: "user-1", role: "technician" }],
    });
    fakeDb.__seed(BRANCHES, "branch-2", { members: [] });
    fakeDb.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    fakeDb.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    await updateTechnician("tech-1", { branchId: "branch-2" });

    const oldBranch = fakeDb.__get(BRANCHES, "branch-1");
    expect(oldBranch?.members).toEqual([]);
  });

  it("removes a member entry whose stored `name` has drifted from the technician's current name", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", {
      // Stored name ("Unknown Technician") no longer matches the
      // technician's current name ("Old Name") — arrayRemove with a
      // constructed object would silently fail to match this.
      members: [{ userId: "user-1", role: "technician", name: "Unknown Technician" }],
    });
    fakeDb.__seed(BRANCHES, "branch-2", { members: [] });
    fakeDb.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    fakeDb.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    await updateTechnician("tech-1", { branchId: "branch-2" });

    const oldBranch = fakeDb.__get(BRANCHES, "branch-1");
    expect(oldBranch?.members).toEqual([]);
  });

  it("reactivating a technician (status: 'active') restores the branch member entry", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", { members: [] });
    fakeDb.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "inactive",
    });
    fakeDb.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "suspended",
    });

    await updateTechnician("tech-1", { status: "active" });

    const branch = fakeDb.__get(BRANCHES, "branch-1");
    expect(branch?.members).toEqual([{ userId: "user-1", role: "technician", name: "Old Name" }]);

    const userDoc = fakeDb.__get(USERS, "user-1");
    expect(userDoc?.status).toBe("active");
  });

  it("throws when moving to a branch that does not exist, without corrupting other docs", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", {
      members: [{ userId: "user-1", role: "technician", name: "Old Name" }],
    });
    fakeDb.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    fakeDb.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    await expect(updateTechnician("tech-1", { branchId: "missing-branch" })).rejects.toThrow();

    // Nothing should have been written since the guard throws before writes.
    expect(fakeDb.__transactionWrites.length).toBe(0);
    expect(fakeDb.__get(TECHNICIANS, "tech-1")?.branchId).toBe("branch-1");
  });

  it("skips the linked users doc sync (does not throw) when that doc is missing", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", {
      members: [{ userId: "user-1", role: "technician", name: "Old Name" }],
    });
    fakeDb.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    // No users/user-1 doc seeded — simulates a corrupted/deleted account.

    await expect(
      updateTechnician("tech-1", { name: "New Name" })
    ).resolves.toBeDefined();

    expect(fakeDb.__get(TECHNICIANS, "tech-1")?.name).toBe("New Name");
    expect(fakeDb.__get(USERS, "user-1")).toBeUndefined();
  });
});

describe("deactivateTechnician", () => {
  it("soft-deletes: sets technician inactive, user suspended, removes the branch member, deletes nothing", async () => {
    fakeDb.__reset();
    fakeDb.__seed(BRANCHES, "branch-1", {
      members: [{ userId: "user-1", role: "technician", name: "Some Tech" }],
    });
    fakeDb.__seed(TECHNICIANS, "tech-1", {
      name: "Some Tech",
      email: "tech@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    fakeDb.__seed(USERS, "user-1", {
      name: "Some Tech",
      email: "tech@example.com",
      phone: "000",
      status: "active",
    });

    await deactivateTechnician("tech-1");

    // Atomicity: technician, user, and branch member removal must all land
    // inside exactly one transaction, and the write log must show all three
    // targets touched (not just that the final store state looks right).
    expect(fakeDb.__transactionCallCount()).toBe(1);
    const ops = fakeDb.__transactionWrites;
    expect(ops.some((w) => w.collection === TECHNICIANS && w.id === "tech-1")).toBe(true);
    expect(ops.some((w) => w.collection === USERS && w.id === "user-1")).toBe(true);
    expect(ops.some((w) => w.collection === BRANCHES && w.id === "branch-1")).toBe(true);
    // Soft delete must never issue a real delete op against any document.
    expect(ops.filter((w) => w.op === "delete").length).toBe(0);

    const technicianDoc = fakeDb.__get(TECHNICIANS, "tech-1");
    const userDoc = fakeDb.__get(USERS, "user-1");
    const branchDoc = fakeDb.__get(BRANCHES, "branch-1");

    expect(technicianDoc).toBeDefined();
    expect(technicianDoc?.status).toBe("inactive");
    expect(userDoc).toBeDefined();
    expect(userDoc?.status).toBe("suspended");
    expect(branchDoc?.members).toEqual([]);
  });
});

describe("emailExists", () => {
  it("returns false when no user document has the given email", async () => {
    fakeDb.__reset();
    fakeDb.__seed(USERS, "user-1", { email: "someone@example.com" });

    await expect(emailExists("nobody@example.com")).resolves.toBe(false);
  });

  it("returns true when a user document has the given email", async () => {
    fakeDb.__reset();
    fakeDb.__seed(USERS, "user-1", { email: "taken@example.com" });

    await expect(emailExists("taken@example.com")).resolves.toBe(true);
  });

  it("excludes the matching user via exceptUserId (the users collection doc id)", async () => {
    fakeDb.__reset();
    fakeDb.__seed(USERS, "user-1", { email: "taken@example.com" });

    // Own email, excluded by its own users-doc id: not a collision.
    await expect(emailExists("taken@example.com", "user-1")).resolves.toBe(false);
  });

  it("still reports a collision when exceptUserId belongs to a different user", async () => {
    fakeDb.__reset();
    fakeDb.__seed(USERS, "user-1", { email: "taken@example.com" });
    fakeDb.__seed(USERS, "user-2", { email: "other@example.com" });

    await expect(emailExists("taken@example.com", "user-2")).resolves.toBe(true);
  });

  it("false positive: passing a technician document id (not its userId) as exceptUserId fails to exclude the user", async () => {
    fakeDb.__reset();
    // technician doc id "tech-1" is unrelated to the users collection doc id
    // "user-1" that actually owns this email — exceptUserId must be the
    // Technician.userId, never Technician.id.
    fakeDb.__seed(USERS, "user-1", { email: "self@example.com" });

    await expect(emailExists("self@example.com", "tech-1")).resolves.toBe(true);
  });
});
