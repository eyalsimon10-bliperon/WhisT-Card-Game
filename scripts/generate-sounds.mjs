import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

function writeWav(filePath, samples, sampleRate = 44100) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  fs.writeFileSync(filePath, buf);
}

function noiseBurst(sr, duration, amp, filter = 1) {
  const n = Math.floor(sr * duration);
  const out = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.exp(-t * 8) * (1 - t * 0.3);
    const white = (Math.random() * 2 - 1) * amp;
    prev = prev * (1 - filter) + white * filter;
    out[i] = prev * env;
  }
  return out;
}

function tone(sr, freq, duration, amp, type = 'sine') {
  const n = Math.floor(sr * duration);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 6) * (1 - i / n);
    const phase = 2 * Math.PI * freq * t;
    let v = Math.sin(phase);
    if (type === 'triangle') {
      v = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1;
    }
    out[i] = v * amp * env;
  }
  return out;
}

function concat(...parts) {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function mix(a, b, offset = 0) {
  const len = Math.max(a.length, offset + b.length);
  const out = new Float32Array(len);
  out.set(a, 0);
  for (let i = 0; i < b.length; i++) {
    out[offset + i] = (out[offset + i] || 0) + b[i];
  }
  return out;
}

const sr = 44100;

// Card throw / slide onto table
{
  const whoosh = noiseBurst(sr, 0.12, 0.55, 0.35);
  const tap = noiseBurst(sr, 0.04, 0.35, 0.9);
  const soft = tone(sr, 180, 0.08, 0.08, 'triangle');
  const samples = mix(mix(whoosh, soft, 0), tap, Math.floor(sr * 0.07));
  writeWav(path.join(outDir, 'card-play.wav'), samples, sr);
}

// Trick take / gather cards
{
  const scoop1 = noiseBurst(sr, 0.1, 0.4, 0.4);
  const scoop2 = noiseBurst(sr, 0.09, 0.35, 0.45);
  const scoop3 = noiseBurst(sr, 0.08, 0.3, 0.5);
  const thump = tone(sr, 90, 0.12, 0.2, 'triangle');
  const chime = tone(sr, 520, 0.18, 0.12, 'sine');
  let samples = mix(scoop1, scoop2, Math.floor(sr * 0.05));
  samples = mix(samples, scoop3, Math.floor(sr * 0.1));
  samples = mix(samples, thump, Math.floor(sr * 0.02));
  samples = mix(samples, chime, Math.floor(sr * 0.08));
  writeWav(path.join(outDir, 'trick-take.wav'), samples, sr);
}

console.log('Wrote:', fs.readdirSync(outDir).join(', '));
