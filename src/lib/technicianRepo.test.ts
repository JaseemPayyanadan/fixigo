import { describe, expect, it, vi } from "vitest";

// --- Fake Firestore --------------------------------------------------------
// The in-memory stand-in for `adminDb` used to live inline here; it now lives
// in src/lib/testing/fakeFirestore.ts so purchaseRepo's tests can share it.
// vi.mock factories are hoisted above imports, so the factory cannot close
// over a module-scope variable — it must dynamically import the fake inside
// an async factory instead.

vi.mock("@/lib/firebaseAdmin", async () => {
  const { createFakeFirestore: create } = await import("@/lib/testing/fakeFirestore");
  return create();
});

const firebaseAdminMock = await import("@/lib/firebaseAdmin");

type TestHooks = {
  __reset: () => void;
  __seed: (collection: string, id: string, data: Record<string, unknown>) => void;
  __doc: (collection: string, id: string) => Record<string, unknown> | undefined;
  __writes: () => Array<{ op: "set" | "update" | "delete"; collection: string; id: string; data: unknown }>;
  __transactionCount: () => number;
};

const hooks = firebaseAdminMock as unknown as TestHooks;

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

const { ApiError } = await import("@/lib/apiAuth");

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
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", { name: "Main Branch", shopId: "shop-1", members: [] });

    const created = await createTechnician({
      name: "Rahul",
      email: "rahul@example.com",
      phone: "111",
      password: "plaintext-pw",
      branchId: "branch-1",
      shopId: "shop-1",
      createdBy: "admin-1",
    });

    expect(hooks.__transactionCount()).toBe(1);

    const ops = hooks.__writes();
    expect(ops.some((w) => w.collection === USERS && w.op === "set")).toBe(true);
    expect(ops.some((w) => w.collection === TECHNICIANS && w.op === "set")).toBe(true);
    expect(
      ops.some((w) => w.collection === BRANCHES && w.id === "branch-1" && w.op === "update")
    ).toBe(true);

    const branchDoc = hooks.__doc(BRANCHES, "branch-1");
    expect(branchDoc?.members).toEqual([
      { userId: created.userId, role: "technician", name: "Rahul" },
    ]);
  });

  it("targets the top-level branches/{branchId} collection, never shops/{shopId}/branches/{branchId}", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", { name: "Main Branch", shopId: "shop-1", members: [] });

    await createTechnician({
      name: "Rahul",
      email: "rahul@example.com",
      phone: "111",
      password: "plaintext-pw",
      branchId: "branch-1",
      shopId: "shop-1",
      createdBy: "admin-1",
    });

    const branchWrite = hooks.__writes().find((w) => w.collection === BRANCHES);
    // Assert the actual document path used for the member write, not just
    // that BRANCHES === "branches" (which the earlier assertion reduced to).
    expect(`${branchWrite?.collection}/${branchWrite?.id}`).toBe("branches/branch-1");
    // No write ever targets a "shops" collection (e.g. a nested
    // shops/{shopId}/branches/{branchId} path) — every write stays under the
    // flat, top-level collections.
    expect(hooks.__writes().some((w) => w.collection.includes("shops"))).toBe(false);
    expect(hooks.__doc(BRANCHES, "branch-1")).toBeDefined();
  });

  it("throws a 400 ApiError when the target branch does not exist, and writes nothing", async () => {
    hooks.__reset();
    // No branch seeded.

    const promise = createTechnician({
      name: "Rahul",
      email: "rahul@example.com",
      phone: "111",
      password: "plaintext-pw",
      branchId: "missing-branch",
      shopId: "shop-1",
      createdBy: "admin-1",
    });

    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 400 });

    expect(hooks.__writes().length).toBe(0);
  });

  it("stores a hashed password on the users doc, never the plaintext", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", { name: "Main Branch", shopId: "shop-1", members: [] });

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
    const userDoc = hooks.__doc(USERS, created.userId as string);
    expect(userDoc?.password).toBeDefined();
    expect(userDoc?.password).not.toBe("plaintext-pw");
    expect(typeof userDoc?.password).toBe("string");
    expect((userDoc?.password as string).startsWith("$2")).toBe(true);
  });

  it("sets created_by to the acting admin (createdBy), not the new technician's userId", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", { name: "Main Branch", shopId: "shop-1", members: [] });

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

  it("throws a 403 ApiError when the branch belongs to another shop, and writes nothing", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "victim-branch", {
      name: "Shop 2 Branch",
      shopId: "shop-2",
      members: [],
    });

    const promise = createTechnician({
      name: "Injected",
      email: "attacker@example.com",
      phone: "111",
      password: "plaintext-pw",
      branchId: "victim-branch",
      shopId: "shop-1",
      createdBy: "admin-1",
    });

    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 403 });

    expect(hooks.__writes().length).toBe(0);
    expect(hooks.__doc(BRANCHES, "victim-branch")?.members).toEqual([]);
  });

  it("throws a 403 ApiError when the branch has no shopId at all (fails closed)", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "legacy-branch", { name: "Legacy", members: [] });

    const promise = createTechnician({
      name: "Rahul",
      email: "rahul@example.com",
      phone: "111",
      password: "plaintext-pw",
      branchId: "legacy-branch",
      shopId: "shop-1",
      createdBy: "admin-1",
    });

    await expect(promise).rejects.toMatchObject({ status: 403 });
    expect(hooks.__writes().length).toBe(0);
  });
});

