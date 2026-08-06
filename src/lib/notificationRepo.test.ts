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
        store.set(key(collection, id), { ...current, ...data });
      },
      get ref() {
        return this;
      },
    };
  }

  function makeCollectionRef(collection: string) {
    return {
      doc(id: string) {
        return makeDocRef(collection, id);
      },
      where(field: string, _op: string, value: unknown) {
        const filters = [{ field, value }];
        let orderField: string | null = null;
        let orderDir: "asc" | "desc" = "asc";
        let limitCount: number | null = null;

        const chain = {
          where(nextField: string, __op: string, nextValue: unknown) {
            filters.push({ field: nextField, value: nextValue });
            return chain;
          },
          orderBy(fieldName: string, direction: "asc" | "desc" = "asc") {
            orderField = fieldName;
            orderDir = direction;
            return chain;
          },
          limit(n: number) {
            limitCount = n;
            return chain;
          },
          count() {
            return {
              async get() {
                const prefix = `${collection}/`;
                const matched = [...store.entries()].filter(([k, data]) => {
                  if (!k.startsWith(prefix) || k.slice(prefix.length).includes("/")) return false;
                  return filters.every((f) => data[f.field] === f.value);
                });
                return { data: () => ({ count: matched.length }) };
              },
            };
          },
          async get() {
            const prefix = `${collection}/`;
            let docs = [...store.entries()]
              .filter(([k, data]) => {
                if (!k.startsWith(prefix) || k.slice(prefix.length).includes("/")) return false;
                return filters.every((f) => data[f.field] === f.value);
              })
              .map(([k, data]) => {
                const id = k.slice(prefix.length);
                const ref = makeDocRef(collection, id);
                return { id, data: () => data, ref };
              });

            if (orderField) {
              const field = orderField;
              docs = docs.sort((a, b) => {
                const aVal = a.data()[field];
                const bVal = b.data()[field];
                const aTime =
                  aVal && typeof (aVal as { toDate?: () => Date }).toDate === "function"
                    ? (aVal as { toDate: () => Date }).toDate().getTime()
                    : aVal instanceof Date
                      ? aVal.getTime()
                      : 0;
                const bTime =
                  bVal && typeof (bVal as { toDate?: () => Date }).toDate === "function"
                    ? (bVal as { toDate: () => Date }).toDate().getTime()
                    : bVal instanceof Date
                      ? bVal.getTime()
                      : 0;
                return orderDir === "desc" ? bTime - aTime : aTime - bTime;
              });
            }

            if (limitCount !== null) {
              docs = docs.slice(0, limitCount);
            }

            return { docs, empty: docs.length === 0, size: docs.length };
          },
        };
        return chain;
      },
    };
  }

  return {
    adminDb: {
      collection: (name: string) => makeCollectionRef(name),
      batch() {
        const ops: Array<() => void> = [];
        return {
          update(ref: { update: (data: Record<string, unknown>) => Promise<void> }, data: Record<string, unknown>) {
            ops.push(() => {
              void ref.update(data);
            });
          },
          async commit() {
            for (const op of ops) op();
          },
        };
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

const { listNotifications, markAllNotificationsRead, markNotificationRead } =
  await import("@/lib/notificationRepo");

function ts(date: Date) {
  return { toDate: () => date };
}

describe("listNotifications", () => {
  beforeEach(() => {
    firebaseAdminMock.adminDb.__reset();
  });

  it("returns only the caller's notifications, newest first", async () => {
    firebaseAdminMock.adminDb.__seed("notifications", "n1", {
      userId: "u1",
      title: "Old",
      message: "a",
      type: "info",
      category: "system",
      read: true,
      createdAt: ts(new Date("2026-01-01")),
      updatedAt: ts(new Date("2026-01-01")),
    });
    firebaseAdminMock.adminDb.__seed("notifications", "n2", {
      userId: "u1",
      title: "New",
      message: "b",
      type: "info",
      category: "system",
      read: false,
      createdAt: ts(new Date("2026-02-01")),
      updatedAt: ts(new Date("2026-02-01")),
    });
    firebaseAdminMock.adminDb.__seed("notifications", "other", {
      userId: "u2",
      title: "Nope",
      message: "c",
      type: "info",
      category: "system",
      read: false,
      createdAt: ts(new Date("2026-03-01")),
      updatedAt: ts(new Date("2026-03-01")),
    });

    const result = await listNotifications("u1");
    expect(result.notifications.map((n) => n.id)).toEqual(["n2", "n1"]);
    expect(result.unreadCount).toBe(1);
  });

  it("limits the list while still counting all unread", async () => {
    for (let i = 0; i < 5; i += 1) {
      firebaseAdminMock.adminDb.__seed("notifications", `n${i}`, {
        userId: "u1",
        title: `T${i}`,
        message: "m",
        type: "info",
        category: "system",
        read: false,
        createdAt: ts(new Date(`2026-01-0${i + 1}`)),
        updatedAt: ts(new Date(`2026-01-0${i + 1}`)),
      });
    }

    const result = await listNotifications("u1", 2);
    expect(result.notifications).toHaveLength(2);
    expect(result.notifications.map((n) => n.id)).toEqual(["n4", "n3"]);
    expect(result.unreadCount).toBe(5);
  });
});

describe("markAllNotificationsRead", () => {
  beforeEach(() => {
    firebaseAdminMock.adminDb.__reset();
    firebaseAdminMock.adminDb.__seed("notifications", "n1", {
      userId: "u1",
      title: "A",
      message: "a",
      type: "info",
      category: "system",
      read: false,
      createdAt: ts(new Date()),
      updatedAt: ts(new Date()),
    });
  });

  it("marks unread notifications for the user", async () => {
    const count = await markAllNotificationsRead("u1");
    expect(count).toBe(1);
    expect(firebaseAdminMock.adminDb.__get("notifications", "n1")?.read).toBe(true);
  });
});

describe("markNotificationRead", () => {
  beforeEach(() => {
    firebaseAdminMock.adminDb.__reset();
    firebaseAdminMock.adminDb.__seed("notifications", "n1", {
      userId: "u1",
      title: "A",
      message: "a",
      type: "info",
      category: "system",
      read: false,
      createdAt: ts(new Date()),
      updatedAt: ts(new Date()),
    });
  });

  it("marks the owner's notification as read", async () => {
    await markNotificationRead("n1", "u1");
    expect(firebaseAdminMock.adminDb.__get("notifications", "n1")?.read).toBe(true);
  });

  it("refuses another user's notification", async () => {
    await expect(markNotificationRead("n1", "u2")).rejects.toThrow(/permitted/i);
  });

  it("returns not found for a missing notification", async () => {
    await expect(markNotificationRead("missing", "u1")).rejects.toThrow(/not found/i);
  });
});
