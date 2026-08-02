import { describe, expect, it } from "vitest";

import { resolveServiceRows } from "./serviceTableRows";

const service = {
  id: "s1",
  branchId: "b1",
  technician_id: "t1",
};

describe("resolveServiceRows", () => {
  it("resolves the branch name for a row", () => {
    const [row] = resolveServiceRows([service], [{ id: "b1", name: "KR NEW" }], []);
    expect(row.branchName).toBe("KR NEW");
  });

  it("falls back to a dash for a branch that is not in the list", () => {
    const [row] = resolveServiceRows([service], [{ id: "other", name: "KR OLD" }], []);
    expect(row.branchName).toBe("—");
  });

  it("falls back to a dash when the branch document carries no name", () => {
    const [row] = resolveServiceRows([service], [{ id: "b1", name: "" }], []);
    expect(row.branchName).toBe("—");
  });

  // The whole reason this runs outside the table: TanStack builds its row model
  // once per `data` identity and caches every accessor result on the row, so a
  // branch list that arrives after the services did would otherwise keep
  // rendering the dash it cached on the first pass. Returning a fresh array
  // whenever the lookups change is what forces that row model to be rebuilt.
  it("returns a new array identity when the branches change", () => {
    const services = [service];
    const first = resolveServiceRows(services, [], []);
    const second = resolveServiceRows(services, [{ id: "b1", name: "KR NEW" }], []);

    expect(first).not.toBe(second);
    expect(first[0].branchName).toBe("—");
    expect(second[0].branchName).toBe("KR NEW");
  });

  it("resolves a technician by document id and by user id", () => {
    const byDoc = resolveServiceRows([service], [], [{ id: "t1", name: "Nijin" }]);
    const byUser = resolveServiceRows([service], [], [{ id: "other", name: "Nijin", userId: "t1" }]);

    expect(byDoc[0].technicianName).toBe("Nijin");
    expect(byUser[0].technicianName).toBe("Nijin");
  });

  it("reads an unset technician as unassigned and an unknown one as a dash", () => {
    const [unassigned] = resolveServiceRows([{ ...service, technician_id: "" }], [], []);
    const [unknown] = resolveServiceRows([service], [], []);

    expect(unassigned.technicianName).toBe("Unassigned");
    expect(unknown.technicianName).toBe("—");
  });

  it("keeps the original row fields", () => {
    const [row] = resolveServiceRows([{ ...service, name: "Screen replacement" }], [], []);
    expect(row.name).toBe("Screen replacement");
    expect(row.id).toBe("s1");
  });
});
