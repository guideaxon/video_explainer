import React from "react";
import { Defs, PaperOverlay, W, H, clamp } from "./paper";
import type { Ev } from "./music";
import { NO_UI, UiContext } from "./ui";
import type { UiState } from "./ui";
import { VoiceContext, voiceNow } from "./voice";
import type { Voice } from "./voice";

export type SceneProps = { t: number; p: number; cam: number };
export type SceneFn = React.FC<SceneProps>;

/** A whole papercut film: a list of scenes (equal length) plus the score events. */
export type Film = {
  title: string;
  scenes: SceneFn[];
  events: Ev[];
  /** one short name per scene, announced to screen readers as the film plays */
  sceneNames?: string[];
  sceneSeconds?: number; // default 6
  fps?: number; // default 30
  fadeFrames?: number; // cross-fade into each scene, default 20
  /** optional narration (clip i = scene i) with lip sync; mountPlayer reads the one embedded by the build */
  voice?: Voice;
};

export const filmInfo = (f: Film) => {
  const fps = f.fps ?? 30;
  const sceneFrames = Math.round((f.sceneSeconds ?? 6) * fps);
  return { fps, sceneFrames, fade: f.fadeFrames ?? 20, total: sceneFrames * f.scenes.length };
};

/** The whole film as one SVG for a given frame. Pure code, no assets. */
export const FilmSvg: React.FC<{ film: Film; frame: number; ui?: UiState; label?: string }> = ({ film, frame, ui = NO_UI, label }) => {
  const { fps, sceneFrames, fade } = filmInfo(film);
  return (
    <UiContext.Provider value={ui}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }} role="img" aria-label={label ?? film.title}>
        <Defs />
        {film.scenes.map((Scene, i) => {
          const lf = frame - i * sceneFrames;
          if (lf < -fade || lf > sceneFrames + fade) return null;
          const opacity = i === 0 ? 1 : clamp((lf + fade) / fade);
          const p = clamp(lf / sceneFrames);
          const zoom = ui.reduce ? 1 : 1 + 0.045 * p; // no camera push for reduced-motion viewers
          return (
            <g key={i} opacity={opacity}>
              <g transform={`translate(${W / 2} ${H * 0.62}) scale(${zoom}) translate(${-W / 2} ${-H * 0.62})`}>
                <VoiceContext.Provider value={voiceNow(film.voice, i, lf / fps, sceneFrames / fps)}>
                  <Scene t={lf / fps} p={p} cam={(p - 0.5) * 2} />
                </VoiceContext.Provider>
              </g>
            </g>
          );
        })}
        <PaperOverlay />
      </svg>
    </UiContext.Provider>
  );
};
