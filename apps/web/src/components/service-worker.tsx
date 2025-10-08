"use client"

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if ("serviceWorker" in navigator) {
      const register = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");
          const handleWaiting = () => {
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          };

          handleWaiting();
          registration.addEventListener("updatefound", handleWaiting);
        } catch (error) {
          console.error("Service worker registration failed", error);
        }
      };

      register();
    }
  }, []);

  return null;
}

