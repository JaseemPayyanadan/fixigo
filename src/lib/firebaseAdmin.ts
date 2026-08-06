import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-only. Bypasses Firestore security rules via a service account.
// Never import this from a "use client" module.

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

/**
 * Resolves FIREBASE_SERVICE_ACCOUNT_KEY, which may hold either the credential
 * JSON itself (how Vercel stores it — one line) or a path to a JSON file on
 * disk (more convenient locally, where a real newline-bearing key is painful
 * to keep in .env.local). Anything starting with `{` is treated as inline JSON;
 * everything else is a path resolved against the working directory.
 */
export function parseServiceAccount(raw: string): ServiceAccount {
  const trimmed = raw.trim();
  const inline = trimmed.startsWith("{");

  let contents: string;
  if (inline) {
    contents = trimmed;
  } else {
    const path = resolve(process.cwd(), trimmed);
    try {
      contents = readFileSync(path, "utf8");
    } catch {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_KEY points at "${trimmed}", which could not be read ` +
          `(resolved to ${path}). Point it at the service-account JSON file, or paste ` +
          `the JSON itself.`
      );
    }
  }

  let credentials: Partial<ServiceAccount>;
  try {
    credentials = JSON.parse(contents);
  } catch {
    throw new Error(
      inline
        ? "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON."
        : `The service-account file "${trimmed}" is not valid JSON.`
    );
  }

  for (const field of ["project_id", "client_email", "private_key"] as const) {
    if (!credentials[field]) {
      throw new Error(
        `Firebase service account is missing "${field}". Use the JSON from Firebase ` +
          `Console -> Project Settings -> Service Accounts, not the web app config.`
      );
    }
  }

  return {
    project_id: credentials.project_id as string,
    client_email: credentials.client_email as string,
    // Vercel stores newlines escaped; restore them.
    private_key: (credentials.private_key as string).replace(/\\n/g, "\n"),
  };
}

function initAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the Firebase service-account " +
        "JSON (single line), or a path to the JSON file, to .env.local locally and " +
        "to the Vercel project settings."
    );
  }

  const credentials = parseServiceAccount(raw);

  return initializeApp({
    credential: cert({
      projectId: credentials.project_id,
      clientEmail: credentials.client_email,
      privateKey: credentials.private_key,
    }),
  });
}

let firestoreSingleton: Firestore | undefined;

function getAdminDb(): Firestore {
  if (!firestoreSingleton) {
    firestoreSingleton = getFirestore(initAdminApp());
  }
  return firestoreSingleton;
}

// Lazily initializes on first property access, so importing this module
// (e.g. during Next.js build-time page-data collection) never touches
// FIREBASE_SERVICE_ACCOUNT_KEY or throws. The credentials are only read,
// and the app only initialized, the first time `adminDb` is actually used.
export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop, _receiver) {
    const db = getAdminDb();
    const value = Reflect.get(db, prop, db);
    return typeof value === "function" ? value.bind(db) : value;
  },
}) as Firestore;

export { FieldValue, Timestamp } from "firebase-admin/firestore";


let authSingleton: Auth | undefined;

function getAdminAuth(): Auth {
  if (!authSingleton) {
    authSingleton = getAuth(initAdminApp());
  }
  return authSingleton;
}

/** Lazily initialized Admin Auth — same pattern as adminDb. */
export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop, _receiver) {
    const auth = getAdminAuth();
    const value = Reflect.get(auth, prop, auth);
    return typeof value === "function" ? value.bind(auth) : value;
  },
}) as Auth;

/**
 * Mint a Firebase Auth custom token whose UID is the Firestore users/{id} doc id.
 * Client signs in with this so Firestore rules see request.auth.uid.
 */
export async function createSessionCustomToken(
  userId: string,
  claims?: { shopId?: string; role?: string; branchId?: string }
): Promise<string> {
  return getAdminAuth().createCustomToken(userId, claims);
}
