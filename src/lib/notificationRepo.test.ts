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
        const chain = {
          where(nextField: string, __op: string, nextValue: unknown) {
            filters.push({ field: nextField, value: nextValue });
            return chain;
          },
          limit(_n: number) {
            return chain;
          },
          async get() {
            const prefix = `${collection}/`;
            const docs = [...store.entries()]
              .filter(([k, data]) => {
                if (!k.startsWith(prefix) || k.slice(prefix.length).includes("/")) return false;
                return filters.every((f) => data[f.field] === f.value);
              })
              .map(([k, data]) => {
                const id = k.slice(prefix.length);
                const ref = makeDocRef(collection, id);
                return { id, data: () => data, ref };
              });
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

  it("refuses another user's notification", async () => {
    await expect(markNotificationRead("n1", "u2")).rejects.toThrow(/permitted/i);
  });
});
