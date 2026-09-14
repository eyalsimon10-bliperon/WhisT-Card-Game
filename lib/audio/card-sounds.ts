"use client";

let audioCtx: AudioContext | null = null;
let rustleBuffer: AudioBuffer | null = null;
let lastSlideAt = 0;
let lastSlideKey = "";
let lastTrickTakeKey = "";
let listenersBound = false;

const SOUND_PLAY = "/sounds/card-play.wav?v=2";
const SOUND_TRICK = "/sounds/trick-take.wav";

const htmlAudioCache = new Map<string, HTMLAudioElement>();

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new Ctor();
    rustleBuffer = null;
  }
  return audioCtx;
}

function bindUnlockListeners(): void {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  const arm = () => unlockCardAudio();
  window.addEventListener("pointerdown", arm, { capture: true });
  window.addEventListener("touchstart", arm, { capture: true, passive: true });
}

function whenRunning(ctx: AudioContext, play: () => void): void {
  if (ctx.state === "running") {
    play();
    return;
  }
  void ctx.resume().then(() => {
    if (ctx.state === "running") play();
  });
}

function playSoundFile(url: string, volume: number, onFail: () => void): void {
  if (typeof window === "undefined") {
    onFail();
    return;
  }
  try {
    let audio = htmlAudioCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      audio.preload = "auto";
      htmlAudioCache.set(url, audio);
    }
    audio.volume = volume;
    audio.currentTime = 0;
    const result = audio.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => onFail());
    }
  } catch {
    onFail();
  }
}

function preloadSounds(): void {
  if (typeof window === "undefined") return;
  for (const url of [SOUND_PLAY, SOUND_TRICK]) {
    if (htmlAudioCache.has(url)) continue;
    const audio = new Audio(url);
    audio.preload = "auto";
    htmlAudioCache.set(url, audio);
  }
}

/** iOS/Safari block audio until a user gesture — call on taps, not only once. */
export function unlockCardAudio(): void {
  bindUnlockListeners();
  preloadSounds();
  const ctx = getContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    if (ctx.state !== "running") return;
    rustleBuffer = rustleBuffer ?? makePinkNoise(ctx, 0.12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  });
}

if (typeof window !== "undefined") {
  bindUnlockListeners();
  preloadSounds();
}

function makePinkNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const envelope = Math.sin((Math.PI * i) / length);
    data[i] =
      (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.16 * envelope;
    b6 = white * 0.115926;
  }
  return buffer;
}

/** Soft paper rustle + light felt tap when a card lands on the table. */
export function playCardSlide(key?: string): void {
  bindUnlockListeners();

  if (key) {
    if (key === lastSlideKey) return;
    lastSlideKey = key;
  } else {
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (nowMs - lastSlideAt < 90) return;
    lastSlideAt = nowMs;
  }

  playSoundFile(SOUND_PLAY, 0.78, () => {
    const ctx = getContext();
    if (!ctx) return;
    whenRunning(ctx, () => startSlide(ctx));
  });
}

