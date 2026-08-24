import { NextRequest, NextResponse } from "next/server";

import { ApiError, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { hashPassword } from "@/lib/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { assertWithinPlanLimit, getShopPlanFeatures } from "@/lib/planAccess";
import type { Branch } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    if (user.role !== "shop_admin") {
      throw new ApiError(403, "Only a shop admin can create branches");
    }
    if (!user.shopId) {
      throw new ApiError(403, "User is not associated with a shop");
    }
    const shopId = user.shopId;

    const { name, location, phone, email, password, managerName, managerPhone } =
      await request.json();

    if (!name || !location || !phone || !email || !password) {
      return NextResponse.json(
        { error: "Name, location, phone, email, and password are required" },
        { status: 400 }
      );
    }

    const features = await getShopPlanFeatures(shopId);
    const existingBranchCount = await adminDb.collection("branches").where("shopId", "==", shopId).get();
    assertWithinPlanLimit(
      existingBranchCount.size,
      features.maxBranches,
      `Your plan allows up to ${features.maxBranches} branch(es). Upgrade your plan to add more.`
    );

    const branchQuery = await adminDb
      .collection("branches")
      .where("shopId", "==", shopId)
      .where("name", "==", name)
      .get();

    if (!branchQuery.empty) {
      return NextResponse.json(
        { error: "A branch with this name already exists in your shop" },
        { status: 400 }
      );
    }

    const userQuery = await adminDb.collection("users").where("email", "==", email).get();
    if (!userQuery.empty) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const now = new Date();
    const userRef = adminDb.collection("users").doc();

    const userData = {
      name: managerName || `${name} Manager`,
      email,
      password: hashedPassword,
      role: "branch_admin" as const,
      shopId,
      phone: managerPhone || phone,
      status: "active",
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
    };

    await userRef.set(userData);

    const branchData: Omit<Branch, "id" | "createdAt" | "updatedAt"> = {
      name,
      location,
      phone,
      email,
      status: "active",
      shopId,
      managerId: userRef.id,
      managerName: managerName || `${name} Manager`,
      managerEmail: email,
      managerPhone: managerPhone || phone,
    };

    const branchRef = await adminDb.collection("branches").add({
      ...branchData,
      createdAt: now,
      updatedAt: now,
    });

    // Link branch admin to their branch
    await userRef.update({ branchId: branchRef.id, updatedAt: now });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userRef.id,
          name: userData.name,
          email,
          role: "branch_admin",
          shopId,
          phone: userData.phone,
        },
        branch: {
          id: branchRef.id,
          ...branchData,
        },
      },
      message: "Branch created successfully",
    });
  } catch (error) {
    if (error instanceof ApiError) return toErrorResponse(error);

    console.error("Branch creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create branch" },
      { status: 500 }
    );
  }
}
