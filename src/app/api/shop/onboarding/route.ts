import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";
import { getUserById } from "@/lib/authUsers";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokenUser = verifyToken(sessionCookie.value);
    if (!tokenUser) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = await getUserById(tokenUser.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "shop_admin") {
      return NextResponse.json(
        { error: "Only a shop admin can complete shop onboarding" },
        { status: 403 }
      );
    }

    if (user.shopId) {
      return NextResponse.json(
        { error: "This account already has a shop" },
        { status: 409 }
      );
    }

    const shopData = await request.json();
    const { shopName, ownerName, email, phone, address, city, pinCode, gstNumber } = shopData;

    if (!shopName || !ownerName || !email || !phone || !address || !city || !pinCode) {
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    const now = new Date();
    const shopRef = adminDb.collection("shops").doc();
    await shopRef.set({
      name: shopName,
      ownerName,
      email,
      phone,
      address,
      city,
      pinCode,
      gstNumber: gstNumber || "",
      createdBy: user.id,
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
    });

    await adminDb.collection("users").doc(user.id).update({
      shopId: shopRef.id,
      onboardingCompleted: true,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      shopId: shopRef.id,
      message: "Shop information saved successfully",
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save shop information" },
      { status: 500 }
    );
  }
}
