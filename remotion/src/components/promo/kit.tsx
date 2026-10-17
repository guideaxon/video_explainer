/**
 * Promo channel kit: building blocks for vertical (1080x1920, 9:16, mobile-first) dark SaaS
 * product-launch videos. Kinetic type, 3D glass UI mockups, glowing inputs, gradient stats.
 * Scenes pass content props; all UI is abstract (skeleton lines, tiles), never a real product's screens.
 * See docs/promo_video_style_guide.md.
 *
 * Layout: headline in the top third (y 200 to 560), the visual below it (y 640 to 1500).
 * Keep content inside the safe zone: y 160 to 1500 and x 60 to 1020 (platform UI covers the rest).
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMichroma } from "@remotion/google-fonts/Michroma";

const jakarta = loadJakarta("normal", { weights: ["600", "800"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });
const michroma = loadMichroma("normal", { weights: ["400"], subsets: ["latin"] });
export const HEAD = jakarta.fontFamily; // headlines and stats
export const UI = inter.fontFamily; // UI mock text
export const WIDE = michroma.fontFamily; // wordmark

export const W = 1080;
export const H = 1920;
export const C = {
  bg1: "#05071a", bg2: "#0b1140", indigo: "#4d5bff", blue: "#3d7bff", teal: "#2fe3c9", cyan: "#46d9ff",
  gold: "#ffc83d", red: "#ff4d6d", text: "#ffffff", dim: "rgba(255,255,255,0.62)", faint: "rgba(255,255,255,0.14)",
};
export const GRAD = `linear-gradient(90deg, ${C.teal}, ${C.blue})`;
export const GOLD = `linear-gradient(90deg, #ffd96a, ${C.gold})`;

const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const prog = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });
export const usePop = (delay: number, damping = 16) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 110 } });
};

/** Scene background: indigo gradient, glow, perspective grid floor, drifting particles. */
export const PScene: React.FC<{ glow?: string; floor?: boolean; children?: React.ReactNode }> = ({ glow = C.indigo, floor = true, children }) => {
  const frame = useCurrentFrame();
  const fade = prog(frame, 0, 8);
  const dots = Array.from({ length: 30 }, (_, i) => ({
    x: (i * 173) % W,
    y: ((i * 611) % H) - ((frame * (0.2 + (i % 5) * 0.1)) % H),
    r: 1.5 + (i % 3),
    o: 0.15 + (i % 4) * 0.08,
  }));
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg2} 100%)`, fontFamily: UI, opacity: fade, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 20% 8%, ${glow}55 0%, transparent 55%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 85% 100%, ${C.teal}22 0%, transparent 50%)` }} />
      {floor && (
        <div style={{ position: "absolute", left: -300, right: -300, bottom: -80, height: 520, perspective: 700, opacity: 0.45 }}>
          <div style={{ position: "absolute", inset: 0, transform: "rotateX(68deg)", transformOrigin: "50% 100%", backgroundImage: `linear-gradient(${C.teal}33 1px, transparent 1px), linear-gradient(90deg, ${C.teal}33 1px, transparent 1px)`, backgroundSize: "80px 80px", backgroundPosition: `0 ${(frame * 0.8) % 80}px`, WebkitMaskImage: "linear-gradient(to top, black, transparent)" }} />
        </div>
      )}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={((d.y % H) + H) % H} r={d.r} fill="#fff" opacity={d.o} />
        ))}
      </svg>
      {children}
    </AbsoluteFill>
  );
};

const gradStyle = (g: string): React.CSSProperties => ({ background: g, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });

