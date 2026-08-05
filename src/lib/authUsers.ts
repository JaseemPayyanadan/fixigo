import { hashPassword, verifyPassword, type AuthUser, type LoginCredentials, type RegisterData } from "@/lib/auth";
import { adminDb } from "@/lib/firebaseAdmin";

type TimestampLike = { toDate: () => Date };

function toDate(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as TimestampLike).toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date();
}

function mapUser(id: string, userData: Record<string, unknown>): AuthUser {
  return {
    id,
    uid: id,
    email: userData.email as string,
    name: userData.name as string,
    role: userData.role as AuthUser["role"],
    shopId: userData.shopId as string | undefined,
    branchId: userData.branchId as string | undefined,
    onboardingCompleted: Boolean(userData.onboardingCompleted),
    createdAt: toDate(userData.createdAt),
    updatedAt: toDate(userData.updatedAt),
  };
}

// Register new user (Admin SDK — bypasses security rules)
export async function registerUser(data: RegisterData): Promise<AuthUser> {
  const { name, email, password, role } = data;

  const existing = await adminDb.collection("users").where("email", "==", email).get();
  if (!existing.empty) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await hashPassword(password);
  const now = new Date();
  const userRef = adminDb.collection("users").doc();

  await userRef.set({
    name,
    email,
    password: hashedPassword,
    role,
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: userRef.id,
    uid: userRef.id,
    name,
    email,
    role,
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

// Login user (Admin SDK — must not use the client SDK, or rules block unauthenticated reads)
export async function loginUser(credentials: LoginCredentials): Promise<AuthUser> {
  const { email, password } = credentials;

  const querySnapshot = await adminDb.collection("users").where("email", "==", email).get();
  if (querySnapshot.empty) {
    throw new Error("Invalid email or password");
  }

  const userDoc = querySnapshot.docs[0];
  const userData = userDoc.data();

  const isValidPassword = await verifyPassword(password, userData.password as string);
  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  return mapUser(userDoc.id, userData as Record<string, unknown>);
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  try {
    const userDoc = await adminDb.collection("users").doc(id).get();
    if (!userDoc.exists) {
      return null;
    }
    return mapUser(userDoc.id, userDoc.data() as Record<string, unknown>);
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function updateUserOnboarding(userId: string, shopId: string): Promise<void> {
  await adminDb.collection("users").doc(userId).set(
    {
      shopId,
      onboardingCompleted: true,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}
