// A small linear congruential generator — deterministic and dependency-free,
// unlike Math.random(), so the same seed always produces the same scatter
// (no dots "jumping" between renders/hydration).
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CDMX_CENTER = { lat: 19.4326, lng: -99.1332 };
// ~0.05 degrees is roughly 5-6km at this latitude — enough spread to fill
// a map tile at zoom 12 without dots drifting off past the visible area.
const SPREAD_DEGREES = 0.05;

export function generateDecorativeDots(count: number, seed: number): { lat: number; lng: number }[] {
  const random = mulberry32(seed);
  const dots: { lat: number; lng: number }[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      lat: CDMX_CENTER.lat + (random() - 0.5) * 2 * SPREAD_DEGREES,
      lng: CDMX_CENTER.lng + (random() - 0.5) * 2 * SPREAD_DEGREES,
    });
  }
  return dots;
}
