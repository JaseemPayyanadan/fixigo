import { NextRequest, NextResponse } from "next/server";

import { ApiError, readJsonBody, requireUser, toErrorResponse } from "@/lib/apiAuth";
import { getShop, updateShop, type ShopBusinessHours, type UpdateShopInput } from "@/lib/shopRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user.shopId) {
      throw new ApiError(403, "User is not associated with a shop");
    }

    // shopId comes from the session only — never from the query string.
    const shop = await getShop(user.shopId);
    if (!shop) {
      throw new ApiError(404, "Shop not found");
    }

    return NextResponse.json({ shop });
  } catch (error) {
    return toErrorResponse(error);
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

function parseBusinessHours(value: unknown): ShopBusinessHours | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null) {
    throw new ApiError(400, "businessHours must be an object");
  }

  const hours: ShopBusinessHours = {};
  for (const day of WEEKDAYS) {
    const raw = (value as Record<string, unknown>)[day];
    if (raw === undefined) continue;
    if (typeof raw !== "object" || raw === null) {
      throw new ApiError(400, `businessHours.${day} must be an object`);
    }
    const { open, close, closed } = raw as Record<string, unknown>;
    if (typeof open !== "string" || typeof close !== "string" || typeof closed !== "boolean") {
      throw new ApiError(400, `businessHours.${day} must have open (string), close (string), closed (boolean)`);
    }
    hours[day] = { open, close, closed };
  }
  return hours;
}

function parseUpdateInput(body: unknown): UpdateShopInput {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "Request body must be an object");
  }
  const raw = body as Record<string, unknown>;
  const input: UpdateShopInput = {};

  if (raw.name !== undefined) {
    if (typeof raw.name !== "string" || !raw.name.trim()) {
      throw new ApiError(400, "name must be a non-empty string");
    }
    input.name = raw.name.trim();
  }

  if (raw.address !== undefined) {
    if (typeof raw.address !== "string") throw new ApiError(400, "address must be a string");
    input.address = raw.address.trim();
  }

  if (raw.phone !== undefined) {
    if (typeof raw.phone !== "string") throw new ApiError(400, "phone must be a string");
    input.phone = raw.phone.trim();
  }

  if (raw.email !== undefined) {
    if (typeof raw.email !== "string" || !EMAIL_PATTERN.test(raw.email.trim())) {
      throw new ApiError(400, "email must be a valid email address");
    }
    input.email = raw.email.trim();
  }

  if (raw.gstNumber !== undefined) {
    if (typeof raw.gstNumber !== "string") throw new ApiError(400, "gstNumber must be a string");
    input.gstNumber = raw.gstNumber.trim();
  }

  if (raw.businessType !== undefined) {
    if (typeof raw.businessType !== "string") throw new ApiError(400, "businessType must be a string");
    input.businessType = raw.businessType.trim();
  }

  if (raw.description !== undefined) {
    if (typeof raw.description !== "string") throw new ApiError(400, "description must be a string");
    input.description = raw.description.trim();
  }

  if (raw.notificationsEnabled !== undefined) {
    if (typeof raw.notificationsEnabled !== "boolean") throw new ApiError(400, "notificationsEnabled must be a boolean");
    input.notificationsEnabled = raw.notificationsEnabled;
  }

  const businessHours = parseBusinessHours(raw.businessHours);
  if (businessHours !== undefined) input.businessHours = businessHours;

  return input;
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.shopId) {
      throw new ApiError(403, "User is not associated with a shop");
    }
    if (user.role !== "shop_admin") {
      throw new ApiError(403, "Only a shop admin can update shop settings");
    }

    const body = await readJsonBody(request);
    const input = parseUpdateInput(body);

    const shop = await updateShop(user.shopId, input);
    return NextResponse.json({ shop });
  } catch (error) {
    return toErrorResponse(error);
  }
}
