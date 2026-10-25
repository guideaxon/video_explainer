/**
 * Optional papercut voice (`"voice": true` in config.json). `scripts/papercut_build_html.py` embeds one MP3 clip per
 * scene as a data URI plus its lip sync in film.html (`<script type="application/json" id="pc-voice">`); clip i plays from
 * the start of scene i, cut at the scene end. Pure timing here; `VoicePlayer` plays it with Web Audio on the film clock.
 * Scenes read the current mouth through `useVoice()` (the Fox does it itself).
 */
import { createContext, useContext } from "react";
import { mouthAt, visemeAt } from "../rig";
import type { Viseme } from "../rig";

export type VoiceClip = {
  id: string; // narration scene_id
  text: string; // the narration, announced to screen readers
  src: string; // data:audio/mpeg;base64,...
  dur: number; // seconds
  mouth: number[]; // openness per frame at Voice.fps
  visemes?: string; // Rhubarb shape per frame (only when Rhubarb was on PATH)
};
/** clips[i] belongs to scene i; null = a silent scene. */
export type Voice = { fps: number; clips: (VoiceClip | null)[] };

/** Music gain while a clip plays (-9 dB) and the ramp in/out around it, in seconds. */
export const DUCK = Math.pow(10, -9 / 20);
export const DUCK_RAMP = 0.3;

/** How long clip i sounds: its length, cut at the scene end. */
export const clipWindow = (v: Voice, i: number, sceneSeconds: number) => Math.min(v.clips[i]?.dur ?? 0, sceneSeconds);

/** The clip sounding at film time `t` (seconds): its scene index and the clip-local time; null between clips. */
export const clipAt = (v: Voice | undefined, t: number, sceneSeconds: number) => {
  if (!v) return null;
  const i = Math.floor(t / sceneSeconds);
  const local = t - i * sceneSeconds;
  return i >= 0 && v.clips[i] && local < clipWindow(v, i, sceneSeconds) ? { i, local } : null;
};

/** Music gain at film time `t`: DUCK inside a clip window, ramping linearly over DUCK_RAMP either side. */
export const duckAt = (v: Voice | undefined, t: number, sceneSeconds: number) => {
  if (!v) return 1;
  let d = Infinity; // distance in seconds to the nearest clip window (0 inside one)
  const i0 = Math.floor(t / sceneSeconds);
  for (const i of [i0 - 1, i0, i0 + 1]) {
    if (i < 0 || !v.clips[i]) continue;
    const a = i * sceneSeconds;
    const b = a + clipWindow(v, i, sceneSeconds);
    d = Math.min(d, t < a ? a - t : t > b ? t - b : 0);
  }
  const k = Math.max(0, 1 - d / DUCK_RAMP);
  return 1 - (1 - DUCK) * k;
};

/** What a character's mouth does now. `rig` + `frame` let a scene hand the same data to any other character. */
export type VoiceNow = { open: number; viseme: Viseme; talking: boolean; text: string; rig: { mouth?: number[]; visemes?: string }; frame: number };

/** Mouth state for scene `scene` at scene-local seconds `t` (closed outside the clip, or with no voice). */
export const voiceNow = (v: Voice | undefined, scene: number, t: number, sceneSeconds: number): VoiceNow | null => {
  const c = v?.clips[scene];
  if (!v || !c) return null;
  const rig = { mouth: c.mouth, visemes: c.visemes };
  const frame = t < clipWindow(v, scene, sceneSeconds) ? Math.floor(t * v.fps) : -1;
  return { open: mouthAt(rig, frame), viseme: visemeAt(rig, frame), talking: frame >= 0, text: c.text, rig, frame };
};

export const VoiceContext = createContext<VoiceNow | null>(null);
/** The current scene's voice (null when the film has no voice or the scene is silent). */
export const useVoice = () => useContext(VoiceContext);

/** The voice embedded by the build script, or undefined (music-only film). */
export const readEmbeddedVoice = (): Voice | undefined => {
  const el = typeof document !== "undefined" ? document.getElementById("pc-voice") : null;
  try { return el?.textContent ? (JSON.parse(el.textContent) as Voice) : undefined; } catch { return undefined; }
};

const LOOKAHEAD = 0.15;

/** Plays the clips in step with the film clock: call `tick(t)` ~10x/s while playing, `stop()` on pause. */
export class VoicePlayer {
  private out: GainNode;
  private bufs: (AudioBuffer | null)[];
  private cur: { i: number; off: number; at: number; src: AudioBufferSourceNode } | null = null;

  constructor(private ctx: BaseAudioContext, private v: Voice, private sceneSeconds: number) {
    this.out = ctx.createGain();
    this.out.connect(ctx.destination);
    this.bufs = v.clips.map(() => null);
    v.clips.forEach((c, i) => {
      if (!c) return;
      const b64 = c.src.slice(c.src.indexOf(",") + 1);
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      ctx.decodeAudioData(bytes.buffer).then((b) => { this.bufs[i] = b; }, () => console.warn(`voice clip ${c.id} did not decode`));
    });
  }

  setMuted(m: boolean) {
    this.out.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  stop() {
    try { this.cur?.src.stop(); } catch { /* not started */ }
    this.cur = null;
  }

  tick(t: number) {
    const S = this.sceneSeconds;
    const now = this.ctx.currentTime;
    const c = this.cur;
    if (c) {
      const local = t - c.i * S; // where the film says the clip is; c.off + (now - c.at) is where the audio is
      const inSync = Math.abs(local - (c.off + now - c.at)) < 0.25 && local < clipWindow(this.v, c.i, S);
      // Still sounding and the next scene's clip is not due yet: nothing to do.
      if (inSync && Math.floor((t + LOOKAHEAD) / S) === c.i) return;
      // Still sounding but the next clip starts within the lookahead: schedule it below and let this one finish by
      // itself (its source was started with a length), so a clip that runs to the scene end is not cut or late.
      if (!inSync) this.stop(); // seek, loop or clip over
    }
    // the clip sounding now, or one starting within the lookahead (scheduled sample-exact on the audio clock)
    const i = Math.floor((t + LOOKAHEAD) / S);
    const local = t - i * S;
    const buf = this.bufs[i];
    const win = Math.min(clipWindow(this.v, i, S), buf?.duration ?? 0);
    if (!buf || local >= win - 0.05) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.out);
    const off = Math.max(0, local);
    const at = now + Math.max(0, -local);
    src.start(at, off, win - off);
    this.cur = { i, off, at, src };
  }
}
