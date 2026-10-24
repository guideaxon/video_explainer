/**
 * Papercut score engine. A project declares a chord progression per scene (see templates/papercut_video/score.ts);
 * `buildScore` turns it into fixed, seeded events and `Music` synthesises them with Web Audio: warm pads, plucked
 * arpeggios, glassy bells, optional storm (rain, thunder, timpani). No audio files. Events are deterministic so the
 * music always lines up with the picture, including after seeks and loops.
 */
import { rng } from "./paper";

export type Ev = { t: number; k: "pad" | "bass" | "pluck" | "bell" | "kick" | "thunder" | "rain"; m?: number; d?: number; v?: number };

export const MAJ = [0, 4, 7, 11];
export const MIN = [0, 3, 7, 10];
export const DOM = [0, 4, 7, 10];
export const BAR = 3; // seconds per bar (80 bpm, 4/4)
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export type ScoreSpec = {
  /** per scene: bars as [root midi note, chord intervals] */
  prog: [number, number[]][][];
  /** per scene: chance (0..1) of each arpeggio pluck */
  pluck: number[];
  /** per scene: chance (0..1) of a bell on each half-beat slot */
  bell: number[];
  /** scene indices that get timpani hits */
  drums?: number[];
  /** extra events, e.g. { t: 38.4, k: "thunder", d: 3.5 } */
  extras?: Ev[];
  seed?: number;
  /** a rising chime run at the very end: [start seconds, midi notes] */
  finale?: [number, number[]];
};

export const buildScore = (s: ScoreSpec): Ev[] => {
  const r = rng(s.seed ?? 42);
  const ev: Ev[] = [];
  let t0 = 0;
  const lastScene = s.prog.length - 1;
  s.prog.forEach((bars, si) => {
    bars.forEach(([root, q], b) => {
      const last = si === lastScene && b === bars.length - 1;
      const dur = last ? 7 : BAR + 0.6;
      for (const iv of q.slice(0, 3)) ev.push({ t: t0, k: "pad", m: root + 12 + iv, d: dur, v: 0.5 });
      ev.push({ t: t0, k: "bass", m: root - 12, d: BAR * 0.95, v: 0.8 });
      ev.push({ t: t0 + BAR / 2, k: "bass", m: root - 5, d: 1.0, v: 0.35 });
      const tones = [...q, q[0] + 12, q[1] + 12];
      for (let i = 0; i < 8; i++) {
        if (r() < s.pluck[si]) {
          const idx = [0, 1, 2, 3, 4, 3, 2, 1][i];
          ev.push({ t: t0 + i * (BAR / 8), k: "pluck", m: root + 24 + tones[idx % tones.length], d: 1.1, v: i % 4 === 0 ? 0.55 : 0.35 });
        }
      }
      for (let i = 0; i < 4; i++) {
        if (r() < s.bell[si]) {
          const pick = tones[Math.floor(r() * tones.length)];
          ev.push({ t: t0 + i * 0.75 + (r() < 0.5 ? 0 : 0.375), k: "bell", m: root + 36 + pick, d: 3.2, v: 0.28 });
        }
      }
      if (s.drums?.includes(si)) {
        ev.push({ t: t0, k: "kick", v: 1 });
        ev.push({ t: t0 + 1.5, k: "kick", v: 0.7 });
        ev.push({ t: t0 + 2.25, k: "kick", v: 0.5 });
      }
      t0 += BAR;
    });
  });
  // guiding-star chime at the head of every scene
  let st = 0;
  s.prog.forEach((bars) => {
    ev.push({ t: st + 0.1, k: "bell", m: bars[0][0] + 48, d: 4, v: 0.35 });
    st += bars.length * BAR;
  });
  if (s.finale) s.finale[1].forEach((m, i) => ev.push({ t: s.finale![0] + i * 0.5, k: "bell", m, d: 5, v: 0.4 }));
  ev.push(...(s.extras ?? []));
  return ev.sort((a, b) => a.t - b.t);
};

