import { describe, it, expect } from "vitest";
import { xpForLevel } from "../economy";

describe("xpForLevel", () => {
  it("demande plus d'XP à chaque niveau", () => {
    const l1 = xpForLevel(1);
    const l2 = xpForLevel(2);
    const l5 = xpForLevel(5);
    expect(l2).toBeGreaterThan(l1);
    expect(l5).toBeGreaterThan(l2);
  });
});