/** Kinetic headline: words slide up and de-blur one by one. `*word` is gradient, `^word` is gold. */
export const Headline: React.FC<{ lines: string[]; x?: number; y?: number; size?: number; from?: number; align?: "left" | "center"; width?: number }> = ({ lines, x = 70, y = 230, size = 112, from = 4, align = "left", width = 940 }) => {
  const frame = useCurrentFrame();
  let n = 0;
  return (
    <div style={{ position: "absolute", left: align === "center" ? 0 : x, width: align === "center" ? W : width, top: y, textAlign: align, fontFamily: HEAD, fontWeight: 800, fontSize: size, lineHeight: 1.06, color: C.text, letterSpacing: -3 }}>
      {lines.map((line, li) => (
        <div key={li}>
          {line.split(" ").map((w, wi) => {
            const p = prog(frame, from + n * 4, from + n * 4 + 16);
            n += 1;
            const accent = w.startsWith("*") ? GRAD : w.startsWith("^") ? GOLD : null;
            const word = accent ? w.slice(1) : w;
            return (
              <span key={wi} style={{ display: "inline-block", marginRight: size * 0.25, opacity: p, transform: `translateY(${(1 - p) * 40}px)`, filter: `blur(${(1 - p) * 10}px)`, ...(accent ? gradStyle(accent) : {}) }}>
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Typed text with a caret. A `weak` word is dimmed and struck through once typed. */
export const Typed: React.FC<{ text: string; weak?: string; y?: number; size?: number; from?: number; cps?: number }> = ({ text, weak, y = 700, size = 92, from = 0, cps = 0.9 }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - from) * cps)));
  const shown = text.slice(0, n);
  const parts = weak && shown.includes(weak) ? shown.split(weak) : [shown];
  const strike = prog(frame, from + text.length / cps + 6, from + text.length / cps + 18);
  return (
    <div style={{ position: "absolute", left: 70, width: W - 140, top: y, textAlign: "center", fontFamily: HEAD, fontWeight: 800, fontSize: size, lineHeight: 1.12, color: C.text, letterSpacing: -2 }}>
      {parts.length === 2 ? (
        <>
          {parts[0]}
          <span style={{ color: C.dim, position: "relative" }}>
            {weak}
            <span style={{ position: "absolute", left: 0, top: "52%", height: 6, width: `${strike * 100}%`, background: C.red }} />
          </span>
          {parts[1]}
        </>
      ) : (
        shown
      )}
      <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: C.teal }}>|</span>
    </div>
  );
};

/** Glass panel that flies in with 3D perspective. rot = [rotateX, rotateY, rotateZ] when settled. */
export const Glass: React.FC<{ x: number; y: number; w: number; h: number; from?: number; rot?: [number, number, number]; glow?: string; radius?: number; children?: React.ReactNode; bg?: string }> = ({ x, y, w, h, from = 10, rot = [0, 0, 0], glow, radius = 26, children, bg }) => {
  const frame = useCurrentFrame();
  const p = usePop(from, 15);
  const float = Math.sin((frame + x) / 40) * 6;
  return (
    <div style={{ position: "absolute", left: x, top: y + float, width: w, height: h, perspective: 1600, opacity: Math.min(1, p * 1.4) }}>
      <div style={{ position: "relative", width: w, height: h, borderRadius: radius, background: bg ?? "linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))", border: `1px solid ${C.faint}`, boxShadow: `0 30px 80px rgba(0,0,0,0.5)${glow ? `, 0 0 60px ${glow}77` : ""}`, overflow: "hidden", transform: `rotateX(${rot[0] * p}deg) rotateY(${rot[1] * p + (1 - p) * 25}deg) rotateZ(${rot[2] * p}deg) translateY(${(1 - p) * 60}px) scale(${0.9 + 0.1 * p})` }}>
        {children}
      </div>
    </div>
  );
};

/** Abstract UI skeleton lines (no real product content). */
export const Skeleton: React.FC<{ rows?: number; pad?: number; accent?: string; from?: number }> = ({ rows = 5, pad = 28, accent = C.teal, from = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap: 18 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ height: i === 0 ? 22 : 14, width: `${[70, 95, 82, 60, 88, 74][i % 6] * prog(frame, from + i * 4, from + i * 4 + 14)}%`, borderRadius: 8, background: i === 0 ? accent : "rgba(255,255,255,0.18)" }} />
      ))}
    </div>
  );
};

/** Browser-window mock: title bar plus children. */
export const Browser: React.FC<{ x: number; y: number; w: number; h: number; from?: number; rot?: [number, number, number]; children?: React.ReactNode; glow?: string }> = ({ children, ...r }) => (
  <Glass {...r}>
    <div style={{ height: 44, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", background: "rgba(255,255,255,0.06)" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c, opacity: 0.8 }} />
      ))}
    </div>
    {children}
  </Glass>
);