export class Music {
  private ctx: BaseAudioContext;
  private master: GainNode;
  private rev: ConvolverNode;
  private noise: AudioBuffer;
  private idx = 0;
  private session: GainNode | null = null;
  private fx: GainNode;
  private duck: GainNode; // scored music only (not clicks): lowered under the voice
  private an: AnalyserNode;
  private buf: Uint8Array<ArrayBuffer>;
  private lv = 0;
  private anchor = { film: 0, ctx: 0 };
  readonly total: number;

  constructor(ctx: BaseAudioContext, private events: Ev[], totalSeconds: number) {
    this.ctx = ctx;
    this.total = totalSeconds;
    this.master = ctx.createGain();
    this.master.gain.value = 1.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.an = ctx.createAnalyser();
    this.an.fftSize = 512;
    this.master.connect(this.an);
    this.buf = new Uint8Array(this.an.fftSize);
    this.duck = ctx.createGain();
    this.duck.connect(this.master);
    const len = Math.floor(ctx.sampleRate * 3);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    const rr = rng(9);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (rr() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.rev = ctx.createConvolver();
    this.rev.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.rev.connect(wet).connect(this.duck);
    this.fx = ctx.createGain(); // click sounds: independent of the film's play/pause session
    this.fx.connect(this.master);
    this.fx.connect(this.rev);
    const nl = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, nl, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    const nr = rng(5);
    for (let i = 0; i < nl; i++) nd[i] = nr() * 2 - 1;
  }

  /** Live loudness 0..1 (smoothed), for visuals that pulse with the music. */
  level() {
    this.an.getByteTimeDomainData(this.buf);
    let s = 0;
    for (const b of this.buf) s += ((b - 128) / 128) ** 2;
    const rms = Math.sqrt(s / this.buf.length);
    this.lv = Math.max(Math.min(1, rms * 5), this.lv * 0.9);
    return this.lv;
  }

  /** A short musical reaction to clicking the star, the fox or a flower (note 0..4 = pentatonic degree). */
  poke(kind: "star" | "fox" | "flower", note = 0) {
    const t = this.ctx.currentTime;
    const PENT = [72, 74, 76, 79, 81];
    if (kind === "star") [84, 88, 91, 96].forEach((m, i) => this.play({ t, k: "bell", m, d: 3.5, v: 0.6 }, t + i * 0.09, this.fx));
    else if (kind === "fox") [67, 72, 76].forEach((m, i) => this.play({ t, k: "pluck", m, d: 0.8, v: 1 }, t + i * 0.1, this.fx));
    else {
      this.play({ t, k: "bell", m: PENT[note % 5], d: 3, v: 0.7 }, t, this.fx);
      this.play({ t, k: "pluck", m: PENT[note % 5] - 12, d: 0.9, v: 0.6 }, t, this.fx);
    }
  }

  /** Music gain under the voice (1 = none; see `duckAt` in voice.ts). */
  setDuck(g: number) {
    this.duck.gain.setTargetAtTime(g, this.ctx.currentTime, 0.05);
  }

  setMuted(m: boolean) {
    this.master.gain.setTargetAtTime(m ? 0 : 1.5, this.ctx.currentTime, 0.05);
  }

  /** Begin (or re-begin after a seek) at film time `film` seconds. */
  start(film: number) {
    this.stop();
    const s = (this.session = this.ctx.createGain());
    s.connect(this.duck);
    s.connect(this.rev);
    const now = this.ctx.currentTime;
    this.anchor = { film, ctx: now };
    this.idx = this.events.findIndex((e) => e.t >= film - 0.01);
    if (this.idx < 0) this.idx = this.events.length;
    const g = s.gain;
    const fo = this.total - 3;
    g.setValueAtTime(0, now);
    g.linearRampToValueAtTime(1, now + (film < 1.5 ? 1.5 - film : 0.15));
    if (film < fo) g.setValueAtTime(1, now + fo - film);
    g.linearRampToValueAtTime(0, now + Math.max(0.2, this.total - film));
  }

  stop() {
    const s = this.session;
    if (!s) return;
    const now = this.ctx.currentTime;
    s.gain.cancelScheduledValues(now);
    s.gain.setTargetAtTime(0, now, 0.04);
    setTimeout(() => { try { s.disconnect(); } catch { /* already gone */ } }, 400);
    this.session = null;
  }

  /** Call ~10x/s with the film time; schedules notes 0.6 s ahead and re-syncs after seeks and loops. */
  tick(film: number) {
    if (!this.session) return this.start(film);
    const expect = this.anchor.film + (this.ctx.currentTime - this.anchor.ctx);
    if (Math.abs(film - expect) > 0.35) return this.start(film);
    while (this.idx < this.events.length && this.events[this.idx].t < film + 0.6) {
      const e = this.events[this.idx++];
      this.play(e, this.ctx.currentTime + Math.max(0, e.t - film));
    }
  }

  /** Offline rendering: schedule the whole score at once (OfflineAudioContext). */
  scheduleAll() {
    this.start(0);
    this.session!.gain.cancelScheduledValues(0);
    const g = this.session!.gain;
    g.setValueAtTime(0, 0);
    g.linearRampToValueAtTime(1, 1.5);
    g.setValueAtTime(1, this.total - 3);
    g.linearRampToValueAtTime(0, this.total);
    for (const e of this.events) this.play(e, e.t);
  }

  private env(g: GainNode, when: number, peak: number, att: number, dur: number) {
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + att);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  }

