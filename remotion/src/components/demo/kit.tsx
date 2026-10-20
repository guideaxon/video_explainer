/**
 * Demo channel kit: a data-driven product demo built from real screenshots (no screen recording).
 * One component, `DemoScene`, renders an intro, a screenshot step or an outro from `manifest.json`;
 * the scene files in a project are generated from that manifest (scripts/demo_build_scenes.py).
 * Works at 1920x1080 (default) and 1080x1920: all layout comes from `useVideoConfig()`.
 * Screenshots are shown as supplied inside a device frame; the kit never draws app UI itself.
 * See docs/demo_video_style_guide.md.
 */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const inter = loadInter("normal", { weights: ["400", "600", "800"], subsets: ["latin"] });
const FONT = inter.fontFamily;

/** Region of a screenshot in 0..1 coordinates (x, y = top-left). */
export type Rect = { x: number; y: number; w: number; h: number };
export type Device = "phone" | "tablet" | "laptop" | "none";

export interface DemoBrand {
  name: string;
  tagline?: string;
  accent: string; // 6-digit hex
  theme: "dark" | "light";
  logo?: string; // path under the project dir, e.g. "screenshots/logo.png"
}
export interface DemoSceneData {
  kind: "intro" | "step" | "outro";
  title: string;
  narration: string;
  caption?: string; // on-screen headline (intro/outro: the big line)
  sub?: string; // intro/outro secondary line; outro: the call-to-action pill
  screenshot?: string;
  aspect?: number; // screenshot width / height
  device?: Device;
  focus?: Rect; // camera zooms to this region
  highlight?: Rect; // pulsing outline
  cursor?: { from?: [number, number]; to: [number, number]; click?: boolean };
}
export interface DemoManifest {
  brand: DemoBrand;
  captions?: boolean; // burned-in subtitles from the narration (default true)
  scenes: DemoSceneData[];
}

const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const prog = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });

const palette = (b: DemoBrand) =>
  b.theme === "light"
    ? { bg1: "#f5f7fc", bg2: "#e6ebf7", text: "#0f172a", dim: "rgba(15,23,42,0.62)", panel: "rgba(255,255,255,0.92)", shadow: "rgba(15,23,42,0.28)" }
    : { bg1: "#0a0c14", bg2: "#141827", text: "#ffffff", dim: "rgba(255,255,255,0.66)", panel: "rgba(20,24,39,0.92)", shadow: "rgba(0,0,0,0.6)" };

type Layout = {
  stage: { x: number; y: number; w: number; h: number };
  head: { x: number; y: number; w: number; size: number; align: "left" | "center" };
  tracker: { x: number; y: number; align: "left" | "right" };
  subs: { y: number; w: number; size: number };
};
/** Landscape: headline top-left, device centred, subtitles bottom. Portrait keeps y 160 to 1500 free of platform UI. */
const layoutFor = (w: number, h: number): Layout =>
  w >= h
    ? { stage: { x: 60, y: 170, w: w - 120, h: 700 }, head: { x: 80, y: 52, w: 1240, size: 56, align: "left" }, tracker: { x: w - 80, y: 66, align: "right" }, subs: { y: 940, w: 1500, size: 38 } }
    : { stage: { x: 40, y: 470, w: w - 80, h: 880 }, head: { x: 70, y: 250, w: w - 140, size: 66, align: "left" }, tracker: { x: 70, y: 176, align: "left" }, subs: { y: 1390, w: 900, size: 40 } };

/** Subtitle chunks: split on sentence ends, then into pieces of at most 7 words. */
export const subtitleChunks = (text: string): string[] => {
  const out: string[] = [];
  for (const sentence of text.match(/[^.!?]+[.!?]*/g) ?? []) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    const parts = Math.ceil(words.length / 7) || 1;
    const size = Math.ceil(words.length / parts);
    for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(" "));
  }
  return out;
};
const SPOKEN_WPS = 2.5;