describe("updateTechnician", () => {
  it("throws a 403 ApiError when moved into another shop's branch, and writes nothing", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", {
      shopId: "shop-1",
      members: [{ userId: "user-1", role: "technician", name: "Rahul" }],
    });
    hooks.__seed(BRANCHES, "victim-branch", { shopId: "shop-2", members: [] });
    hooks.__seed(TECHNICIANS, "tech-1", {
      name: "Rahul",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    hooks.__seed(USERS, "user-1", { name: "Rahul", branchId: "branch-1", status: "active" });

    const promise = updateTechnician("tech-1", { branchId: "victim-branch" });

    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 403 });

    expect(hooks.__writes().length).toBe(0);
    expect(hooks.__doc(BRANCHES, "victim-branch")?.members).toEqual([]);
    expect(hooks.__doc(USERS, "user-1")?.branchId).toBe("branch-1");
    expect(hooks.__doc(TECHNICIANS, "tech-1")?.branchId).toBe("branch-1");
  });


  it("syncs name/email/phone to the linked users doc, and maps status:inactive to suspended", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", {
      shopId: "shop-1",
      members: [{ userId: "user-1", role: "technician", name: "Old Name" }],
    });
    hooks.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    hooks.__seed(USERS, "user-1", {
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
    expect(hooks.__transactionCount()).toBe(1);
    const ops = hooks.__writes();
    expect(ops.some((w) => w.collection === TECHNICIANS && w.id === "tech-1")).toBe(true);
    expect(ops.some((w) => w.collection === USERS && w.id === "user-1")).toBe(true);
    expect(ops.some((w) => w.collection === BRANCHES && w.id === "branch-1")).toBe(true);

    const userDoc = hooks.__doc(USERS, "user-1");
    expect(userDoc?.name).toBe("New Name");
    expect(userDoc?.email).toBe("new@example.com");
    expect(userDoc?.phone).toBe("222");
    expect(userDoc?.status).toBe("suspended");
  });

  it("moving a technician between branches removes the old branch member and adds it to the new branch", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", {
      shopId: "shop-1",
      members: [{ userId: "user-1", role: "technician", name: "Old Name" }],
    });
    hooks.__seed(BRANCHES, "branch-2", { shopId: "shop-1", members: [] });
    hooks.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    hooks.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    await updateTechnician("tech-1", { branchId: "branch-2" });

    // Atomicity: technician doc, old branch, and new branch all update in a
    // single transaction.
    expect(hooks.__transactionCount()).toBe(1);
    const ops = hooks.__writes();
    expect(ops.some((w) => w.collection === TECHNICIANS && w.id === "tech-1")).toBe(true);
    expect(ops.some((w) => w.collection === BRANCHES && w.id === "branch-1")).toBe(true);
    expect(ops.some((w) => w.collection === BRANCHES && w.id === "branch-2")).toBe(true);

    const oldBranch = hooks.__doc(BRANCHES, "branch-1");
    const newBranch = hooks.__doc(BRANCHES, "branch-2");
    expect(oldBranch?.members).toEqual([]);
    expect(newBranch?.members).toEqual([{ userId: "user-1", role: "technician", name: "Old Name" }]);
  });

  it("removes a legacy 2-field {userId, role} member entry (no `name`) when moving branches", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", {
      // Legacy shape written by userManagement.ts:31-36 — no `name` field.
      members: [{ userId: "user-1", role: "technician" }],
    });
    hooks.__seed(BRANCHES, "branch-2", { shopId: "shop-1", members: [] });
    hooks.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    hooks.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    await updateTechnician("tech-1", { branchId: "branch-2" });

    const oldBranch = hooks.__doc(BRANCHES, "branch-1");
    expect(oldBranch?.members).toEqual([]);
  });

  it("removes a member entry whose stored `name` has drifted from the technician's current name", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", {
      // Stored name ("Unknown Technician") no longer matches the
      // technician's current name ("Old Name") — arrayRemove with a
      // constructed object would silently fail to match this.
      members: [{ userId: "user-1", role: "technician", name: "Unknown Technician" }],
    });
    hooks.__seed(BRANCHES, "branch-2", { shopId: "shop-1", members: [] });
    hooks.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    hooks.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    await updateTechnician("tech-1", { branchId: "branch-2" });

    const oldBranch = hooks.__doc(BRANCHES, "branch-1");
    expect(oldBranch?.members).toEqual([]);
  });

  it("reactivating a technician (status: 'active') restores the branch member entry", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", { shopId: "shop-1", members: [] });
    hooks.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "inactive",
    });
    hooks.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "suspended",
    });

    await updateTechnician("tech-1", { status: "active" });

    const branch = hooks.__doc(BRANCHES, "branch-1");
    expect(branch?.members).toEqual([{ userId: "user-1", role: "technician", name: "Old Name" }]);

    const userDoc = hooks.__doc(USERS, "user-1");
    expect(userDoc?.status).toBe("active");
  });

  it("throws a 400 ApiError when moving to a branch that does not exist, without corrupting other docs", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", {
      shopId: "shop-1",
      members: [{ userId: "user-1", role: "technician", name: "Old Name" }],
    });
    hooks.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    hooks.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    const promise = updateTechnician("tech-1", { branchId: "missing-branch" });

    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 400 });

    // Nothing should have been written since the guard throws before writes.
    expect(hooks.__writes().length).toBe(0);
    expect(hooks.__doc(TECHNICIANS, "tech-1")?.branchId).toBe("branch-1");
  });

  it("throws a 404 ApiError when the technician vanishes mid-transaction", async () => {
    hooks.__reset();
    // No technicians/tech-1 doc seeded — simulates the doc being deleted
    // between the route's `loadTechnician` check and this transaction.

    const promise = updateTechnician("tech-1", { name: "New Name" });

    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 404 });
  });

  it("skips the linked users doc sync (does not throw) when that doc is missing", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", {
      shopId: "shop-1",
      members: [{ userId: "user-1", role: "technician", name: "Old Name" }],
    });
    hooks.__seed(TECHNICIANS, "tech-1", {
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

    expect(hooks.__doc(TECHNICIANS, "tech-1")?.name).toBe("New Name");
    expect(hooks.__doc(USERS, "user-1")).toBeUndefined();
  });

  it("skips the stale branch membership sync (does not throw) when branches/{branchId} is missing", async () => {
    hooks.__reset();
    // No branches/branch-1 doc seeded — simulates a stale branchId on the
    // technician, the same data-corruption class as the missing-users-doc
    // case above. Renaming/deactivating must still succeed.
    hooks.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    hooks.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    await expect(
      updateTechnician("tech-1", { name: "New Name" })
    ).resolves.toBeDefined();

    expect(hooks.__doc(TECHNICIANS, "tech-1")?.name).toBe("New Name");
    expect(hooks.__doc(BRANCHES, "branch-1")).toBeUndefined();
  });

  it("renaming a technician without changing branch updates the member entry's name in place", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", {
      shopId: "shop-1",
      members: [{ userId: "user-1", role: "technician", name: "Old Name" }],
    });
    hooks.__seed(TECHNICIANS, "tech-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    hooks.__seed(USERS, "user-1", {
      name: "Old Name",
      email: "old@example.com",
      phone: "000",
      status: "active",
    });

    await updateTechnician("tech-1", { name: "New Name" });

    const branch = hooks.__doc(BRANCHES, "branch-1");
    expect(branch?.members).toEqual([
      { userId: "user-1", role: "technician", name: "New Name" },
    ]);
    expect(
      (branch?.members as Array<{ name: string }>).some((m) => m.name === "Old Name")
    ).toBe(false);
  });
});

