"use client";

import { useEffect } from "react";

// Registered from the root layout so the app shell (static assets +
// offline fallback) is available even without a connection. Skipped
// outside production/HTTPS contexts since `serviceWorker` isn't exposed
// on insecure origins other than localhost.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("No se pudo registrar el service worker:", err);
    });
  }, []);

  return null;
}
