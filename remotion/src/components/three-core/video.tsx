/**
 * Video mode: a canvas drawn by the shared Stage, synchronously, for Remotion's current frame. There is no loop here:
 * Remotion owns the clock (docs/scene3d_design.md section 4), so t = frame / fps and nothing else.
 */

import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "./stage";
import { frameTime } from "./time";

export type SceneHandle = {
  /** Set every object for scene time t (seconds) and video frame `frame`. Must not read any other clock. */
  update: (t: number, frame: number) => void;
  dispose?: () => void;
};

export type BuildScene = (stage: Stage, info: { width: number; height: number; fps: number }) => SceneHandle;

export const StageView: React.FC<{ build: BuildScene; children?: React.ReactNode }> = ({ build, children }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const host = useRef<HTMLDivElement>(null);
  const live = useRef<{ stage: Stage; handle: SceneHandle } | null>(null);

  useLayoutEffect(() => {
    // A fresh canvas per build: Stage.dispose() forces the context lost, and a canvas only ever hands back its first
    // context, so a rebuild (size or fps change, Fast Refresh, a double mount) must not reuse the old element.
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.cssText = "width:100%;height:100%;display:block";
    host.current!.appendChild(canvas);
    const stage = new Stage(canvas, { width, height, mode: "video" });
    live.current = { stage, handle: build(stage, { width, height, fps }) };
    return () => {
      live.current?.handle.dispose?.();
      live.current?.stage.dispose();
      live.current = null;
      canvas.remove();
    };
    // build is a module-level function per scene; rebuilding on every frame would recompile shaders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, fps]);

  useLayoutEffect(() => {
    const l = live.current;
    if (!l) return;
    l.handle.update(frameTime(frame, fps), frame);
    l.stage.render();
  }, [frame, fps, width, height]);

  return (
    <AbsoluteFill>
      <div ref={host} style={{ position: "absolute", inset: 0 }} />
      {children}
    </AbsoluteFill>
  );
};
