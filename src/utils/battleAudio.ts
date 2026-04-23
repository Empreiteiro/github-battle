// WC2-style sword-clash sound effects synthesized via Web Audio API.
// Stays offline, ships no binary assets, and avoids licensing issues.

let ctx: AudioContext | null = null;
let lastClashAt = 0;
const MIN_INTERVAL_MS = 70;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function unlockAudio(): void {
  getCtx();
}

export function playSwordClash(volume = 0.45): void {
  const now = performance.now();
  if (now - lastClashAt < MIN_INTERVAL_MS) return;
  lastClashAt = now;

  const audioCtx = getCtx();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  const noiseDur = 0.28;

  // Metallic scrape: short band-passed noise burst with fast decay.
  const bufferSize = Math.floor(audioCtx.sampleRate * noiseDur);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const envelope = Math.pow(1 - i / bufferSize, 1.8);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3200 + Math.random() * 1800;
  bp.Q.value = 2.5;

  const nGain = audioCtx.createGain();
  nGain.gain.setValueAtTime(volume * 0.7, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + noiseDur);

  noise.connect(bp).connect(nGain).connect(audioCtx.destination);
  noise.start(t);
  noise.stop(t + noiseDur);

  // Metallic ring: triangle tone sliding down for the sword "shing".
  const osc = audioCtx.createOscillator();
  osc.type = 'triangle';
  const startFreq = 850 + Math.random() * 450;
  osc.frequency.setValueAtTime(startFreq, t);
  osc.frequency.exponentialRampToValueAtTime(startFreq * 0.35, t + 0.2);

  const oGain = audioCtx.createGain();
  oGain.gain.setValueAtTime(volume * 0.22, t);
  oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

  osc.connect(oGain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.22);
}