const Background: React.FC<{ brand: DemoBrand; children?: React.ReactNode }> = ({ brand, children }) => {
  const frame = useCurrentFrame();
  const p = palette(brand);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${p.bg1} 0%, ${p.bg2} 100%)`, fontFamily: FONT, color: p.text, overflow: "hidden", opacity: prog(frame, 0, 8) }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 18% 0%, ${brand.accent}44 0%, transparent 55%)` }} />
      {children}
    </AbsoluteFill>
  );
};

/** Accent words: `*word` is drawn in the accent colour. */
const RichText: React.FC<{ text: string; accent: string }> = ({ text, accent }) => (
  <>
    {text.split(" ").map((w, i) =>
      w.startsWith("*") ? <span key={i} style={{ color: accent }}>{w.slice(1).replace(/\*+$/, "")} </span> : <span key={i}>{w} </span>,
    )}
  </>
);

const Headline: React.FC<{ text: string; brand: DemoBrand; lay: Layout["head"]; from?: number }> = ({ text, brand, lay, from = 4 }) => {
  const frame = useCurrentFrame();
  const t = prog(frame, from, from + 12);
  return (
    <div style={{ position: "absolute", left: lay.x, top: lay.y, width: lay.w, textAlign: lay.align, fontWeight: 800, fontSize: lay.size, lineHeight: 1.1, letterSpacing: -1.5, opacity: t, transform: `translateY(${(1 - t) * 24}px)` }}>
      <RichText text={text} accent={brand.accent} />
    </div>
  );
};

const Subtitles: React.FC<{ text: string; brand: DemoBrand; lay: Layout["subs"] }> = ({ text, brand, lay }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const chunks = subtitleChunks(text);
  if (chunks.length === 0) return null;
  const starts: number[] = [];
  let at = 6;
  for (const c of chunks) {
    starts.push(at);
    at += (c.split(" ").length / SPOKEN_WPS) * fps;
  }
  let idx = 0;
  starts.forEach((s, i) => { if (frame >= s) idx = i; });
  const local = frame - starts[idx];
  const p = palette(brand);
  return (
    <div style={{ position: "absolute", left: (width - lay.w) / 2, width: lay.w, top: lay.y, display: "flex", justifyContent: "center" }}>
      <div style={{ padding: "14px 28px", borderRadius: 18, background: p.panel, fontWeight: 600, fontSize: lay.size, lineHeight: 1.25, textAlign: "center", opacity: frame < 6 ? 0 : interpolate(local, [0, 5], [0, 1], clamp), boxShadow: `0 10px 30px ${p.shadow}` }}>
        {chunks[idx]}
      </div>
    </div>
  );
};

/** Camera target: zoom so the focus region fills about 80% of the stage (1x to 3.5x), centred on the region. */
const cameraFor = (focus: Rect | undefined, screenW: number, screenH: number, stage: { w: number; h: number }) => {
  if (!focus) return { z: 1, cx: 0.5, cy: 0.5 };
  const fit = Math.min((0.8 * stage.w) / (focus.w * screenW), (0.8 * stage.h) / (focus.h * screenH));
  return { z: Math.min(3.5, Math.max(1, fit)), cx: focus.x + focus.w / 2, cy: focus.y + focus.h / 2 };
};
/** Keep the scaled device covering the stage (or inside it, if smaller): no empty edges, no cropped bezel. */
const limit = (t: number, boxSize: number, z: number, stageSize: number) => {
  const lim = Math.abs(boxSize * z - stageSize) / 2;
  return Math.max(-lim, Math.min(lim, t));
};

const FRAMES: Record<Device, { pad: number; radius: number; inner: number }> = {
  phone: { pad: 16, radius: 64, inner: 50 },
  tablet: { pad: 22, radius: 40, inner: 22 },
  laptop: { pad: 16, radius: 22, inner: 8 },
  none: { pad: 0, radius: 18, inner: 18 },
};

