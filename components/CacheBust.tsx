"use client";

import { useEffect } from "react";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/** Drop stale iOS/Safari document cache after a new deploy, and keep the PWA worker. */
export function CacheBust() {
  useEffect(() => {
    const key = "whist-build";
    const prev = window.localStorage.getItem(key);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    }

    if (prev && prev !== BUILD) {
      window.localStorage.setItem(key, BUILD);
      window.location.reload();
      return;
    }

    if (!prev) window.localStorage.setItem(key, BUILD);
  }, []);

  return null;
}