  private play(e: Ev, when: number, dest?: GainNode) {
    const c = this.ctx;
    const out = dest ?? this.session!;
    const v = e.v ?? 1;
    const d = e.d ?? 1;
    if (e.k === "pad") {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1100;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.05 * v, when + 1.1);
      g.gain.setValueAtTime(0.05 * v, when + d - 1);
      g.gain.linearRampToValueAtTime(0.0001, when + d);
      f.connect(g).connect(out);
      for (const det of [-7, 7]) {
        const o = c.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = hz(e.m!);
        o.detune.value = det;
        o.connect(f);
        o.start(when);
        o.stop(when + d + 0.05);
      }
    } else if (e.k === "bass") {
      const o = c.createOscillator();
      o.frequency.value = hz(e.m!);
      const g = c.createGain();
      this.env(g, when, 0.28 * v, 0.04, d);
      o.connect(g).connect(out);
      o.start(when);
      o.stop(when + d + 0.05);
    } else if (e.k === "pluck") {
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = hz(e.m!);
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(3600, when);
      f.frequency.exponentialRampToValueAtTime(700, when + 0.5);
      const g = c.createGain();
      this.env(g, when, 0.16 * v, 0.006, d);
      o.connect(f).connect(g).connect(out);
      o.start(when);
      o.stop(when + d + 0.05);
    } else if (e.k === "bell") {
      for (const [mul, amp] of [[1, 1], [2.76, 0.25], [5.4, 0.08]]) {
        const o = c.createOscillator();
        o.frequency.value = hz(e.m!) * mul;
        const g = c.createGain();
        this.env(g, when, 0.1 * v * amp, 0.004, d / (mul > 1 ? 2 : 1));
        o.connect(g).connect(out);
        o.start(when);
        o.stop(when + d + 0.05);
      }
    } else if (e.k === "kick") {
      const o = c.createOscillator();
      o.frequency.setValueAtTime(110, when);
      o.frequency.exponentialRampToValueAtTime(42, when + 0.25);
      const g = c.createGain();
      this.env(g, when, 0.55 * v, 0.005, 0.7);
      o.connect(g).connect(out);
      o.start(when);
      o.stop(when + 0.8);
    } else {
      const n = c.createBufferSource();
      n.buffer = this.noise;
      n.loop = true;
      const f = c.createBiquadFilter();
      const g = c.createGain();
      if (e.k === "rain") {
        f.type = "highpass";
        f.frequency.value = 2500;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.linearRampToValueAtTime(0.045, when + 1);
        g.gain.setValueAtTime(0.045, when + d - 1.2);
        g.gain.linearRampToValueAtTime(0.0001, when + d);
      } else {
        f.type = "lowpass";
        f.frequency.setValueAtTime(900, when);
        f.frequency.exponentialRampToValueAtTime(70, when + d);
        this.env(g, when, 0.7 * v, 0.03, d);
      }
      n.connect(f).connect(g).connect(out);
      n.start(when);
      n.stop(when + d + 0.1);
    }
  }
}
