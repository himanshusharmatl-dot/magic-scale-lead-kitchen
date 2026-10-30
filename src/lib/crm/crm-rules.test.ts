import { describe, expect, it } from "vitest";
import { distributeRoundRobin, pickNextExecutive, rotationPool } from "./assignment";
import { duplicateLeadIds, findDuplicateLeads, normalizePhone } from "./phone";
import type { Executive, Lead } from "./types";

const exe = (id: string, name: string, over: Partial<Executive> = {}): Executive => ({
  id, name, email: `${id}@x.test`, phone: "9000000000", role: "Sales Executive", city: "Delhi",
  active: true, inRotation: true, joinedAt: "2026-01-01T00:00:00Z", ...over,
});
const lead = (id: string, phone: string): Lead => ({
  id, phone, customerName: "C", restaurantName: "R", city: "Delhi", cuisine: "Biryani", service: "Swiggy Onboarding",
  source: "Manual", executiveId: null, assignmentMode: null, status: "New", remarks: "",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
});

describe("round robin assignment", () => {
  const pool = rotationPool([exe("c", "Chetan"), exe("a", "Anil"), exe("b", "Bina")]);

  it("gives the next lead to the executive after the last one", () => {
    expect(pickNextExecutive(pool, "a")?.id).toBe("b");
  });

  it("wraps back to the first executive after the last", () => {
    expect(pickNextExecutive(pool, "c")?.id).toBe("a");
  });

  it("skips inactive executives and those removed from the rotation", () => {
    const p = rotationPool([exe("a", "Anil"), exe("b", "Bina", { active: false }), exe("c", "Chetan", { inRotation: false }), exe("d", "Dev")]);
    expect(p.map((e) => e.id)).toEqual(["a", "d"]);
  });

  it("spreads several leads evenly in turn", () => {
    const { assignments, lastAssignedId } = distributeRoundRobin(["l1", "l2", "l3", "l4"], pool, null);
    expect(assignments.map((a) => a.executiveId)).toEqual(["a", "b", "c", "a"]);
    expect(lastAssignedId).toBe("a");
  });

  it("assigns nobody when the rotation is empty", () => {
    expect(pickNextExecutive([], null)).toBeNull();
  });
});

describe("duplicate phone detection", () => {
  it("treats +91, leading 0 and spaced formats as the same number", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("9876543210");
    expect(normalizePhone("098765 43210")).toBe("9876543210");
  });

  it("finds other leads with the same number but not the lead itself", () => {
    const leads = [lead("1", "9876543210"), lead("2", "+91 98765 43210"), lead("3", "9123456789")];
    expect(findDuplicateLeads(leads, "98765 43210", "1").map((l) => l.id)).toEqual(["2"]);
    expect([...duplicateLeadIds(leads)].sort()).toEqual(["1", "2"]);
  });
});
