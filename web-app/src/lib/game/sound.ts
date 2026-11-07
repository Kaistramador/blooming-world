/* ============================================================
 * Bloom Match — tiny WebAudio synth (no assets).
 * ============================================================ */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean): void {
  enabled = v;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, delay = 0): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  click(): void {
    tone(520, 0.06, 'triangle', 0.05);
  },
  swap(): void {
    tone(320, 0.08, 'sine', 0.05);
  },
  match(cascade: number): void {
    const base = 440 * Math.pow(1.12, Math.min(cascade, 8));
    tone(base, 0.09, 'triangle', 0.07);
    tone(base * 1.5, 0.09, 'sine', 0.04, 0.03);
  },
  boom(): void {
    tone(120, 0.25, 'sawtooth', 0.09);
    tone(80, 0.3, 'square', 0.05, 0.02);
  },
  special(): void {
    tone(660, 0.12, 'triangle', 0.07);
    tone(880, 0.12, 'triangle', 0.06, 0.06);
    tone(1100, 0.14, 'sine', 0.05, 0.12);
  },
  coin(): void {
    tone(880, 0.07, 'square', 0.05);
    tone(1320, 0.1, 'square', 0.05, 0.06);
  },
  win(): void {
    tone(523, 0.14, 'triangle', 0.08);
    tone(659, 0.14, 'triangle', 0.08, 0.12);
    tone(784, 0.2, 'triangle', 0.08, 0.24);
    tone(1047, 0.3, 'sine', 0.07, 0.4);
  },
  lose(): void {
    tone(330, 0.2, 'sine', 0.07);
    tone(262, 0.25, 'sine', 0.07, 0.15);
    tone(196, 0.35, 'sine', 0.06, 0.3);
  },
  star(n: number): void {
    tone(700 + n * 200, 0.15, 'triangle', 0.08);
  },
};
