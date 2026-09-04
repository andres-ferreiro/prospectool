import { describe, expect, it } from "vitest";
import { generateDecorativeDots } from "./decorative-dots";

describe("generateDecorativeDots", () => {
  it("returns exactly `count` points", () => {
    const dots = generateDecorativeDots(40, 1);
    expect(dots).toHaveLength(40);
  });

  it("is deterministic for a given seed", () => {
    const a = generateDecorativeDots(40, 7);
    const b = generateDecorativeDots(40, 7);
    expect(a).toEqual(b);
  });

  it("produces different scatters for different seeds", () => {
    const a = generateDecorativeDots(40, 1);
    const b = generateDecorativeDots(40, 2);
    expect(a).not.toEqual(b);
  });

  it("keeps every point within roughly 6km of the CDMX center", () => {
    const CDMX = { lat: 19.4326, lng: -99.1332 };
    const dots = generateDecorativeDots(40, 1);
    for (const { lat, lng } of dots) {
      // ~0.054 degrees latitude is ~6km; longitude at this latitude is
      // close enough to the same scale not to need a cos(lat) correction
      // for a sanity check this loose.
      expect(Math.abs(lat - CDMX.lat)).toBeLessThan(0.06);
      expect(Math.abs(lng - CDMX.lng)).toBeLessThan(0.06);
    }
  });
});
