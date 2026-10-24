import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { FilmSvg, filmInfo } from "./film";
import type { Film } from "./film";
import { Music } from "./music";
import { NO_UI } from "./ui";
import type { Poke, UiState } from "./ui";
import { VoicePlayer, clipAt, duckAt, readEmbeddedVoice } from "./voice";

const CSS = `
:root{color-scheme:dark;--bg:#05060f;--bar:#0e1020;--fg:#e8e9f0;--mute:#9a9db0;--edge:#2a2e48;--btn:#1a1d33;--on:#ffd966}
@media (prefers-color-scheme: light){:root{color-scheme:light;--bar:#f1efe8;--fg:#231e16;--mute:#6b6458;--edge:#d6cfbf;--btn:#fffaf0;--on:#b8730a}}
html,body{margin:0;background:var(--bg)}
.pc{height:100vh;display:flex;flex-direction:column;background:var(--bg);color:var(--fg);font-family:system-ui,sans-serif}
.pc-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
.pc-frame{width:min(100vw,calc((100vh - 56px)*16/9));aspect-ratio:16/9;outline-offset:-3px}
.pc-frame:focus-visible{outline:3px solid var(--on)}
.pc-bar{min-height:56px;display:flex;align-items:center;gap:10px;padding:6px 16px;background:var(--bar);flex-wrap:wrap}
.pc-bar button{padding:7px 12px;min-width:76px;background:var(--btn);color:var(--fg);border:1px solid var(--edge);border-radius:8px;font:inherit;cursor:pointer}
.pc-bar button[aria-pressed="true"]{border-color:var(--on);color:var(--on)}
.pc-bar button:focus-visible,.pc-bar input:focus-visible{outline:3px solid var(--on);outline-offset:2px}
.pc-bar input[type=range]{flex:1;min-width:120px;accent-color:var(--on)}
.pc-time{font-variant-numeric:tabular-nums;color:var(--mute)}
.pc-hint{position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;padding:6px 14px;border-radius:20px;font-size:14px;pointer-events:none;text-align:center;max-width:92vw}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

const Player: React.FC<{ film: Film }> = ({ film }) => {
  const { fps, total, sceneFrames } = filmInfo(film);
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const init = Number(new URLSearchParams(location.hash.slice(1)).get("f"));
  const [frame, setFrame] = useState(init || 0);
  const [playing, setPlaying] = useState(!init && !reduce); // reduced-motion viewers press Play themselves
  const [muted, setMuted] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [xray, setXray] = useState(false);
  const [ui, setUi] = useState<UiState>({ ...NO_UI, reduce });
  const m = useRef({ frame: init || 0, last: 0, shown: -1, xray: 0, pokes: [] as Poke[] });
  const music = useRef<Music | null>(null);
  const voice = useRef<VoicePlayer | null>(null);
  const sceneSec = sceneFrames / fps;
  const flags = useRef({ playing, muted, xray });
  flags.current = { playing, muted, xray };

  // Browsers only allow audio after a user gesture: create the audio context on the first one.
  const ensureAudio = () => {
    if (music.current) return music.current;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    ctx.resume();
    music.current = new Music(ctx, film.events, total / fps);
    music.current.setMuted(flags.current.muted);
    if (film.voice) {
      voice.current = new VoicePlayer(ctx, film.voice, sceneSec);
      voice.current.setMuted(flags.current.muted);
    }
    setAudioOn(true);
    return music.current;
  };

  const poke = (kind: Poke["kind"], id: string, note = 0) => {
    m.current.pokes.push({ kind, id, wall: performance.now() / 1000 });
    ensureAudio().poke(kind, note);
  };

  useEffect(() => {
    window.addEventListener("pointerdown", ensureAudio);
    return () => window.removeEventListener("pointerdown", ensureAudio);
  }, []);
  useEffect(() => { music.current?.setMuted(muted); voice.current?.setMuted(muted); }, [muted]);

  useEffect(() => {
    const id = setInterval(() => {
      const mu = music.current;
      if (!mu) return;
      const t = m.current.frame / fps;
      if (flags.current.playing) mu.tick(t); else mu.stop();
      const vo = voice.current;
      if (!vo) return;
      // the voice follows the same clock (re-syncing after seeks and loops); the music ducks under it
      if (flags.current.playing) vo.tick(t); else vo.stop();
      mu.setDuck(flags.current.playing ? duckAt(film.voice, t, sceneSec) : 1);
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const s = m.current;
      const dt = Math.min(0.1, (now - s.last) / 1000);
      if (flags.current.playing) {
        s.frame += dt * fps;
        if (s.frame >= total) s.frame = 0;
      }
      s.last = now;
      const target = flags.current.xray ? 1 : 0;
      const wasEasing = s.xray !== target;
      s.xray = Math.abs(target - s.xray) < 0.003 ? target : s.xray + (target - s.xray) * Math.min(1, dt * (reduce ? 40 : 6));
      const wall = now / 1000;
      s.pokes = s.pokes.filter((p) => wall - p.wall < 2.6);
      const frameChanged = Math.floor(s.frame) !== s.shown;
      // re-render at film rate while playing, and every display frame only while a reaction or the x-ray is animating
      if (frameChanged || s.pokes.length || wasEasing) {
        s.shown = Math.floor(s.frame);
        setFrame(s.frame);
        setUi({ xray: s.xray, level: flags.current.playing ? music.current?.level() ?? 0 : 0, wall, pokes: [...s.pokes], reduce });
      }
      raf = requestAnimationFrame(tick);
    };
    m.current.last = performance.now();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const seek = (f: number) => { m.current.frame = Math.max(0, Math.min(total - 1, f)); setFrame(m.current.frame); };
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "BUTTON" || tag === "INPUT") { if (e.code === "Space") return; } // let focused controls handle Space
      if (tag === "INPUT" && e.key.startsWith("Arrow")) return; // the focused slider steps itself
      const k = e.key.toLowerCase();
      if (!(e.code === "Space" || e.key === "ArrowRight" || e.key === "ArrowLeft" || "mxsfn".includes(k) && k.length === 1)) return;
      ensureAudio(); // keyboard is a user gesture too
      if (e.code === "Space") setPlaying((p) => !p);
      else if (e.key === "ArrowRight") seek(m.current.frame + 5 * fps);
      else if (e.key === "ArrowLeft") seek(m.current.frame - 5 * fps);
      else if (k === "m") setMuted((v) => !v);
      else if (k === "x") setXray((v) => !v);
      else if (k === "s") poke("star", "star");
      else if (k === "f") poke("fox", "fox");
      else if (k === "n") poke("flower", "*", Math.floor(Math.random() * 5));
      e.preventDefault();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const onStageClick = (e: React.MouseEvent) => {
    const el = (e.target as Element).closest?.("[data-poke]") as SVGElement | null;
    if (el) poke(el.dataset.poke as Poke["kind"], el.dataset.id ?? "", Number(el.dataset.note ?? 0));
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const scene = Math.min(film.scenes.length - 1, Math.floor(frame / sceneFrames));
  const sceneName = film.sceneNames?.[scene] ?? `Scene ${scene + 1}`;
  const said = audioOn && playing && clipAt(film.voice, frame / fps, sceneSec) ? film.voice?.clips[scene]?.text : "";
  const help = `${film.title}. Space plays or pauses, arrow keys seek, X looks inside, M mutes, and clicking or pressing S, F or N plays the star, the fox or a flower.`;
  return (
    <div className="pc">
      <style>{CSS}</style>
      <div className="pc-stage">
        <div className="pc-frame" tabIndex={0} role="group" aria-roledescription="animated film" aria-label={help} onClick={onStageClick}>
          <FilmSvg film={film} frame={Math.floor(frame)} ui={ui} label={`${film.title}. ${sceneName}`} />
        </div>
      </div>
      <div className="pc-bar" role="toolbar" aria-label="Film controls">
        <button onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button>
        <button aria-pressed={!muted} onClick={() => setMuted(!muted)}>{muted ? "Sound off" : "Sound on"}</button>
        <button aria-pressed={xray} onClick={() => setXray(!xray)} title="Show what is inside (X)">Look inside</button>
        <input type="range" aria-label="Seek" min={0} max={total - 1} value={Math.floor(frame)}
          aria-valuetext={`${fmt(frame / fps)} of ${fmt(total / fps)}`}
          onChange={(e) => { m.current.frame = +e.target.value; setFrame(+e.target.value); }} />
        <span className="pc-time" aria-hidden="true">{fmt(frame / fps)} / {fmt(total / fps)}</span>
      </div>
      <div className="sr" aria-live="polite">{playing ? (said ? `${sceneName}. ${said}` : sceneName) : `Paused. ${sceneName}`}</div>
      {!audioOn && (
        <div className="pc-hint">{reduce ? "Press Play. " : ""}Click anywhere for the {film.voice ? "sound" : "music"} · click the star, the fox or the flowers · X looks inside</div>
      )}
    </div>
  );
};

/** Entry point used by every papercut project's main.tsx. */
export const mountPlayer = (film: Film) => {
  document.title = film.title;
  const voice = film.voice ?? readEmbeddedVoice();
  if (voice && voice.clips.length > film.scenes.length) console.warn(`voice has ${voice.clips.length} clips for ${film.scenes.length} scenes`);
  createRoot(document.getElementById("root")!).render(<Player film={voice ? { ...film, voice } : film} />);
};
