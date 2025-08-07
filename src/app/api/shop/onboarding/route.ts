import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, getUserById } from "@/lib/auth";
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
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

    // Get complete user data
    const user = await getUserById(tokenUser.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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