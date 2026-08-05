import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";
import { getUserById } from "@/lib/authUsers";
import { mintCustomTokenForUser } from "@/lib/firebaseCustomToken";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
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

    const customToken = await mintCustomTokenForUser(user);

    return NextResponse.json({
      user: {
        ...user,
        uid: user.id,
      },
      customToken,
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}
