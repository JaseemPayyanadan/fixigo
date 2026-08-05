import { ApiError } from "@/lib/apiAuth";

export interface CreateTechnicianInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  branchId: string;
  experience?: number;
}

export interface UpdateTechnicianInput {
  name?: string;
  email?: string;
  phone?: string;
  branchId?: string;
  status?: "active" | "inactive";
  experience?: number;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, `${field} is required`);
  }
  return value.trim();
}

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "Request body must be an object");
  }
  return body as Record<string, unknown>;
}

function parseExperience(raw: Record<string, unknown>): number | undefined {
  if (raw.experience === undefined || raw.experience === null || raw.experience === "") {
    return undefined;
  }
  const experience = Number(raw.experience);
  if (!Number.isFinite(experience) || experience < 0) {
    throw new ApiError(400, "experience must be a non-negative number");
  }
  return experience;
}

export function parseCreateInput(body: unknown): CreateTechnicianInput {
  const raw = asObject(body);

  const email = requireString(raw, "email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "A valid email address is required");
  }

  const password = requireString(raw, "password");
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  // shopId and role are intentionally not read from the body.
  return {
    name: requireString(raw, "name"),
    email,
    phone: requireString(raw, "phone"),
    password,
    branchId: requireString(raw, "branchId"),
    experience: parseExperience(raw),
  };
}

export function parseUpdateInput(body: unknown): UpdateTechnicianInput {
  const raw = asObject(body);
  const update: UpdateTechnicianInput = {};

  if (raw.name !== undefined) update.name = requireString(raw, "name");
  if (raw.phone !== undefined) update.phone = requireString(raw, "phone");
  if (raw.branchId !== undefined) update.branchId = requireString(raw, "branchId");

  if (raw.email !== undefined) {
    const email = requireString(raw, "email").toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw new ApiError(400, "A valid email address is required");
    }
    update.email = email;
  }

  if (raw.status !== undefined) {
    if (raw.status !== "active" && raw.status !== "inactive") {
      throw new ApiError(400, "status must be 'active' or 'inactive'");
    }
    update.status = raw.status;
  }

  if (raw.experience !== undefined) {
    const experience = parseExperience(raw);
    if (experience !== undefined) update.experience = experience;
  }

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, "No updatable fields supplied");
  }

  return update;
}
