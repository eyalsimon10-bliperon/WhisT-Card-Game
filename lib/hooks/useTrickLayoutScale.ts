"use client";

import { useEffect, useState } from "react";

/** Scales trick-card fly/collect offsets for smaller phone viewports. */
export function useTrickLayoutScale(): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      const landscape = window.matchMedia("(orientation: landscape) and (max-height: 520px)").matches;
      const portraitPhone = window.matchMedia("(orientation: portrait) and (max-width: 640px)").matches;
      if (landscape) setScale(0.62);
      else if (portraitPhone) setScale(0.82);
      else setScale(1);
    }

    update();
    const landscapeMq = window.matchMedia("(orientation: landscape) and (max-height: 520px)");
    const portraitMq = window.matchMedia("(orientation: portrait) and (max-width: 640px)");
    landscapeMq.addEventListener("change", update);
    portraitMq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      landscapeMq.removeEventListener("change", update);
      portraitMq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return scale;
}

export function scalePx(value: number, scale: number): string {
  return `${Math.round(value * scale)}px`;
}
