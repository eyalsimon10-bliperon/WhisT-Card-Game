"use client";

import { useEffect } from "react";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/** Drop stale iOS/Safari document cache after a new deploy. */
export function CacheBust() {
  useEffect(() => {
    const key = "whist-build";
    const prev = window.localStorage.getItem(key);

    void navigator.serviceWorker?.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister();
    });

    if (prev && prev !== BUILD) {
      window.localStorage.setItem(key, BUILD);
      window.location.reload();
      return;
    }

    if (!prev) window.localStorage.setItem(key, BUILD);
  }, []);

  return null;
}
