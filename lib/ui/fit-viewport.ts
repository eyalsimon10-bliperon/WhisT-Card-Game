"use client";

import { useEffect } from "react";

const DESIGN_SHORT = 390;
const BASE_PX = 16;
const MIN_PX = 13;
const MAX_PX = 18;
const DESKTOP_SHORT = 768;

export function applyFitViewport(): void {
  if (typeof document === "undefined") return;
  const width = document.documentElement.clientWidth;
  const height = window.innerHeight;
  const short = Math.min(width, height);
  const px =
    short >= DESKTOP_SHORT
      ? BASE_PX
      : Math.max(MIN_PX, Math.min(MAX_PX, (short / DESIGN_SHORT) * BASE_PX));
  document.documentElement.style.fontSize = `${Math.round(px * 100) / 100}px`;
}

/** Runs before paint so large system text/zoom does not flash the wrong scale. */
export const VIEWPORT_LOCK_SCRIPT =
  "(function(){var w=document.documentElement.clientWidth,h=window.innerHeight,s=Math.min(w,h);var p=s>=768?16:Math.max(13,Math.min(18,(s/390)*16));document.documentElement.style.fontSize=(Math.round(p*100)/100)+'px';})();";

export function ViewportLock() {
  useEffect(() => {
    applyFitViewport();
    const onFit = () => applyFitViewport();
    window.addEventListener("resize", onFit);
    window.addEventListener("orientationchange", onFit);
    window.visualViewport?.addEventListener("resize", onFit);
    return () => {
      window.removeEventListener("resize", onFit);
      window.removeEventListener("orientationchange", onFit);
      window.visualViewport?.removeEventListener("resize", onFit);
    };
  }, []);

  return null;
}
