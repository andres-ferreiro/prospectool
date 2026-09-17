"use client";

import { useEffect, useSyncExternalStore } from "react";

export const FALLBACK_LOCATION = { lat: 19.4326, lng: -99.1332 }; // Ciudad de México

type Coords = { lat: number; lng: number };
export type LocationStatus = "idle" | "locating" | "granted" | "denied" | "unavailable";

interface LocationState {
  coords: Coords | null;
  status: LocationStatus;
}

// One module-level store shared by every consumer (the map's dot/locate
// button, the onboarding location step) — so the browser permission prompt
// is only ever tied to a single in-flight request, instead of each
// component firing its own getCurrentPosition and re-prompting.
const SERVER_STATE: LocationState = { coords: null, status: "idle" };
let state: LocationState = SERVER_STATE;
let inFlight: Promise<Coords | null> | null = null;
let checkedExistingPermission = false;
const listeners = new Set<() => void>();

function setState(next: LocationState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Triggers the browser prompt if permission hasn't been decided yet — only
// call this from an explicit user action (e.g. "Compartir mi ubicación"),
// never on mount, or the prompt shows up with no context for why.
export function requestCurrentLocation(): Promise<Coords | null> {
  if (state.coords) return Promise.resolve(state.coords);
  if (inFlight) return inFlight;
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    setState({ coords: null, status: "unavailable" });
    return Promise.resolve(null);
  }

  setState({ ...state, status: "locating" });
  inFlight = new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        inFlight = null;
        setState({ coords, status: "granted" });
        resolve(coords);
      },
      (err) => {
        inFlight = null;
        setState({ coords: null, status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" });
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
  return inFlight;
}

// Reads the position silently only when the user already granted
// permission on an earlier visit — the Permissions API lets us check that
// without triggering a prompt.
function readIfAlreadyGranted() {
  if (checkedExistingPermission) return;
  checkedExistingPermission = true;
  navigator.permissions
    ?.query({ name: "geolocation" })
    .then((permission) => {
      if (permission.state === "granted") requestCurrentLocation();
    })
    .catch(() => {
      // Permissions API unsupported — wait for an explicit request instead.
    });
}

export function useCurrentLocation() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);

  useEffect(() => {
    readIfAlreadyGranted();
  }, []);

  return { coords: snapshot.coords, status: snapshot.status, request: requestCurrentLocation };
}
