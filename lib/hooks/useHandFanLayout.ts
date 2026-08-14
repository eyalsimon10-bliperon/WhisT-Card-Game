"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

const ASPECT = 5 / 7;
const MIN_STRIP = 24;
const MIN_CARD_W = 42;
const MAX_STRIP_RATIO = 0.58;

function isLandscapePhone(): boolean {
  return window.matchMedia("(orientation: landscape) and (max-height: 520px)").matches;
}

function computeHandLayout(available: number, count: number, landscape: boolean) {
  const n = Math.max(1, count);
  const width = Math.max(MIN_CARD_W, available - 8);

  if (landscape) {
    const gap = n > 1 ? 3 : 0;
    const maxH = Math.min(window.innerHeight * 0.36, 72);
    const maxW = maxH * ASPECT;
    let cardW = (width - gap * Math.max(0, n - 1)) / n;
    cardW = Math.max(MIN_CARD_W, Math.min(cardW, maxW));
    return {
      cardW,
      cardH: cardW / ASPECT,
      strip: cardW,
      gap,
      spread: true,
    };
  }

  const maxH = Math.min(window.innerHeight * 0.145, 94);
  let cardW = Math.min(maxH * ASPECT, width * 0.22);

  if (n === 1) {
    return { cardW, cardH: cardW / ASPECT, strip: cardW, gap: 0, spread: false };
  }

  const minStrip = Math.min(MIN_STRIP, Math.max(18, (width - MIN_CARD_W) / (n - 1)));
  let strip = (width - cardW) / (n - 1);
  if (strip < minStrip) {
    cardW = Math.max(MIN_CARD_W, width - minStrip * (n - 1));
    strip = (width - cardW) / (n - 1);
  }

  const maxStrip = cardW * MAX_STRIP_RATIO;
  if (strip > maxStrip) {
    strip = maxStrip;
  }

  return {
    cardW,
    cardH: cardW / ASPECT,
    strip: Math.max(minStrip, strip),
    gap: 0,
    spread: false,
  };
}

export function useHandFanLayout(count: number): {
  ref: RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  spread: boolean;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    style: {} as CSSProperties,
    spread: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const landscape = isLandscapePhone();
      const next = computeHandLayout(el.clientWidth, count, landscape);
      setLayout({
        spread: next.spread,
        style: {
          ["--card-hand-w" as string]: `${Math.round(next.cardW * 10) / 10}px`,
          ["--card-hand-h" as string]: `${Math.round(next.cardH * 10) / 10}px`,
          ["--hand-visible-strip" as string]: `${Math.round(next.strip * 10) / 10}px`,
          ["--hand-slot-gap" as string]: `${next.gap}px`,
        },
      });
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [count]);

  return { ref, style: layout.style, spread: layout.spread };
}