function startSlide(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime;
    rustleBuffer = rustleBuffer ?? makePinkNoise(ctx, 0.12);

    const rustle = ctx.createBufferSource();
    rustle.buffer = rustleBuffer;
    rustle.playbackRate.value = 1.15 + Math.random() * 0.12;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.85;
    band.frequency.setValueAtTime(1400, now);
    band.frequency.exponentialRampToValueAtTime(780, now + 0.07);

    const highcut = ctx.createBiquadFilter();
    highcut.type = "highpass";
    highcut.frequency.value = 280;
    highcut.Q.value = 0.4;

    const air = ctx.createBiquadFilter();
    air.type = "lowpass";
    air.frequency.value = 4200;
    air.Q.value = 0.35;

    const rustleGain = ctx.createGain();
    rustleGain.gain.setValueAtTime(0.001, now);
    rustleGain.gain.exponentialRampToValueAtTime(0.11, now + 0.008);
    rustleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    rustle.connect(band);
    band.connect(highcut);
    highcut.connect(air);
    air.connect(rustleGain);
    rustleGain.connect(ctx.destination);
    rustle.start(now);
    rustle.stop(now + 0.1);

    // Light edge tick — dealer flick, not a heavy table slam.
    const tickAt = now + 0.006;
    const tick = ctx.createOscillator();
    tick.type = "sine";
    tick.frequency.setValueAtTime(2100, tickAt);
    tick.frequency.exponentialRampToValueAtTime(900, tickAt + 0.035);

    const tickFilter = ctx.createBiquadFilter();
    tickFilter.type = "bandpass";
    tickFilter.frequency.value = 1600;
    tickFilter.Q.value = 1.1;

    const tickGain = ctx.createGain();
    tickGain.gain.setValueAtTime(0.001, tickAt);
    tickGain.gain.exponentialRampToValueAtTime(0.055, tickAt + 0.005);
    tickGain.gain.exponentialRampToValueAtTime(0.001, tickAt + 0.04);

    tick.connect(tickFilter);
    tickFilter.connect(tickGain);
    tickGain.connect(ctx.destination);
    tick.start(tickAt);
    tick.stop(tickAt + 0.045);

    const kissAt = now + 0.022;
    const kiss = ctx.createOscillator();
    kiss.type = "triangle";
    kiss.frequency.setValueAtTime(380, kissAt);
    kiss.frequency.exponentialRampToValueAtTime(160, kissAt + 0.05);

    const kissFilter = ctx.createBiquadFilter();
    kissFilter.type = "lowpass";
    kissFilter.frequency.value = 900;

    const kissGain = ctx.createGain();
    kissGain.gain.setValueAtTime(0.001, kissAt);
    kissGain.gain.exponentialRampToValueAtTime(0.035, kissAt + 0.008);
    kissGain.gain.exponentialRampToValueAtTime(0.001, kissAt + 0.055);

    kiss.connect(kissFilter);
    kissFilter.connect(kissGain);
    kissGain.connect(ctx.destination);
    kiss.start(kissAt);
    kiss.stop(kissAt + 0.06);
  } catch {
    /* ignore audio graph errors on restricted browsers */
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType = "sine"
): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(2800, freq * 4);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Scoop / gather sound when a trick is won and taken. */
export function playTrickTake(key?: string): void {
  bindUnlockListeners();
  if (key) {
    if (key === lastTrickTakeKey) return;
    lastTrickTakeKey = key;
  }

  playSoundFile(SOUND_TRICK, 0.88, () => {
    const ctx = getContext();
    if (!ctx) return;
    whenRunning(ctx, () => {
      try {
        const now = ctx.currentTime;
        rustleBuffer = rustleBuffer ?? makePinkNoise(ctx, 0.22);

        for (let i = 0; i < 3; i++) {
          const src = ctx.createBufferSource();
          src.buffer = rustleBuffer;
          src.playbackRate.value = 1.05 + i * 0.08;
          const gain = ctx.createGain();
          const t = now + i * 0.045;
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.exponentialRampToValueAtTime(0.14 - i * 0.02, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 700 - i * 80;
          filter.Q.value = 0.8;
          src.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          src.start(t);
          src.stop(t + 0.14);
        }
        playTone(ctx, 520, now + 0.08, 0.18, 0.09, "sine");
        playTone(ctx, 90, now + 0.02, 0.12, 0.08, "triangle");
      } catch {
        /* ignore */
      }
    });
  });
}

let lastResultKey = "";

/** Short fanfare for the winner, softer descending chime for everyone else. */
export function playMatchResult(didWin: boolean, key: string): void {
  bindUnlockListeners();
  if (lastResultKey === key) return;
  lastResultKey = key;

  const ctx = getContext();
  if (!ctx) return;

  whenRunning(ctx, () => {
    try {
      const now = ctx.currentTime;
      if (didWin) {
        playTone(ctx, 523.25, now, 0.22, 0.12, "triangle");
        playTone(ctx, 659.25, now + 0.11, 0.24, 0.13, "triangle");
        playTone(ctx, 783.99, now + 0.22, 0.28, 0.14, "sine");
        playTone(ctx, 1046.5, now + 0.36, 0.55, 0.16, "sine");
        playTone(ctx, 1318.5, now + 0.36, 0.4, 0.05, "triangle");
      } else {
        playTone(ctx, 392.0, now, 0.28, 0.1, "sine");
        playTone(ctx, 329.63, now + 0.16, 0.32, 0.09, "sine");
        playTone(ctx, 261.63, now + 0.34, 0.48, 0.08, "triangle");
      }
    } catch {
      /* ignore audio graph errors on restricted browsers */
    }
  });
}
