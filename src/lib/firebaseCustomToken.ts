import type { AuthUser } from "@/lib/auth";
import { createSessionCustomToken } from "@/lib/firebaseAdmin";

export async function mintCustomTokenForUser(user: AuthUser): Promise<string> {
  const claims: { shopId?: string; role?: string; branchId?: string } = {
    role: user.role,
  };
  if (user.shopId) claims.shopId = user.shopId;
  if (user.branchId) claims.branchId = user.branchId;
  return createSessionCustomToken(user.id, claims);
}
