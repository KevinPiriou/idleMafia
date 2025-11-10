import { describe, it, expect } from "vitest";
import { prestigeGain } from "../prestige";

describe("prestigeGain", () => {
  it("retourne 0 quand le respect est trop faible", () => {
    expect(prestigeGain(0)).toBe(0);
    expect(prestigeGain(2499)).toBe(0);
  });

  it("augmente de façon sous-linéaire (sqrt)", () => {
    expect(prestigeGain(2500)).toBe(1);
    expect(prestigeGain(10000)).toBe(2);
    expect(prestigeGain(40000)).toBe(4);
  });
});
