"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // In local development, unregister any lingering or obsolete service workers from previous projects
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      return;
    }

    // In production, register the WealthOvers offline shell service worker
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("ServiceWorker registration failed:", err);
      });
    });
  }, []);

  return null;
}
