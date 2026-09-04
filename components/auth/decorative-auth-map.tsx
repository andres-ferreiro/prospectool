"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import MapGL, { Marker } from "react-map-gl/mapbox";
import { BusinessPin } from "@/components/map-view/business-pin";
import { generateDecorativeDots } from "@/lib/auth/decorative-dots";

const CDMX_CENTER = { lat: 19.4326, lng: -99.1332 };
const DOT_COUNT = 40;
const DOT_SEED = 42;

export function DecorativeAuthMap() {
  const { resolvedTheme } = useTheme();
  // Stable across re-renders (theme toggles, parent resizes) so the dots
  // never visibly "jump" — only computed once per mount.
  const dots = useMemo(() => generateDecorativeDots(DOT_COUNT, DOT_SEED), []);

  return (
    <MapGL
      initialViewState={{ latitude: CDMX_CENTER.lat, longitude: CDMX_CENTER.lng, zoom: 12 }}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      mapStyle={resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
      style={{ width: "100%", height: "100%" }}
      interactive={false}
      dragPan={false}
      dragRotate={false}
      scrollZoom={false}
      doubleClickZoom={false}
      touchZoomRotate={false}
      touchPitch={false}
      keyboard={false}
      attributionControl={false}
    >
      {dots.map((dot, i) => (
        <Marker key={i} latitude={dot.lat} longitude={dot.lng}>
          <BusinessPin />
        </Marker>
      ))}
    </MapGL>
  );
}
