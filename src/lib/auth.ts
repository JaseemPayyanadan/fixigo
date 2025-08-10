import bcrypt from "bcryptjs";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import jwt from "jsonwebtoken";

import { User } from "@/types";

import { db } from "./firebase";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthUser {
  id: string;
  uid: string; // Alias for id for compatibility
  email: string;
  name: string;
  role: "shop_admin" | "branch_admin" | "technician";
  shopId?: string;
  branchId?: string;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: "shop_admin" | "branch_admin" | "technician";
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
      branchId: user.branchId,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

// Register new user
export async function registerUser(data: RegisterData): Promise<AuthUser> {
  const { name, email, password, role } = data;

  // Check if user already exists
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user document
  const userData = {
    name,
    email,
    password: hashedPassword,
    role,
    onboardingCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Add to Firestore
  const userRef = doc(collection(db, "users"));
  await setDoc(userRef, userData);

  // Return user without password
  const user: AuthUser = {
    id: userRef.id,
    uid: userRef.id, // Alias for compatibility
    name,
    email,
    role,
    onboardingCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return user;
}

// Login user
export async function loginUser(credentials: LoginCredentials): Promise<AuthUser> {
  const { email, password } = credentials;

  // Find user by email
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Invalid email or password");
  }

  const userDoc = querySnapshot.docs[0];
  const userData = userDoc.data();

  // Verify password
  const isValidPassword = await verifyPassword(password, userData.password);
  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  // Return user without password
  const user: AuthUser = {
    id: userDoc.id,
    uid: userDoc.id, // Alias for compatibility
    email: userData.email,
    name: userData.name,
    role: userData.role,
    shopId: userData.shopId,
    branchId: userData.branchId,
    onboardingCompleted: userData.onboardingCompleted,
    createdAt: userData.createdAt.toDate(),
    updatedAt: userData.updatedAt.toDate(),
  };

  return user;
}

// Get user by ID
export async function getUserById(id: string): Promise<AuthUser | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", id));
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    return {
      id: userDoc.id,
      uid: userDoc.id, // Alias for compatibility
      email: userData.email,
      name: userData.name,
      role: userData.role,
      shopId: userData.shopId,
      branchId: userData.branchId,
      onboardingCompleted: userData.onboardingCompleted,
      createdAt: userData.createdAt.toDate(),
      updatedAt: userData.updatedAt.toDate(),
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

// Update user onboarding status
export async function updateUserOnboarding(userId: string, shopId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      shopId,
      onboardingCompleted: true,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

// Utility function to convert AuthUser to User type for compatibility
export function authUserToUser(authUser: AuthUser): User {
  return {
    id: authUser.id,
    uid: authUser.uid,
    email: authUser.email,
    name: authUser.name,
    role: authUser.role,
    shopId: authUser.shopId || "",
    branchId: authUser.branchId,
    status: "active" as const,
    onboardingCompleted: authUser.onboardingCompleted,
    createdAt: authUser.createdAt,
    updatedAt: authUser.updatedAt,
  };
}
