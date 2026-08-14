"use client";

let audioCtx: AudioContext | null = null;
let unlocked = false;
let rustleBuffer: AudioBuffer | null = null;

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

/** iOS/Safari block audio until a user gesture — call on first tap. */
export function unlockCardAudio(): void {
  const ctx = getContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    unlocked = ctx.state === "running";
    if (unlocked) rustleBuffer = rustleBuffer ?? makePinkNoise(ctx, 0.28);
  });
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
      (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08 * envelope;
    b6 = white * 0.115926;
  }
  return buffer;
}

/** Soft paper rustle + light felt tap when a card lands on the table. */
export function playCardSlide(): void {
  const ctx = getContext();
  if (!ctx) return;

  void ctx.resume().then(() => {
    if (ctx.state !== "running") return;
    unlocked = true;
    startSlide(ctx);
  });
}

function startSlide(ctx: AudioContext): void {
  const now = ctx.currentTime;
  rustleBuffer = rustleBuffer ?? makePinkNoise(ctx, 0.28);

  const rustle = ctx.createBufferSource();
  rustle.buffer = rustleBuffer;
  rustle.playbackRate.value = 0.92 + Math.random() * 0.12;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.15;
  band.frequency.setValueAtTime(720, now);
  band.frequency.exponentialRampToValueAtTime(380, now + 0.18);

  const highcut = ctx.createBiquadFilter();
  highcut.type = "lowpass";
  highcut.frequency.value = 1800;
  highcut.Q.value = 0.5;

  const rustleGain = ctx.createGain();
  rustleGain.gain.setValueAtTime(0.0001, now);
  rustleGain.gain.exponentialRampToValueAtTime(0.045, now + 0.03);
  rustleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

  rustle.connect(band);
  band.connect(highcut);
  highcut.connect(rustleGain);
  rustleGain.connect(ctx.destination);
  rustle.start(now);
  rustle.stop(now + 0.22);

  const tapAt = now + 0.09;
  const tap = ctx.createOscillator();
  tap.type = "sine";
  tap.frequency.setValueAtTime(210, tapAt);
  tap.frequency.exponentialRampToValueAtTime(120, tapAt + 0.07);

  const tapFilter = ctx.createBiquadFilter();
  tapFilter.type = "lowpass";
  tapFilter.frequency.value = 420;

  const tapGain = ctx.createGain();
  tapGain.gain.setValueAtTime(0.0001, tapAt);
  tapGain.gain.exponentialRampToValueAtTime(0.018, tapAt + 0.012);
  tapGain.gain.exponentialRampToValueAtTime(0.0001, tapAt + 0.08);

  tap.connect(tapFilter);
  tapFilter.connect(tapGain);
  tapGain.connect(ctx.destination);
  tap.start(tapAt);
  tap.stop(tapAt + 0.09);
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
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

let lastResultKey = "";

/** Short fanfare for the winner, softer descending chime for everyone else. */
export function playMatchResult(didWin: boolean, key: string): void {
  if (lastResultKey === key) return;
  lastResultKey = key;

  const ctx = getContext();
  if (!ctx) return;

  void ctx.resume().then(() => {
    if (ctx.state !== "running") return;
    unlocked = true;
    const now = ctx.currentTime;
    if (didWin) {
      playTone(ctx, 523.25, now, 0.22, 0.045, "triangle");
      playTone(ctx, 659.25, now + 0.11, 0.24, 0.05, "triangle");
      playTone(ctx, 783.99, now + 0.22, 0.28, 0.055, "sine");
      playTone(ctx, 1046.5, now + 0.36, 0.55, 0.06, "sine");
      playTone(ctx, 1318.5, now + 0.36, 0.4, 0.02, "triangle");
    } else {
      playTone(ctx, 392.0, now, 0.28, 0.035, "sine");
      playTone(ctx, 329.63, now + 0.16, 0.32, 0.03, "sine");
      playTone(ctx, 261.63, now + 0.34, 0.48, 0.028, "triangle");
    }
  });
}
