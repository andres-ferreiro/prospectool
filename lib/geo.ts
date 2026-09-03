interface LatLng {
  lat: number;
  lng: number;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface BoundsLike {
  getCenter(): LatLng;
  getNorthEast(): LatLng;
}

// DENUE's max radius per call is 5000m; keep a sane floor at 500m.
export function radiusFromBounds(bounds: BoundsLike | null | undefined, fallback = 1500): number {
  if (!bounds) return fallback;
  const meters = haversineMeters(bounds.getCenter(), bounds.getNorthEast());
  return Math.min(5000, Math.max(500, Math.round(meters)));
}
