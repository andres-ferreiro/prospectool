"use client";

import { useEffect, useState } from "react";

const FALLBACK_LOCATION = { lat: 19.4326, lng: -99.1332 }; // Ciudad de México

export function useCurrentLocation() {
  const [location, setLocation] = useState(FALLBACK_LOCATION);
  const [resolved, setResolved] = useState(false);
  // True only once we have a real GPS fix, as opposed to the fallback.
  const [isPrecise, setIsPrecise] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      const timer = setTimeout(() => setResolved(true), 0);
      return () => clearTimeout(timer);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsPrecise(true);
        setResolved(true);
      },
      () => setResolved(true),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  return { location, resolved, isPrecise };
}