/** Placeholder video tile (gradient + optional label/LIVE badge). */
export const Tile: React.FC<{ x: number; y: number; w: number; h: number; hue?: number; live?: boolean; label?: string; from?: number }> = ({ x, y, w, h, hue = 210, live, label, from = 0 }) => {
  const p = prog(useCurrentFrame(), from, from + 14);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 16, background: `linear-gradient(135deg, hsl(${hue} 60% 38%), hsl(${hue + 40} 55% 22%))`, opacity: p, transform: `scale(${0.94 + 0.06 * p})`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "44%", width: h * 0.3, height: h * 0.3, marginLeft: -h * 0.15, marginTop: -h * 0.15, borderRadius: "50%", background: "rgba(255,255,255,0.35)" }} />
      <div style={{ position: "absolute", left: "50%", top: "68%", width: h * 0.6, height: h * 0.4, marginLeft: -h * 0.3, borderRadius: "50% 50% 0 0", background: "rgba(255,255,255,0.22)" }} />
      {live && <div style={{ position: "absolute", left: 12, top: 12, padding: "4px 10px", borderRadius: 7, background: C.red, color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: UI }}>LIVE</div>}
      {label && <div style={{ position: "absolute", left: 12, bottom: 10, fontSize: 16, color: "#fff", fontFamily: UI, fontWeight: 600 }}>{label}</div>}
    </div>
  );
};