describe("deactivateTechnician", () => {
  it("soft-deletes: sets technician inactive, user suspended, removes the branch member, deletes nothing", async () => {
    hooks.__reset();
    hooks.__seed(BRANCHES, "branch-1", {
      shopId: "shop-1",
      members: [{ userId: "user-1", role: "technician", name: "Some Tech" }],
    });
    hooks.__seed(TECHNICIANS, "tech-1", {
      name: "Some Tech",
      email: "tech@example.com",
      phone: "000",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "user-1",
      status: "active",
    });
    hooks.__seed(USERS, "user-1", {
      name: "Some Tech",
      email: "tech@example.com",
      phone: "000",
      status: "active",
    });

    await deactivateTechnician("tech-1");

    // Atomicity: technician, user, and branch member removal must all land
    // inside exactly one transaction, and the write log must show all three
    // targets touched (not just that the final store state looks right).
    expect(hooks.__transactionCount()).toBe(1);
    const ops = hooks.__writes();
    expect(ops.some((w) => w.collection === TECHNICIANS && w.id === "tech-1")).toBe(true);
    expect(ops.some((w) => w.collection === USERS && w.id === "user-1")).toBe(true);
    expect(ops.some((w) => w.collection === BRANCHES && w.id === "branch-1")).toBe(true);
    // Soft delete must never issue a real delete op against any document.
    expect(ops.filter((w) => w.op === "delete").length).toBe(0);

    const technicianDoc = hooks.__doc(TECHNICIANS, "tech-1");
    const userDoc = hooks.__doc(USERS, "user-1");
    const branchDoc = hooks.__doc(BRANCHES, "branch-1");

    expect(technicianDoc).toBeDefined();
    expect(technicianDoc?.status).toBe("inactive");
    expect(userDoc).toBeDefined();
    expect(userDoc?.status).toBe("suspended");
    expect(branchDoc?.members).toEqual([]);
  });

  it("throws a 404 ApiError when the technician vanishes mid-transaction", async () => {
    hooks.__reset();
    // No technicians/tech-1 doc seeded.

    const promise = deactivateTechnician("tech-1");

    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 404 });
  });
});