const Cursor: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size * 1.4} viewBox="0 0 20 28" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.5))" }}>
    <path d="M2 2 L2 22 L7 17.5 L10.5 25.5 L13.5 24.2 L10 16.5 L17 16.5 Z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const StepScene: React.FC<{ manifest: DemoManifest; index: number }> = ({ manifest, index }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const brand = manifest.brand;
  const scene = manifest.scenes[index];
  const p = palette(brand);
  const lay = layoutFor(width, height);
  const steps = manifest.scenes.filter((s) => s.kind === "step");
  const stepNo = steps.indexOf(scene) + 1;

  const aspect = scene.aspect ?? 0.5;
  const device: Device = scene.device ?? (aspect < 0.7 ? "phone" : aspect < 1.15 ? "tablet" : "laptop");
  const fr = FRAMES[device];
  // Fit the screenshot (plus bezel) inside the stage.
  const baseH = device === "laptop" ? 26 : 0; // laptop base under the screen
  const maxScreenW = lay.stage.w - fr.pad * 2;
  const maxScreenH = lay.stage.h - fr.pad * 2 - baseH;
  const screenW = Math.min(maxScreenW, maxScreenH * aspect);
  const screenH = screenW / aspect;
  const boxW = screenW + fr.pad * 2;
  const boxH = screenH + fr.pad * 2 + baseH;

  const cam = cameraFor(scene.focus, screenW, screenH, lay.stage);
  const zoomT = prog(frame, 18, 48);
  const drift = 1 + frame * 0.0004; // slow push so a held shot is never frozen
  const z = (1 + (cam.z - 1) * zoomT) * drift;
  const tx = limit(-(cam.cx - 0.5) * screenW * z * zoomT, boxW, z, lay.stage.w);
  const ty = limit(-(cam.cy - 0.5) * screenH * z * zoomT, boxH, z, lay.stage.h);

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const hl = scene.highlight;
  const hlT = prog(frame, 40, 52);
  const cur = scene.cursor;
  const curT = prog(frame, 24, 56);
  const from = cur?.from ?? [0.5, 0.95];
  const cx = cur ? (from[0] + (cur.to[0] - from[0]) * curT) * screenW : 0;
  const cy = cur ? (from[1] + (cur.to[1] - from[1]) * curT) * screenH : 0;
  const clickAt = 58;
  const ripple = cur?.click ? prog(frame, clickAt, clickAt + 16) : 0;

  return (
    <Background brand={brand}>
      {scene.caption && <Headline text={scene.caption} brand={brand} lay={lay.head} />}
      <div style={{ position: "absolute", left: lay.tracker.align === "left" ? lay.tracker.x : undefined, right: lay.tracker.align === "right" ? width - lay.tracker.x : undefined, top: lay.tracker.y, display: "flex", alignItems: "center", gap: 10, opacity: prog(frame, 2, 12) }}>
        {steps.map((_, i) => (
          <div key={i} style={{ width: i + 1 === stepNo ? 44 : 14, height: 14, borderRadius: 7, background: i + 1 <= stepNo ? brand.accent : p.dim, opacity: i + 1 <= stepNo ? 1 : 0.35 }} />
        ))}
        <div style={{ marginLeft: 8, fontSize: 24, fontWeight: 600, color: p.dim }}>
          {stepNo} / {steps.length}
        </div>
      </div>

      {/* Stage: the device with its screenshot, moved and scaled as a whole by the camera. */}
      <div style={{ position: "absolute", left: lay.stage.x, top: lay.stage.y, width: lay.stage.w, height: lay.stage.h, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 24 }}>
        <div style={{ width: boxW, height: boxH, position: "relative", opacity: enter, transform: `translate(${tx}px, ${ty}px) scale(${z}) translateY(${(1 - enter) * 40}px)` }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: boxW, height: boxH - baseH, borderRadius: fr.radius, background: device === "none" ? "transparent" : "#0b0b0f", boxShadow: `0 30px 80px ${p.shadow}`, border: device === "none" ? undefined : "2px solid rgba(255,255,255,0.14)" }} />
          {device === "phone" && <div style={{ position: "absolute", top: fr.pad + 12, left: "50%", width: screenW * 0.26, height: 26, marginLeft: -screenW * 0.13, borderRadius: 13, background: "#000", zIndex: 3 }} />}
          {device === "laptop" && <div style={{ position: "absolute", left: -boxW * 0.04, top: boxH - baseH, width: boxW * 1.08, height: baseH, borderRadius: "0 0 18px 18px", background: "linear-gradient(180deg,#c9ccd4,#8c909b)", boxShadow: `0 14px 30px ${p.shadow}` }} />}
          <div style={{ position: "absolute", left: fr.pad, top: fr.pad, width: screenW, height: screenH, borderRadius: fr.inner, overflow: "hidden", background: "#000" }}>
            {scene.screenshot && <Img src={staticFile(scene.screenshot)} style={{ width: "100%", height: "100%", objectFit: "fill" }} />}
            {hl && (
              <div style={{ position: "absolute", left: `${hl.x * 100}%`, top: `${hl.y * 100}%`, width: `${hl.w * 100}%`, height: `${hl.h * 100}%`, borderRadius: 14, border: `${4 / Math.max(1, z)}px solid ${brand.accent}`, boxShadow: `0 0 ${24 + 10 * Math.sin(frame / 6)}px ${brand.accent}`, opacity: hlT, background: `${brand.accent}1c` }} />
            )}
            {cur && (
              <div style={{ position: "absolute", left: cx, top: cy, transform: `scale(${1 / z})`, transformOrigin: "0 0", opacity: prog(frame, 20, 28) }}>
                <Cursor size={30} />
                {ripple > 0 && ripple < 1 && (
                  <div style={{ position: "absolute", left: -40, top: -40, width: 80, height: 80, borderRadius: 40, border: `4px solid ${brand.accent}`, transform: `scale(${0.3 + ripple})`, opacity: 1 - ripple }} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {manifest.captions !== false && <Subtitles text={scene.narration} brand={brand} lay={lay.subs} />}
    </Background>
  );
};

const Logo: React.FC<{ brand: DemoBrand; size: number }> = ({ brand, size }) => {
  const t = spring({ frame: useCurrentFrame() - 2, fps: useVideoConfig().fps, config: { damping: 14, stiffness: 100 } });
  return brand.logo ? (
    <Img src={staticFile(brand.logo)} style={{ height: size, width: "auto", transform: `scale(${t})` }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: brand.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.56, transform: `scale(${t})`, boxShadow: `0 16px 48px ${brand.accent}88` }}>
      {brand.name.trim().charAt(0).toUpperCase()}
    </div>
  );
};

const BookendScene: React.FC<{ manifest: DemoManifest; index: number }> = ({ manifest, index }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const brand = manifest.brand;
  const scene = manifest.scenes[index];
  const p = palette(brand);
  const portrait = height > width;
  const lay = layoutFor(width, height);
  const t = prog(frame, 14, 28);
  return (
    <Background brand={brand}>
      <div style={{ position: "absolute", left: 0, width, top: portrait ? 560 : 230, display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
        <Logo brand={brand} size={portrait ? 150 : 130} />
        <div style={{ fontWeight: 800, fontSize: portrait ? 84 : 76, letterSpacing: -2, textAlign: "center", padding: "0 70px", lineHeight: 1.1, opacity: prog(frame, 10, 24), transform: `translateY(${(1 - prog(frame, 10, 24)) * 20}px)` }}>
          <RichText text={scene.caption ?? brand.name} accent={brand.accent} />
        </div>
        {scene.sub && scene.kind === "intro" && <div style={{ fontWeight: 600, fontSize: portrait ? 40 : 38, color: p.dim, textAlign: "center", padding: "0 90px", opacity: t }}>{scene.sub}</div>}
        {scene.sub && scene.kind === "outro" && (
          <div style={{ marginTop: 10, padding: "20px 52px", borderRadius: 60, background: brand.accent, color: "#fff", fontWeight: 800, fontSize: 40, opacity: t, transform: `scale(${0.9 + 0.1 * t})`, boxShadow: `0 14px 40px ${brand.accent}77` }}>{scene.sub}</div>
        )}
      </div>
      {manifest.captions !== false && <Subtitles text={scene.narration} brand={brand} lay={lay.subs} />}
    </Background>
  );
};

/** Renders scene `index` of the manifest (intro, step or outro). */
export const DemoScene: React.FC<{ manifest: DemoManifest; index: number }> = ({ manifest, index }) =>
  manifest.scenes[index].kind === "step" ? <StepScene manifest={manifest} index={index} /> : <BookendScene manifest={manifest} index={index} />;
