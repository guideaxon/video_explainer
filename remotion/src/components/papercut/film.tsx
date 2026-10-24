import React from "react";
import { Defs, PaperOverlay, W, H, clamp } from "./paper";
import type { Ev } from "./music";

export type SceneProps = { t: number; p: number; cam: number };
export type SceneFn = React.FC<SceneProps>;

/** A whole papercut film: a list of scenes (equal length) plus the score events. */
export type Film = {
  title: string;
  scenes: SceneFn[];
  events: Ev[];
  sceneSeconds?: number; // default 6
  fps?: number; // default 30
  fadeFrames?: number; // cross-fade into each scene, default 20
};

export const filmInfo = (f: Film) => {
  const fps = f.fps ?? 30;
  const sceneFrames = Math.round((f.sceneSeconds ?? 6) * fps);
  return { fps, sceneFrames, fade: f.fadeFrames ?? 20, total: sceneFrames * f.scenes.length };
};

/** The whole film as one SVG for a given frame. Pure code, no assets. */
export const FilmSvg: React.FC<{ film: Film; frame: number }> = ({ film, frame }) => {
  const { fps, sceneFrames, fade } = filmInfo(film);
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <Defs />
      {film.scenes.map((Scene, i) => {
        const lf = frame - i * sceneFrames;
        if (lf < -fade || lf > sceneFrames + fade) return null;
        const opacity = i === 0 ? 1 : clamp((lf + fade) / fade);
        const p = clamp(lf / sceneFrames);
        const zoom = 1 + 0.045 * p;
        return (
          <g key={i} opacity={opacity}>
            <g transform={`translate(${W / 2} ${H * 0.62}) scale(${zoom}) translate(${-W / 2} ${-H * 0.62})`}>
              <Scene t={lf / fps} p={p} cam={(p - 0.5) * 2} />
            </g>
          </g>
        );
      })}
      <PaperOverlay />
    </svg>
  );
};
