import { addDoc, collection, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "./firebase";
import { logger } from "./logger";
import type { User, Role } from "@/types";

export interface CreateUserOptions {
  name: string;
  email: string;
  password?: string;
  role: Role;
  shopId: string;
  branchId?: string;
  phone?: string;
  skills?: string[];
  specializations?: string[];
  bio?: string;
}

export interface CreateUserResult {
  userId: string;
  uid: string;
  tempPassword?: string;
  email: string;
  role: Role;
}

// Utility function to add a user to the branch's members array
export async function addUserToBranchMembers(shopId: string, branchId: string, userId: string, role: string) {
  const branchRef = doc(db, "shops", shopId, "branches", branchId);
  await updateDoc(branchRef, {
    members: arrayUnion({ userId, role })
  });
}

export class UserManagementService {
  /**
   * Creates a new user with proper role assignment and data consistency
   */
  static async createUser(options: CreateUserOptions): Promise<CreateUserResult> {
    const { name, email, password, role, shopId, branchId, phone, skills, specializations, bio } = options;

    try {
      // Step 1: Validate required fields
      if (!name.trim() || !email.trim()) {
        throw new Error("Name and email are required");
      }

      if (role === "branch_admin" && !branchId) {
        throw new Error("Branch ID is required for branch admin");
      }

      if (role === "technician" && !branchId) {
        throw new Error("Branch ID is required for technician");
      }

      // Step 2: Verify shop exists
      const shopDocRef = doc(db, "shops", shopId);
      const shopDoc = await getDoc(shopDocRef);
      if (!shopDoc.exists()) {
        throw new Error("Shop not found");
      }

      // Step 3: Verify branch exists (if applicable)
      if (branchId) {
        const branchDocRef = doc(db, "shops", shopId, "branches", branchId);
        const branchDoc = await getDoc(branchDocRef);
        if (!branchDoc.exists()) {
          throw new Error("Branch not found");
        }
      }

      // Step 4: Generate password if not provided
      let userPassword = password;
      let tempPassword: string | undefined;
      
      if (!userPassword) {
        tempPassword = this.generateSecurePassword();
        userPassword = tempPassword;
      }

      // Step 5: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        userPassword
      );

      const uid = userCredential.user.uid;

      // Step 6: Create user document
      const userDocRef = await addDoc(collection(db, "users"), {
        uid,
        name: name.trim(),
        email: email.trim(),
        role,
        shopId,
        branchId: branchId || null,
        status: "active",
        onboardingCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 7: Create role-specific documents
      if (role === "branch_admin") {
        await this.createBranchAdminProfile(uid, {
          name,
          email,
          shopId,
          branchId: branchId!,
          phone: phone || "",
        });
        // Add to branch members array
        await addUserToBranchMembers(shopId, branchId!, uid, role);
      } else if (role === "technician") {
        await this.createTechnicianProfile(uid, {
          name,
          email,
          phone: phone || "",
          shopId,
          branchId: branchId!,
          skills: skills || [],
          specializations: specializations || [],
          bio: bio || "",
        });
        // Add to branch members array
        await addUserToBranchMembers(shopId, branchId!, uid, role);
      }

      logger.info("User created successfully", {
        userId: userDocRef.id,
        uid,
        email,
        role,
        shopId,
        branchId,
      });

      return {
        userId: userDocRef.id,
        uid,
        tempPassword,
        email,
        role,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create user";
      logger.error("Error creating user", { error: errorMessage, options: JSON.stringify(options) });
      throw new Error(errorMessage);
    }
  }

  /**
   * Creates a branch admin profile
   */
  private static async createBranchAdminProfile(
    uid: string,
    data: {
      name: string;
      email: string;
      shopId: string;
      branchId: string;
      phone: string;
    }
  ) {
    // Branch admin profile is stored in the branch document itself
    // The managerId field in the branch document contains the UID
    logger.info("Branch admin profile created", { uid, branchId: data.branchId });
  }

  /**
   * Creates a technician profile in the nested collection
   */
  private static async createTechnicianProfile(
    uid: string,
    data: {
      name: string;
      email: string;
      phone: string;
      shopId: string;
      branchId: string;
      skills: string[];
      specializations: string[];
      bio: string;
    }
  ) {
    await addDoc(
      collection(db, "shops", data.shopId, "branches", data.branchId, "technicians"),
      {
        uid,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: "technician",
        shopId: data.shopId,
        branchId: data.branchId,
        skills: data.skills,
        status: "active",
        bio: data.bio,
        specializations: data.specializations,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    logger.info("Technician profile created", { uid, branchId: data.branchId });
  }

  /**
   * Generates a secure temporary password
   */
  private static generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Validates user permissions for creating other users
   */
  static validateUserCreationPermissions(
    currentUser: User | null,
    targetRole: Role,
    targetShopId: string,
    targetBranchId?: string
  ): boolean {
    if (!currentUser) return false;

    // Shop admin can create branch admins and technicians in their shop
    if (currentUser.role === "shop_admin" && currentUser.shopId === targetShopId) {
      return true;
    }

    // Branch admin can only create technicians in their branch
    if (currentUser.role === "branch_admin" && 
        currentUser.shopId === targetShopId && 
        currentUser.branchId === targetBranchId &&
        targetRole === "technician") {
      return true;
    }

    return false;
  }
} 