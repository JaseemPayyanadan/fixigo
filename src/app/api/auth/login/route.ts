import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { generateToken } from "@/lib/auth";
import { loginUser } from "@/lib/authUsers";
import { mintCustomTokenForUser } from "@/lib/firebaseCustomToken";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await loginUser({ email, password });
    const token = generateToken(user);
    const customToken = await mintCustomTokenForUser(user);

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      user: {
        ...user,
        uid: user.id,
      },
      customToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 401 }
    );
  }
}
