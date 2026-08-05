"use client";

import { signInWithCustomToken, signOut } from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase";

/** Establish (or refresh) the Firebase Auth session used by Firestore rules. */
export async function establishFirebaseSession(customToken: string): Promise<void> {
  await signInWithCustomToken(firebaseAuth, customToken);
}

export async function clearFirebaseSession(): Promise<void> {
  if (firebaseAuth.currentUser) {
    await signOut(firebaseAuth);
  }
}