describe("emailExists", () => {
  it("returns false when no user document has the given email", async () => {
    hooks.__reset();
    hooks.__seed(USERS, "user-1", { email: "someone@example.com" });

    await expect(emailExists("nobody@example.com")).resolves.toBe(false);
  });

  it("returns true when a user document has the given email", async () => {
    hooks.__reset();
    hooks.__seed(USERS, "user-1", { email: "taken@example.com" });

    await expect(emailExists("taken@example.com")).resolves.toBe(true);
  });

  it("excludes the matching user via exceptUserId (the users collection doc id)", async () => {
    hooks.__reset();
    hooks.__seed(USERS, "user-1", { email: "taken@example.com" });

    // Own email, excluded by its own users-doc id: not a collision.
    await expect(emailExists("taken@example.com", "user-1")).resolves.toBe(false);
  });

  it("still reports a collision when exceptUserId belongs to a different user", async () => {
    hooks.__reset();
    hooks.__seed(USERS, "user-1", { email: "taken@example.com" });
    hooks.__seed(USERS, "user-2", { email: "other@example.com" });

    await expect(emailExists("taken@example.com", "user-2")).resolves.toBe(true);
  });

  it("false positive: passing a technician document id (not its userId) as exceptUserId fails to exclude the user", async () => {
    hooks.__reset();
    // technician doc id "tech-1" is unrelated to the users collection doc id
    // "user-1" that actually owns this email — exceptUserId must be the
    // Technician.userId, never Technician.id.
    hooks.__seed(USERS, "user-1", { email: "self@example.com" });

    await expect(emailExists("self@example.com", "tech-1")).resolves.toBe(true);
  });
});
