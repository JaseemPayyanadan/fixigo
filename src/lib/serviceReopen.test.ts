import { describe, expect, it } from "vitest";

import { buildReopenFields, canReopenService } from "./serviceReopen";

const NOW = new Date(2026, 7, 4, 12, 0, 0);

describe("buildReopenFields", () => {
  it("sets In Progress, reopened flag, reason, timestamp, and first count", () => {
    expect(buildReopenFields("Same issue came back", undefined, NOW, "paid")).toEqual({
      status: "In Progress",
      isReopened: true,
      reopenReason: "Same issue came back",
      reopenedAt: NOW,
      reopenCount: 1,
    });
  });

  it("writes the status as a picker label, not the normalized slug", () => {
    // The details page feeds this straight into a controlled <select> over the
    // display labels; the slug matched no option and left it blank.
    expect(buildReopenFields("Same issue", undefined, NOW, "paid").status).toBe("In Progress");
  });

  it("increments reopenCount on a later reopen", () => {
    expect(buildReopenFields("Came back again", 1, NOW, "paid").reopenCount).toBe(2);
  });

  it("trims the reason", () => {
    expect(buildReopenFields("  not fixed  ", 0, NOW, "paid").reopenReason).toBe("not fixed");
  });

  it("throws when reason is empty or whitespace", () => {
    expect(() => buildReopenFields("   ", undefined, NOW)).toThrow(/reason/i);
    expect(() => buildReopenFields("", undefined, NOW)).toThrow(/reason/i);
  });

  it("leaves an explicit payment status untouched", () => {
    expect(buildReopenFields("again", 0, NOW, "paid").paymentStatus).toBeUndefined();
    expect(buildReopenFields("again", 0, NOW, "pending").paymentStatus).toBeUndefined();
  });

  it("pins payment as paid when the document predates payment tracking", () => {
    // No `paymentStatus` on a completed job reads as paid; moving off completed
    // without writing the flag would silently flip it to unpaid.
    expect(buildReopenFields("again", 0, NOW, undefined).paymentStatus).toBe("paid");
  });
});

describe("canReopenService", () => {
  const completed = { status: "completed", technician_id: "tech-1" };

  it("allows shop_admin and branch_admin on completed jobs", () => {
    expect(canReopenService({ role: "shop_admin", id: "a" }, completed)).toBe(true);
    expect(canReopenService({ role: "branch_admin", id: "a" }, completed)).toBe(true);
  });

  it("allows only the assigned technician", () => {
    expect(canReopenService({ role: "technician", id: "tech-1" }, completed)).toBe(true);
    expect(canReopenService({ role: "technician", id: "other" }, completed)).toBe(false);
  });

  it("resolves assignment when technician_id is a tech doc id linked via userId", () => {
    const technicians = [{ id: "tech-doc-1", userId: "user-9" }];
    const service = { status: "completed", technician_id: "tech-doc-1" };
    expect(canReopenService({ role: "technician", id: "user-9" }, service, technicians)).toBe(true);
    expect(canReopenService({ role: "technician", id: "somebody-else" }, service, technicians)).toBe(
      false
    );
  });

  it("rejects technicians when the job is unassigned", () => {
    expect(
      canReopenService({ role: "technician", id: "tech-1" }, { status: "completed", technician_id: "" })
    ).toBe(false);
  });

  it("rejects non-completed statuses including cancelled", () => {
    expect(canReopenService({ role: "shop_admin", id: "a" }, { status: "cancelled" })).toBe(false);
    expect(canReopenService({ role: "shop_admin", id: "a" }, { status: "in_progress" })).toBe(false);
    expect(canReopenService({ role: "shop_admin", id: "a" }, { status: "Completed" })).toBe(true);
  });

  it("rejects missing user or service", () => {
    expect(canReopenService(null, completed)).toBe(false);
    expect(canReopenService({ role: "shop_admin", id: "a" }, null)).toBe(false);
  });
});