/** Phone mock with a gradient screen. */
export const PhoneMock: React.FC<{ x: number; y: number; w?: number; from?: number; rot?: [number, number, number]; hue?: number; children?: React.ReactNode }> = ({ x, y, w = 260, from = 0, rot = [0, 0, 0], hue = 240, children }) => (
  <Glass x={x} y={y} w={w} h={w * 2.05} from={from} rot={rot} radius={40} bg={`linear-gradient(170deg, hsl(${hue} 55% 30%), hsl(${hue + 30} 50% 14%))`} glow={`hsl(${hue} 80% 60%)`}>
    <div style={{ width: 70, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.3)", margin: "14px auto" }} />
    {children ?? <Skeleton rows={6} from={from + 10} accent={`hsl(${hue} 90% 70%)`} />}
  </Glass>
);

/** Chat/feed list: rows pop in one by one. */
export const ChatList: React.FC<{ x: number; y: number; w: number; items: { name: string; msg: string }[]; from?: number; per?: number; gold?: boolean }> = ({ x, y, w, items, from = 6, per = 14, gold }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((it, i) => {
        const p = prog(frame, from + i * per, from + i * per + 12);
        return (
          <div key={i} style={{ display: "flex", gap: 16, alignItems: "center", opacity: p, transform: `translateY(${(1 - p) * 20}px)`, padding: "14px 18px", borderRadius: 18, background: "rgba(255,255,255,0.07)", border: gold ? `1px solid ${C.gold}66` : undefined }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: `hsl(${(i * 67 + 180) % 360} 70% 55%)` }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>{it.name}</div>
              <div style={{ fontSize: 20, color: gold ? C.gold : C.dim }}>{it.msg}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Big gradient stat that counts up (centered on the canvas width). */
export const Stat: React.FC<{ cy?: number; value: number; prefix?: string; suffix?: string; decimals?: number; label?: string; from?: number; dur?: number; gold?: boolean; size?: number }> = ({ cy = H / 2, value, prefix = "$", suffix = "", decimals = 1, label, from = 4, dur = 36, gold, size = 230 }) => {
  const frame = useCurrentFrame();
  const v = value * prog(frame, from, from + dur);
  const p = prog(frame, from, from + 10);
  const g = gold ? GOLD : `linear-gradient(90deg, ${C.cyan}, ${C.blue})`;
  return (
    <>
      <div style={{ position: "absolute", left: 0, width: W, top: cy - size * 0.6, textAlign: "center", fontFamily: HEAD, fontWeight: 800, fontSize: size, letterSpacing: -6, opacity: p, filter: `drop-shadow(0 0 40px ${gold ? C.gold : C.blue}66)`, ...gradStyle(g) }}>
        {prefix}{v.toFixed(decimals)}{suffix}
      </div>
      {label && <div style={{ position: "absolute", left: 80, width: W - 160, top: cy + size * 0.7, textAlign: "center", fontSize: 40, color: C.dim, fontFamily: UI, opacity: prog(frame, from + dur - 8, from + dur + 8) }}>{label}</div>}
    </>
  );
};

/** Vertical fundraising meter that fills to a goal, with a goal-reached badge. */
export const Meter: React.FC<{ x: number; y: number; h?: number; value: number; goal: number; from?: number; dur?: number }> = ({ x, y, h = 620, value, goal, from = 6, dur = 50 }) => {
  const frame = useCurrentFrame();
  const fill = prog(frame, from, from + dur);
  const reached = prog(frame, from + dur, from + dur + 10);
  const cur = value + (goal - value) * reached;
  const pct = (value / goal) * fill + (1 - value / goal) * reached * fill;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 220 }}>
      <div style={{ textAlign: "center", fontFamily: HEAD, fontWeight: 800, fontSize: 44, color: C.text, marginBottom: 16 }}>${goal.toLocaleString()}</div>
      <div style={{ position: "relative", width: 140, height: h, margin: "0 auto", borderRadius: 26, background: "rgba(255,255,255,0.08)", border: `1px solid ${C.faint}`, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${pct * 100}%`, background: GOLD, boxShadow: `0 0 50px ${C.gold}` }} />
      </div>
      <div style={{ textAlign: "center", fontFamily: HEAD, fontWeight: 800, fontSize: 38, color: C.gold, marginTop: 16 }}>${Math.round(cur).toLocaleString()}</div>
      {reached > 0.5 && <div style={{ position: "absolute", left: -10, right: -10, top: -86, textAlign: "center", padding: "10px 0", borderRadius: 20, background: GOLD, color: "#2a1d00", fontWeight: 800, fontFamily: UI, fontSize: 22, transform: `scale(${reached})` }}>GOAL REACHED</div>}
    </div>
  );
};

/** Poll bars that fill. */
export const PollBars: React.FC<{ x: number; y: number; w: number; options: { label: string; pct: number }[]; from?: number }> = ({ x, y, w, options, from = 8 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, display: "flex", flexDirection: "column", gap: 26 }}>
      {options.map((o, i) => {
        const p = prog(frame, from + i * 8, from + i * 8 + 30);
        return (
          <div key={o.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: C.text, marginBottom: 8, fontFamily: UI }}>
              <span>{o.label}</span>
              <span style={{ color: C.teal, fontWeight: 600 }}>{Math.round(o.pct * p)}%</span>
            </div>
            <div style={{ height: 22, borderRadius: 11, background: "rgba(255,255,255,0.1)" }}>
              <div style={{ width: `${o.pct * p}%`, height: "100%", borderRadius: 11, background: GRAD }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Teal area chart that draws in, with a stat row above. */
export const AreaChart: React.FC<{ x: number; y: number; w: number; h: number; data: number[]; stats?: { label: string; value: string }[]; from?: number }> = ({ x, y, w, h, data, stats, from = 6 }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, from, from + 50);
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const pts = data.map((v, i) => [(w * i) / (data.length - 1), h - ((v - lo) / (hi - lo || 1)) * h * 0.85 - h * 0.05]);
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w }}>
      {stats && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 30 }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 22, color: C.dim, fontFamily: UI }}>{s.label}</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: C.text, fontFamily: HEAD }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.teal} stopOpacity={0.45} />
            <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
          </linearGradient>
          <clipPath id="areaClip"><rect x={0} y={-20} width={w * p} height={h + 40} /></clipPath>
        </defs>
        <g clipPath="url(#areaClip)">
          <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#areaFill)" />
          <path d={line} fill="none" stroke={C.teal} strokeWidth={6} strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
};

/** Glowing prompt input that types a request, then reveals generated rows beneath it. */
export const PromptBox: React.FC<{ y: number; text: string; rows?: string[]; from?: number }> = ({ y, text, rows = [], from = 4 }) => {
  const frame = useCurrentFrame();
  const p = usePop(from, 14);
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - from - 8) * 0.9)));
  return (
    <>
      <div style={{ position: "absolute", left: 70, width: W - 140, top: y, minHeight: 190, padding: 34, borderRadius: 30, background: "rgba(20,40,160,0.55)", border: `3px solid ${C.cyan}`, boxShadow: `0 0 70px ${C.blue}, inset 0 0 40px ${C.blue}55`, opacity: p, transform: `scale(${0.92 + 0.08 * p})`, fontFamily: UI, fontSize: 38, color: "#fff", lineHeight: 1.3 }}>
        {text.slice(0, n)}<span style={{ opacity: frame % 20 < 10 ? 1 : 0 }}>|</span>
      </div>
      {rows.map((r, i) => {
        const q = prog(frame, from + 8 + text.length / 0.9 + i * 8, from + 8 + text.length / 0.9 + i * 8 + 12);
        return (
          <div key={r} style={{ position: "absolute", left: 100, width: W - 200, top: y + 250 + i * 86, padding: "20px 28px", borderRadius: 20, background: "rgba(255,255,255,0.08)", border: `1px solid ${C.faint}`, color: C.text, fontSize: 30, fontFamily: UI, opacity: q, transform: `translateY(${(1 - q) * 20}px)` }}>
            {r}
          </div>
        );
      })}
    </>
  );
};

/** CTA button with an animated cursor that clicks it. */
export const Button: React.FC<{ cy?: number; label: string; from?: number; click?: number; w?: number }> = ({ cy = 1100, label, from = 4, click = 44, w = 720 }) => {
  const frame = useCurrentFrame();
  const cx = W / 2;
  const p = usePop(from, 12);
  const press = prog(frame, click, click + 4) - prog(frame, click + 6, click + 12);
  const cur = prog(frame, from + 12, click);
  const ripple = prog(frame, click, click + 26);
  return (
    <>
      <div style={{ position: "absolute", left: cx - w / 2, top: cy - 62, width: w, height: 124, borderRadius: 32, background: `linear-gradient(180deg, ${C.indigo}, #3a3fd8)`, boxShadow: `0 0 ${50 + 40 * press}px ${C.indigo}`, color: "#fff", fontFamily: UI, fontWeight: 600, fontSize: 44, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${(0.8 + 0.2 * p) * (1 - 0.05 * press)})`, opacity: p }}>
        {label}
      </div>
      {ripple > 0 && ripple < 1 && <div style={{ position: "absolute", left: cx + 100 - 160 * ripple, top: cy + 20 - 160 * ripple, width: 320 * ripple, height: 320 * ripple, borderRadius: "50%", border: `4px solid ${C.cyan}`, opacity: 1 - ripple }} />}
      <svg width={64} height={64} viewBox="0 0 24 24" style={{ position: "absolute", left: cx + 420 - 320 * cur, top: cy + 260 - 220 * cur, opacity: p, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" }}>
        <path d="M5 3 L5 19 L9.5 15 L12.5 21 L15 20 L12 14 L18 14 Z" fill="#fff" stroke="#000" strokeWidth={1} />
      </svg>
    </>
  );
};

/** Logo reveal: layered hexagon mark in pulsing rings, wordmark stacked one word per line. Pass your own name. */
export const Logo: React.FC<{ cy?: number; name: string; sub?: string; from?: number; scale?: number; rings?: boolean }> = ({ cy = 760, name, sub, from = 0, scale = 1, rings = true }) => {
  const frame = useCurrentFrame();
  const cx = W / 2;
  const p = usePop(from, 14);
  const hex = (r: number) => Array.from({ length: 6 }, (_, i) => `${r * Math.cos((Math.PI / 3) * i - Math.PI / 6)},${r * Math.sin((Math.PI / 3) * i - Math.PI / 6)}`).join(" ");
  const words = name.toUpperCase().split(" ");
  const wp = prog(frame, from + 14, from + 30);
  return (
    <>
      {rings && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {[0, 1, 2].map((i) => {
            const t = ((((frame - from) / 80 + i / 3) % 1) + 1) % 1;
            return <circle key={i} cx={cx} cy={cy} r={140 + t * 460} fill="none" stroke={C.teal} strokeWidth={2} opacity={(1 - t) * 0.4 * prog(frame, from, from + 10)} />;
          })}
        </svg>
      )}
      <svg width={260 * scale} height={260 * scale} viewBox="-110 -110 220 220" style={{ position: "absolute", left: cx - 130 * scale, top: cy - 130 * scale, opacity: p, transform: `scale(${0.7 + 0.3 * p})`, filter: `drop-shadow(0 0 24px ${C.teal})` }}>
        {[88, 66, 44].map((r, i) => (
          <polygon key={r} points={hex(r)} fill="none" stroke={i === 1 ? C.cyan : C.teal} strokeWidth={9} strokeLinejoin="round" transform={`translate(0 ${(i - 1) * 8})`} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 0, width: W, top: cy + 150 * scale, textAlign: "center", fontFamily: WIDE, fontSize: 64 * scale, lineHeight: 1.25, letterSpacing: 10 * scale, color: C.text, opacity: wp, transform: `translateY(${(1 - wp) * 20}px)` }}>
        {words.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      {sub && <div style={{ position: "absolute", left: 80, width: W - 160, top: cy + 150 * scale + words.length * 80 * scale + 30, textAlign: "center", fontFamily: UI, fontSize: 38, color: C.dim, opacity: prog(frame, from + 30, from + 46) }}>{sub}</div>}
    </>
  );
};

/** Center tile with destination nodes around it and data dots flowing outward (multistream). */
export const Hub: React.FC<{ cy: number; nodes: string[]; rx?: number; ry?: number; from?: number }> = ({ cy, nodes, rx = 380, ry = 470, from = 6 }) => {
  const frame = useCurrentFrame();
  const cx = W / 2;
  const pos = (i: number) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as const;
  };
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {nodes.map((_, i) => {
          const [nx, ny] = pos(i);
          const p = prog(frame, from + 16 + i * 5, from + 34 + i * 5);
          const t = ((frame - from) / 40 + i * 0.2) % 1;
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={cx + (nx - cx) * p} y2={cy + (ny - cy) * p} stroke={C.teal} strokeWidth={3} opacity={0.5} />
              {p >= 1 && <circle cx={cx + (nx - cx) * t} cy={cy + (ny - cy) * t} r={9} fill={C.cyan} />}
            </g>
          );
        })}
      </svg>
      {nodes.map((label, i) => {
        const [nx, ny] = pos(i);
        const p = prog(frame, from + 28 + i * 5, from + 42 + i * 5);
        return (
          <div key={label} style={{ position: "absolute", left: nx - 100, top: ny - 30, width: 200, textAlign: "center", padding: "14px 0", borderRadius: 18, background: "rgba(255,255,255,0.09)", border: `1px solid ${C.faint}`, color: C.text, fontSize: 26, fontFamily: UI, fontWeight: 600, opacity: p, transform: `scale(${0.8 + 0.2 * p})` }}>
            {label}
          </div>
        );
      })}
    </>
  );
};

/** Stack of stat cards (tile + value + caption), top to bottom. */
export const StatCards: React.FC<{ y: number; items: { value: string; label: string }[]; from?: number }> = ({ y, items, from = 6 }) => (
  <>
    {items.map((it, i) => (
      <Glass key={it.label} x={70} y={y + i * 290} w={940} h={250} from={from + i * 8} glow={C.indigo}>
        <Tile x={26} y={26} w={300} h={198} hue={200 + i * 45} from={from + i * 8 + 6} />
        <div style={{ position: "absolute", left: 362, top: 44 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 84, letterSpacing: -2, ...gradStyle(GOLD) }}>{it.value}</div>
          <div style={{ fontSize: 28, color: C.dim, marginTop: 4, fontFamily: UI }}>{it.label}</div>
        </div>
      </Glass>
    ))}
  </>
);

/** Small "sample data" tag for template scenes that show placeholder numbers. Remove for real data. */
export const SampleTag: React.FC = () => (
  <div style={{ position: "absolute", left: 0, width: W, top: 1530, textAlign: "center", fontFamily: UI, fontSize: 22, letterSpacing: 6, color: C.dim }}>SAMPLE DATA</div>
);
