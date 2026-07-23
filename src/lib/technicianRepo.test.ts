import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: {},
  FieldValue: { arrayUnion: vi.fn(), arrayRemove: vi.fn() },
}));

const { mapTechnician } = await import("@/lib/technicianRepo");

function timestamp(date: Date) {
  return { toDate: () => date };
}

describe("mapTechnician", () => {
  it("maps a fully populated document", () => {
    const created = new Date(2026, 0, 2);
    const result = mapTechnician("t1", {
      name: "Fasna",
      email: "fasna@example.com",
      phone: "999",
      role: "technician",
      shopId: "shop-1",
      branchId: "branch-1",
      userId: "u9",
      skills: ["screen"],
      status: "active",
      createdAt: timestamp(created),
      updatedAt: timestamp(created),
    });

    expect(result.id).toBe("t1");
    expect(result.name).toBe("Fasna");
    expect(result.skills).toEqual(["screen"]);
    expect(result.createdAt).toEqual(created);
  });

  it("defaults missing scalar fields rather than emitting undefined", () => {
    const result = mapTechnician("t2", {});
    expect(result.name).toBe("");
    expect(result.status).toBe("active");
    expect(result.role).toBe("technician");
    expect(result.skills).toEqual([]);
  });

  it("falls back to a Date when timestamps are absent", () => {
    expect(mapTechnician("t3", {}).createdAt).toBeInstanceOf(Date);
  });

  it("passes through a raw Date without calling toDate", () => {
    const created = new Date(2026, 5, 5);
    expect(mapTechnician("t4", { createdAt: created }).createdAt).toEqual(created);
  });
});
