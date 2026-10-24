import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { FilmSvg, filmInfo } from "./film";
import type { Film } from "./film";
import { Music } from "./music";

const Player: React.FC<{ film: Film }> = ({ film }) => {
  const { fps, total } = filmInfo(film);
  const init = Number(new URLSearchParams(location.hash.slice(1)).get("f"));
  const [frame, setFrame] = useState(init || 0);
  const [playing, setPlaying] = useState(!init);
  const [muted, setMuted] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const st = useRef({ frame: init || 0, last: 0, shown: -1 });
  const music = useRef<Music | null>(null);
  const flags = useRef({ playing, muted });
  flags.current = { playing, muted };

  // Browsers only allow audio after a user gesture: create the audio context on the first one.
  useEffect(() => {
    const unlock = () => {
      if (music.current) return;
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      ctx.resume();
      music.current = new Music(ctx, film.events, total / fps);
      music.current.setMuted(flags.current.muted);
      setAudioOn(true);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);

  useEffect(() => { music.current?.setMuted(muted); }, [muted]);
  useEffect(() => {
    const id = setInterval(() => {
      const m = music.current;
      if (!m) return;
      if (flags.current.playing) m.tick(st.current.frame / fps); else m.stop();
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const s = st.current;
      if (flags.current.playing) {
        s.frame += ((now - s.last) / 1000) * fps;
        if (s.frame >= total) s.frame = 0;
        // re-render the SVG only when the film frame changes (30 fps), not on every display refresh
        if (Math.floor(s.frame) !== s.shown) { s.shown = Math.floor(s.frame); setFrame(s.frame); }
      }
      s.last = now;
      raf = requestAnimationFrame(tick);
    };
    st.current.last = performance.now();
    raf = requestAnimationFrame(tick);
    const k = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); } };
    window.addEventListener("keydown", k);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", k); };
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const btn: React.CSSProperties = { padding: "6px 10px", minWidth: 72 };
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#05060f", color: "#ddd", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "min(100vw, calc((100vh - 52px) * 16 / 9))", aspectRatio: "16/9" }}>
          <FilmSvg film={film} frame={Math.floor(frame)} />
        </div>
      </div>
      <div style={{ height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
        <button style={btn} onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button>
        <button style={btn} onClick={() => setMuted(!muted)}>{muted ? "Sound off" : "Sound on"}</button>
        <input type="range" min={0} max={total - 1} value={Math.floor(frame)} style={{ flex: 1 }}
          onChange={(e) => { st.current.frame = +e.target.value; setFrame(+e.target.value); }} />
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(frame / fps)} / {fmt(total / fps)}</span>
      </div>
      {!audioOn && (
        <div style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,.65)", padding: "6px 14px", borderRadius: 20, fontSize: 14, pointerEvents: "none" }}>
          Click anywhere to start the music
        </div>
      )}
    </div>
  );
};

/** Entry point used by every papercut project's main.tsx. */
export const mountPlayer = (film: Film) => {
  document.title = film.title;
  createRoot(document.getElementById("root")!).render(<Player film={film} />);
};
