import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "@/lib/auth";

vi.mock("@/lib/firebaseAdmin", () => {
  const store = new Map<string, Record<string, unknown>>();

  const key = (collection: string, id: string) => `${collection}/${id}`;

  function makeDocRef(collection: string, id: string) {
    return {
      id,
      async get() {
        const data = store.get(key(collection, id));
        return {
          id,
          exists: data !== undefined,
          data: () => data,
        };
      },
      async set(data: Record<string, unknown>, opts?: { merge?: boolean }) {
        if (opts?.merge) {
          store.set(key(collection, id), { ...(store.get(key(collection, id)) ?? {}), ...data });
        } else {
          store.set(key(collection, id), data);
        }
      },
    };
  }

  function makeCollectionRef(collection: string) {
    let autoId = 0;
    return {
      doc(id?: string) {
        return makeDocRef(collection, id ?? `auto-${++autoId}`);
      },
      where(field: string, _op: string, value: unknown) {
        return {
          async get() {
            const prefix = `${collection}/`;
            const docs = [...store.entries()]
              .filter(([k, data]) => k.startsWith(prefix) && data[field] === value)
              .map(([k, data]) => ({
                id: k.slice(prefix.length),
                data: () => data,
              }));
            return { docs, empty: docs.length === 0 };
          },
        };
      },
    };
  }

  const adminDb = {
    collection: (name: string) => makeCollectionRef(name),
    __reset() {
      store.clear();
    },
    __seed(collection: string, id: string, data: Record<string, unknown>) {
      store.set(key(collection, id), data);
    },
  };

  return { adminDb };
});

const firebaseAdminMock = (await import("@/lib/firebaseAdmin")) as unknown as {
  adminDb: {
    __reset: () => void;
    __seed: (collection: string, id: string, data: Record<string, unknown>) => void;
  };
};

const { loginUser, getUserById } = await import("@/lib/authUsers");

function timestamp(date: Date) {
  return { toDate: () => date };
}

describe("loginUser", () => {
  beforeEach(() => {
    firebaseAdminMock.adminDb.__reset();
  });

  it("authenticates against adminDb so Firestore rules cannot block login", async () => {
    const password = "secret-pass";
    const hashed = await hashPassword(password);
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const updatedAt = new Date("2026-01-02T00:00:00Z");

    firebaseAdminMock.adminDb.__seed("users", "user-1", {
      email: "owner@example.com",
      password: hashed,
      name: "Owner",
      role: "shop_admin",
      shopId: "shop-1",
      onboardingCompleted: true,
      createdAt: timestamp(createdAt),
      updatedAt: timestamp(updatedAt),
    });

    const user = await loginUser({ email: "owner@example.com", password });

    expect(user).toMatchObject({
      id: "user-1",
      email: "owner@example.com",
      name: "Owner",
      role: "shop_admin",
      shopId: "shop-1",
      onboardingCompleted: true,
    });
  });

  it("rejects bad passwords", async () => {
    const hashed = await hashPassword("correct");
    firebaseAdminMock.adminDb.__seed("users", "user-1", {
      email: "owner@example.com",
      password: hashed,
      name: "Owner",
      role: "shop_admin",
      onboardingCompleted: false,
      createdAt: timestamp(new Date()),
      updatedAt: timestamp(new Date()),
    });

    await expect(
      loginUser({ email: "owner@example.com", password: "wrong" })
    ).rejects.toThrow("Invalid email or password");
  });
});

describe("getUserById", () => {
  beforeEach(() => {
    firebaseAdminMock.adminDb.__reset();
  });

  it("loads the user via adminDb", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    firebaseAdminMock.adminDb.__seed("users", "user-1", {
      email: "owner@example.com",
      name: "Owner",
      role: "shop_admin",
      shopId: "shop-1",
      onboardingCompleted: true,
      createdAt: timestamp(createdAt),
      updatedAt: timestamp(createdAt),
    });

    const user = await getUserById("user-1");
    expect(user?.email).toBe("owner@example.com");
    expect(user?.shopId).toBe("shop-1");
  });
});
