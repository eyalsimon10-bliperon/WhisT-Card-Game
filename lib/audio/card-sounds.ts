"use client";

let audioCtx: AudioContext | null = null;
let unlocked = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new Ctor();
  }
  return audioCtx;
}

/** iOS/Safari block audio until a user gesture — call on first tap. */
export function unlockCardAudio(): void {
  const ctx = getContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    unlocked = ctx.state === "running";
  });
}

function makeNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  return buffer;
}

/** Short felt-slide + soft land — plays when a card is thrown to the table. */
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
  const slideDur = 0.2 + Math.random() * 0.05;
  const startFreq = 1600 + Math.random() * 500;
  const endFreq = 380 + Math.random() * 80;

  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, slideDur);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.85;
  filter.frequency.setValueAtTime(startFreq, now);
  filter.frequency.exponentialRampToValueAtTime(endFreq, now + slideDur);

  const slideGain = ctx.createGain();
  slideGain.gain.setValueAtTime(0.0001, now);
  slideGain.gain.exponentialRampToValueAtTime(0.16, now + 0.018);
  slideGain.gain.exponentialRampToValueAtTime(0.0001, now + slideDur);

  noise.connect(filter);
  filter.connect(slideGain);
  slideGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + slideDur + 0.02);

  const landAt = now + slideDur * 0.55;
  const thud = ctx.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(150, landAt);
  thud.frequency.exponentialRampToValueAtTime(68, landAt + 0.1);

  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.0001, landAt);
  thudGain.gain.exponentialRampToValueAtTime(0.07, landAt + 0.012);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, landAt + 0.11);

  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(landAt);
  thud.stop(landAt + 0.12);
}
