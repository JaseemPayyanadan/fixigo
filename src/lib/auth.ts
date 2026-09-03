import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { User } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthUser {
  id: string;
  uid: string; // Alias for id for compatibility
  email: string;
  name: string;
  role: "shop_admin" | "branch_admin" | "technician";
  shopId?: string;
  branchId?: string;
  phone?: string;
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
      uid: user.uid || user.id,
      email: user.email,
      name: user.name || "",
      role: user.role,
      shopId: user.shopId,
      branchId: user.branchId,
      phone: user.phone,
      onboardingCompleted: user.onboardingCompleted,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return {
      ...decoded,
      uid: decoded.uid || decoded.id,
      name: decoded.name || "",
    };
  } catch {
    return null;
  }
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
    phone: authUser.phone,
    status: "active" as const,
    onboardingCompleted: authUser.onboardingCompleted,
    createdAt: authUser.createdAt,
    updatedAt: authUser.updatedAt,
  };
}
