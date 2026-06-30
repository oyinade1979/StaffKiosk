/**
 * Kiosk audio feedback — generated via Web Audio API (no external files).
 */

function getCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function fadeOut(gain: GainNode, ctx: AudioContext, duration: number) {
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
}

/** Pleasant ascending two-tone chime for successful check-in */
export function playCheckInSound(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const notes = [
    { freq: 523.25, start: 0, dur: 0.25 },   // C5
    { freq: 659.25, start: 0.12, dur: 0.25 }, // E5
    { freq: 783.99, start: 0.24, dur: 0.4 },  // G5
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.05);
  });

  // Warm bell overtone on top of last note
  const bell = ctx.createOscillator();
  const bellGain = ctx.createGain();
  bell.connect(bellGain);
  bellGain.connect(ctx.destination);
  bell.type = "sine";
  bell.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.24); // G6
  bellGain.gain.setValueAtTime(0, ctx.currentTime + 0.24);
  bellGain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.26);
  bellGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
  bell.start(ctx.currentTime + 0.24);
  bell.stop(ctx.currentTime + 0.75);
}

/** Soft descending two-tone tone for check-out */
export function playCheckOutSound(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const notes = [
    { freq: 659.25, start: 0, dur: 0.25 },   // E5
    { freq: 523.25, start: 0.14, dur: 0.4 },  // C5
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.05);
  });
}

/** Short low buzz for unrecognised / error scans */
export function playErrorSound(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(160, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.18);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  fadeOut(gain, ctx, 0.22);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.28);
}

/** Neutral soft click for "already checked out" */
export function playWarningSound(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(350, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}
