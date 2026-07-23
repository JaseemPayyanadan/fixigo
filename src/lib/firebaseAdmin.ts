import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Server-only. Bypasses Firestore security rules via a service account.
// Never import this from a "use client" module.

function initAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the Firebase service-account " +
        "JSON (single line) to .env.local locally and to the Vercel project settings."
    );
  }

  let credentials: { project_id: string; client_email: string; private_key: string };
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.");
  }

  return initializeApp({
    credential: cert({
      projectId: credentials.project_id,
      clientEmail: credentials.client_email,
      // Vercel stores newlines escaped; restore them.
      privateKey: credentials.private_key.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminDb = getFirestore(initAdminApp());
export { FieldValue, Timestamp } from "firebase-admin/firestore";
