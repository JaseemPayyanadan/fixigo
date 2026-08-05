import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { generateToken } from "@/lib/auth";
import { registerUser } from "@/lib/authUsers";

export const dynamic = "force-dynamic";

/**
 * This endpoint is unauthenticated and mints a session cookie, so whatever role
 * it accepts is a role anyone on the internet can hold. `registerUser` types
 * `role` as a union, but that is erased at runtime and the value is written
 * straight to Firestore and into the JWT — so it must be checked here.
 *
 * Only shop owners sign up for themselves; branch_admin and technician accounts
 * are provisioned by an authenticated admin through the branch/technician APIs,
 * which bind them to a shop and branch. Self-registering either of those would
 * create a privileged role with no shop binding that no admin authorised.
 */
const SELF_REGISTERABLE_ROLES = ["shop_admin"] as const;

type SelfRegisterableRole = (typeof SELF_REGISTERABLE_ROLES)[number];

function isSelfRegisterableRole(value: unknown): value is SelfRegisterableRole {
  return (
    typeof value === "string" &&
    (SELF_REGISTERABLE_ROLES as readonly string[]).includes(value)
  );
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    if (!isSelfRegisterableRole(role)) {
      return NextResponse.json(
        { error: "Accounts of this type must be created by an administrator" },
        { status: 400 }
      );
    }

    const user = await registerUser({ name, email, password, role });
    const token = generateToken(user);

    // Set HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      user: {
        ...user,
        uid: user.id, // Include uid for compatibility
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 400 }
    );
  }
} 