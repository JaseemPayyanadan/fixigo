/**
 * In-memory stand-in for the subset of firebase-admin our repos use, extracted
 * from technicianRepo.test.ts so purchaseRepo can share it. Beyond the original
 * it supports chained where(), orderBy(), limit(), and transaction rollback.
 *
 * Because vi.mock factories are hoisted above imports, they cannot close over
 * module-scope values. Always mock through an async factory with an inner
 * dynamic import:
 *
 *   vi.mock("@/lib/firebaseAdmin", async () => {
 *     const { createFakeFirestore } = await import("@/lib/testing/fakeFirestore");
 *     return createFakeFirestore();
 *   });
 */

export interface FakeWrite {
  op: "set" | "update" | "delete";
  collection: string;
  id: string;
  data: Record<string, unknown>;
}

interface ArrayOp {
  __op: "arrayUnion" | "arrayRemove";
  value: unknown;
}

interface WhereClause {
  field: string;
  value: unknown;
}

type DocData = Record<string, unknown>;

function isArrayOp(value: unknown): value is ArrayOp {
  return !!value && typeof value === "object" && "__op" in (value as DocData);
}

function applyUpdate(current: DocData | undefined, updates: DocData): DocData {
  const result: DocData = { ...(current ?? {}) };
  for (const [field, raw] of Object.entries(updates)) {
    if (!isArrayOp(raw)) {
      result[field] = raw;
      continue;
    }
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
  }
  return result;
}

function compare(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function createFakeFirestore() {
  const store = new Map<string, DocData>();
  let autoId = 0;
  let writes: FakeWrite[] = [];
  let transactionCount = 0;

  const key = (collection: string, id: string) => `${collection}/${id}`;

  function makeDocRef(collection: string, id: string) {
    return {
      id,
      collectionName: collection,
      async get() {
        const data = store.get(key(collection, id));
        return { id, exists: data !== undefined, data: () => data };
      },
      async set(data: DocData) {
        writes.push({ op: "set", collection, id, data });
        store.set(key(collection, id), data);
      },
      async update(data: DocData) {
        const current = store.get(key(collection, id));
        if (current === undefined) {
          throw new Error(`NOT_FOUND: No document to update: ${key(collection, id)}`);
        }
        writes.push({ op: "update", collection, id, data });
        store.set(key(collection, id), applyUpdate(current, data));
      },
    };
  }

  /** A query builder that accumulates clauses and only evaluates on get(). */
  function makeQuery(
    collection: string,
    clauses: WhereClause[],
    order?: { field: string; direction: "asc" | "desc" },
    max?: number
  ) {
    const query = {
      where(field: string, _op: string, value: unknown) {
        return makeQuery(collection, [...clauses, { field, value }], order, max);
      },
      orderBy(field: string, direction: "asc" | "desc" = "asc") {
        return makeQuery(collection, clauses, { field, direction }, max);
      },
      limit(count: number) {
        return makeQuery(collection, clauses, order, count);
      },
      async get() {
        const prefix = `${collection}/`;
        let rows = [...store.entries()]
          .filter(([docKey]) => docKey.startsWith(prefix))
          .map(([docKey, data]) => ({ id: docKey.slice(prefix.length), data }))
          .filter((row) => clauses.every((clause) => row.data[clause.field] === clause.value));

        if (order) {
          const direction = order.direction === "desc" ? -1 : 1;
          rows = rows.sort(
            (a, b) => compare(a.data[order.field], b.data[order.field]) * direction
          );
        }

        if (max !== undefined) rows = rows.slice(0, max);

        const docs = rows.map((row) => ({ id: row.id, data: () => row.data }));
        return { docs, empty: docs.length === 0 };
      },
    };
    return query;
  }

  function makeCollectionRef(collection: string) {
    return {
      doc(id?: string) {
        return makeDocRef(collection, id ?? `auto-${++autoId}`);
      },
      where(field: string, op: string, value: unknown) {
        return makeQuery(collection, []).where(field, op, value);
      },
      orderBy(field: string, direction: "asc" | "desc" = "asc") {
        return makeQuery(collection, []).orderBy(field, direction);
      },
      limit(count: number) {
        return makeQuery(collection, []).limit(count);
      },
      async get() {
        return makeQuery(collection, []).get();
      },
    };
  }

  const adminDb = {
    collection: (name: string) => makeCollectionRef(name),

    async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
      transactionCount += 1;
      writes = [];

      // Snapshot for rollback: a real transaction that throws commits nothing.
      const snapshot = new Map(store);
      const staged: FakeWrite[] = [];
      let hasWritten = false;

      const tx: FakeTransaction = {
        get: async (ref: { get: () => Promise<unknown> }) => {
          // Real Firestore requires every read to precede every write in a
          // transaction, and throws FAILED_PRECONDITION otherwise. The fake
          // enforces it so a repo cannot pass its tests and fail in production.
          if (hasWritten) {
            throw new Error(
              "FAILED_PRECONDITION: Firestore transactions require all reads to be executed before all writes."
            );
          }
          return ref.get();
        },
        set: (ref, data) => {
          hasWritten = true;
          staged.push({ op: "set", collection: ref.collectionName, id: ref.id, data });
          store.set(key(ref.collectionName, ref.id), data);
        },
        update: (ref, data) => {
          const docKey = key(ref.collectionName, ref.id);
          const current = store.get(docKey);
          if (current === undefined) {
            throw new Error(`NOT_FOUND: No document to update: ${docKey}`);
          }
          hasWritten = true;
          staged.push({ op: "update", collection: ref.collectionName, id: ref.id, data });
          store.set(docKey, applyUpdate(current, data));
        },
        delete: (ref) => {
          hasWritten = true;
          staged.push({ op: "delete", collection: ref.collectionName, id: ref.id, data: {} });
          store.delete(key(ref.collectionName, ref.id));
        },
      };

      try {
        const result = await fn(tx);
        writes = staged;
        return result;
      } catch (error) {
        store.clear();
        for (const [k, v] of snapshot) store.set(k, v);
        writes = [];
        throw error;
      }
    },
  };

  const FieldValue = {
    arrayUnion: (value: unknown): ArrayOp => ({ __op: "arrayUnion", value }),
    arrayRemove: (value: unknown): ArrayOp => ({ __op: "arrayRemove", value }),
    serverTimestamp: () => new Date(),
  };

  return {
    adminDb,
    FieldValue,
    __reset() {
      store.clear();
      writes = [];
      transactionCount = 0;
      autoId = 0;
    },
    __seed(collection: string, id: string, data: DocData) {
      store.set(key(collection, id), data);
    },
    __doc(collection: string, id: string): DocData | undefined {
      return store.get(key(collection, id));
    },
    /**
     * True when any document key — `${collection}/${id}` — contains `needle`.
     * Scans the whole store rather than the write log, so it catches a stray
     * document whatever wrote it and whenever.
     */
    __hasKeyContaining(needle: string): boolean {
      return [...store.keys()].some((storeKey) => storeKey.includes(needle));
    },
    __writes(): FakeWrite[] {
      return [...writes];
    },
    __transactionCount(): number {
      return transactionCount;
    },
  };
}

interface FakeDocRef {
  collectionName: string;
  id: string;
}

export interface FakeTransaction {
  get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
  set: (ref: FakeDocRef, data: Record<string, unknown>) => void;
  update: (ref: FakeDocRef, data: Record<string, unknown>) => void;
  delete: (ref: FakeDocRef) => void;
}

export type FakeFirestore = ReturnType<typeof createFakeFirestore>;
