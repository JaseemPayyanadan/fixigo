import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { doc, setDoc, updateDoc, collection } from "firebase/firestore";

import { verifyToken, getUserById } from "@/lib/auth";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokenUser = verifyToken(sessionCookie.value);
    if (!tokenUser) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Get complete user data. Both checks below read this stored record rather
    // than the token: a session minted at signup predates onboarding, so its
    // `shopId` is always stale, and trusting the token's `role` would let a
    // pre-whitelist JWT through.
    const user = await getUserById(tokenUser.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Onboarding is the shop-owner signup step. Any other role was created by
    // an admin and already belongs to that admin's shop; running this would
    // mint an unauthorised shop and silently move them out of their current one.
    if (user.role !== "shop_admin") {
      return NextResponse.json(
        { error: "Only a shop admin can complete shop onboarding" },
        { status: 403 }
      );
    }

    // Onboarding is once per account. Re-running it previously overwrote the
    // caller's `shopId` with a brand-new shop, detaching them from their own
    // data and leaving their users/technicians records disagreeing.
    if (user.shopId) {
      return NextResponse.json(
        { error: "This account already has a shop" },
        { status: 409 }
      );
    }

    // Get shop data from request
    const shopData = await request.json();
    const { shopName, ownerName, email, phone, address, city, pinCode, gstNumber } = shopData;

    // Validate required fields
    if (!shopName || !ownerName || !email || !phone || !address || !city || !pinCode) {
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // Create shop document
    const shopRef = doc(collection(db, "shops"));
    const shopDoc = {
      name: shopName,
      ownerName,
      email,
      phone,
      address,
      city,
      pinCode,
      gstNumber: gstNumber || "",
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(shopRef, shopDoc);

    // Update user with shop ID and mark onboarding as completed
    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, {
      shopId: shopRef.id,
      onboardingCompleted: true,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      shopId: shopRef.id,
      message: "Shop information saved successfully"
    });

  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save shop information" },
      { status: 500 }
    );
  }
} 