import React from "react";
import { Cut, P, W, H, rng, mix, lighten, darken, path } from "./paper";

/* ---------- sky ---------- */
export const Sky: React.FC<{ top: string; bot: string; id: string }> = ({ top, bot, id }) => (
  <>
    <defs>
      <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bot} />
      </linearGradient>
    </defs>
    <rect x={-100} width={W + 200} height={H} fill={`url(#sky-${id})`} />
  </>
);

export const Stars: React.FC<{ n: number; seed: number; t: number; ymax?: number; color?: string }> = ({ n, seed, t, ymax = 330, color = "#ffe9a8" }) => {
  const r = rng(seed);
  return (
    <g fill={color}>
      {Array.from({ length: n }, (_, i) => {
        const x = r() * W;
        const y = r() * ymax;
        const s = 2 + r() * 5;
        const tw = 0.55 + 0.45 * Math.sin(t * (1 + r() * 2) + i);
        const k = s * 0.22;
        return <path key={i} d={path([[x, y - s], [x + k, y - k], [x + s, y], [x + k, y + k], [x, y + s], [x - k, y + k], [x - s, y], [x - k, y - k]])} opacity={tw} />;
      })}
    </g>
  );
};

export const Moon: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <g>
    <circle cx={x} cy={y} r={r * 2.4} fill="url(#glow-w)" opacity={0.45} style={{ mixBlendMode: "screen" }} />
    <circle cx={x} cy={y} r={r} fill="#f2e2a6" stroke="rgba(255,255,255,.3)" />
    <circle cx={x - r * 0.1} cy={y + r * 0.05} r={r * 0.86} fill="#f7ebbd" />
    <circle cx={x + r * 0.3} cy={y - r * 0.25} r={r * 0.18} fill="#e6d38c" />
    <circle cx={x - r * 0.3} cy={y + r * 0.3} r={r * 0.24} fill="#e9d894" />
    <circle cx={x + r * 0.15} cy={y + r * 0.5} r={r * 0.12} fill="#e6d38c" />
  </g>
);

export const Sun: React.FC<{ x: number; y: number; r: number; t: number; rays?: boolean; color?: string }> = ({ x, y, r, t, rays = true, color = "#ffd75e" }) => (
  <g>
    <circle cx={x} cy={y} r={r * 4.5} fill="url(#glow-w)" style={{ mixBlendMode: "screen" }} />
    {rays && (
      <g transform={`translate(${x} ${y}) rotate(${t * 3})`} style={{ mixBlendMode: "screen" }}>
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={path([[0, 0], [-r * 0.5, -r * 5], [r * 0.5, -r * 5]])} transform={`rotate(${(i * 360) / 16})`} fill="#ffe9a0" opacity={0.2} />
        ))}
      </g>
    )}
    <circle cx={x} cy={y} r={r * 1.15} fill={lighten(color, 0.4)} />
    <circle cx={x} cy={y} r={r} fill={color} stroke="rgba(255,255,255,.4)" />
  </g>
);

export const Clouds: React.FC<{ y: number; seed: number; n: number; a: string; b: string; t: number; speed?: number; size?: number }> = ({ y, seed, n, a, b, t, speed = 6, size = 1 }) => {
  const r = rng(seed);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const w = (200 + r() * 160) * size;
        const x0 = r() * (W + 400) - 200;
        const x = ((x0 + t * speed * (0.6 + r() * 0.8) + 300) % (W + 600)) - 300;
        const yy = y + r() * 90 * size - 40;
        const bumps = 6;
        const mk = (sc: number, dy: number): P[] => {
          const pts: P[] = [[x - (w / 2) * sc, yy + dy + 26 * sc]];
          for (let k = 0; k <= bumps * 4; k++) {
            const u = k / (bumps * 4);
            const px = x - (w / 2) * sc + u * w * sc;
            const hump = Math.abs(Math.sin(u * Math.PI * bumps * 0.5 + 0.6)) * 0.7 + 0.3;
            const env = Math.sin(u * Math.PI) ** 0.6;
            pts.push([px, yy + dy - hump * env * 62 * sc * size]);
          }
          pts.push([x + (w / 2) * sc, yy + dy + 26 * sc]);
          return pts;
        };
        return (
          <g key={i} filter="url(#sh-s)">
            <Cut p={mk(1, 0)} fill={b} />
            <Cut p={mk(0.82, -6)} fill={a} />
            <Cut p={mk(0.55, -14)} fill={lighten(a, 0.35)} />
          </g>
        );
      })}
    </>
  );
};

/* ---------- landforms ---------- */
export const Mountains: React.FC<{
  base: number; seed: number; count: number; hMin: number; hMax: number; lit: string; shade: string;
  snow?: boolean; snowLit?: string; snowShade?: string; x0?: number; x1?: number; snowLine?: number;
}> = ({ base, seed, count, hMin, hMax, lit, shade, snow, snowLit = "#ffffff", snowShade = "#c9d3ee", x0 = -80, x1 = W + 80, snowLine = 0.4 }) => {
  const r = rng(seed);
  const step = (x1 - x0) / count;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const px = x0 + step * (i + 0.5) + (r() - 0.5) * step * 0.5;
        const h = hMin + r() * (hMax - hMin);
        const py = base - h;
        const half = step * (0.85 + r() * 0.5);
        const lx = px - half;
        const rx = px + half;
        const ck = px + (r() - 0.35) * half * 0.35;
        const sy = py + h * snowLine;
        const xl = px - (half * (sy - py)) / h;
        const xr1 = px + ((ck - px) * (sy - py)) / h;
        const xr2 = px + (half * (sy - py)) / h;
        const zig = (a: number, b: number, up: boolean): P[] => {
          const out: P[] = [];
          const n = 4;
          for (let k = 1; k < n; k++) out.push([a + ((b - a) * k) / n, sy + (k % 2 ? 12 : -8) * (up ? 1 : -1) + (r() - 0.5) * 6]);
          return out;
        };
        return (
          <g key={i}>
            <Cut p={[[lx, base + 4], [px, py], [ck, base + 4]]} fill={lit} />
            <Cut p={[[ck, base + 4], [px, py], [rx, base + 4]]} fill={shade} />
            <Cut p={[[px, py], [px - half * 0.28, base + 4], [ck, base + 4]]} fill={mix(lit, shade, 0.45)} opacity={0.7} />
            {snow && (
              <>
                <Cut p={[[px, py], [xl, sy], ...zig(xl, xr1, true), [xr1, sy]]} fill={snowLit} />
                <Cut p={[[px, py], [xr1, sy], ...zig(xr1, xr2, false), [xr2, sy]]} fill={snowShade} />
              </>
            )}
          </g>
        );
      })}
    </>
  );
};

export const Hills: React.FC<{ base: number; amp: number; seed: number; color: string; hi: string; t?: number; freq?: number }> = ({ base, amp, seed, color, hi, freq = 1 }) => {
  const r = rng(seed);
  const a1 = r() * 6;
  const a2 = r() * 6;
  const pts: P[] = [];
  for (let x = -60; x <= W + 60; x += 20) pts.push([x, base - amp * (0.6 * Math.sin(x * 0.004 * freq + a1) + 0.4 * Math.sin(x * 0.011 * freq + a2))]);
  const hip: P[] = pts.map(([x, y]) => [x, y + 10] as P);
  return (
    <>
      <Cut p={[...pts, [W + 60, H + 20], [-60, H + 20]]} fill={hi} />
      <Cut p={[...hip, [W + 60, H + 20], [-60, H + 20]]} fill={color} />
    </>
  );
};

const Fir: React.FC<{ x: number; y: number; s: number; lit: string; shade: string }> = ({ x, y, s, lit, shade }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Cut p={[[-3, 0], [3, 0], [3, -14], [-3, -14]]} fill="#3b2a22" />
    {[0, 1, 2, 3].map((k) => {
      const w = 34 - k * 7;
      const yb = -10 - k * 22;
      const yt = yb - 34;
      return (
        <g key={k}>
          <Cut p={[[-w, yb], [0, yt], [2, yb]]} fill={lit} />
          <Cut p={[[2, yb], [0, yt], [w, yb]]} fill={shade} />
        </g>
      );
    })}
  </g>
);

export const Firs: React.FC<{ base: number; seed: number; count: number; size: number; lit: string; shade: string; x0?: number; x1?: number; jit?: number }> = ({ base, seed, count, size, lit, shade, x0 = -40, x1 = W + 40, jit = 14 }) => {
  const r = rng(seed);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = x0 + ((x1 - x0) * (i + r() * 0.6)) / count;
        return <Fir key={i} x={x} y={base + (r() - 0.5) * jit} s={size * (0.8 + r() * 0.5)} lit={darken(lit, r() * 0.12)} shade={darken(shade, r() * 0.12)} />;
      })}
    </>
  );
};

export const BigTrunk: React.FC<{ x: number; w: number; top?: number; bot?: number; seed: number; cols?: [string, string, string]; lean?: number }> = ({ x, w, top = -40, bot = H + 40, seed, cols = ["#6a2f1a", "#4a1f12", "#2f130c"], lean = 0 }) => {
  const r = rng(seed);
  const strips = 5;
  return (
    <g>
      {Array.from({ length: strips }, (_, i) => {
        const a = x + (w * i) / strips;
        const b = x + (w * (i + 1)) / strips;
        const c = cols[Math.min(2, Math.floor((i / strips) * 3))];
        return <Cut key={i} p={[[a + lean, top], [b + lean, top], [b, bot], [a, bot]]} fill={darken(c, r() * 0.12)} />;
      })}
      {Array.from({ length: 9 }, (_, i) => {
        const yy = top + 60 + r() * (bot - top - 100);
        const xx = x + r() * w * 0.8;
        return <Cut key={`g${i}`} p={[[xx, yy], [xx + 5, yy + 40 + r() * 40], [xx - 4, yy + 20]]} fill="#1f0d08" opacity={0.5} edge={false} />;
      })}
    </g>
  );
};

export const Rock: React.FC<{ x: number; y: number; w: number; h: number; seed: number; lit?: string; shade?: string; moss?: string | null }> = ({ x, y, w, h, seed, lit = "#7d7468", shade = "#4a443d", moss = null }) => {
  const r = rng(seed);
  const top: P[] = [[x, y], [x + w * 0.18, y - h * (0.85 + r() * 0.15)], [x + w * 0.5, y - h], [x + w * 0.82, y - h * (0.8 + r() * 0.2)], [x + w, y]];
  const ridge: P = [x + w * (0.4 + r() * 0.2), y - h * 0.55];
  return (
    <g>
      <Cut p={[...top.slice(0, 3), ridge, [x + w * 0.35, y]]} fill={lit} />
      <Cut p={[top[2], top[3], top[4], [x + w * 0.65, y], ridge]} fill={shade} />
      <Cut p={[ridge, [x + w * 0.65, y], [x + w * 0.35, y]]} fill={darken(shade, 0.25)} />
      {moss && <Cut p={[top[1], top[2], top[3], [x + w * 0.6, y - h * 0.8], [x + w * 0.3, y - h * 0.78]]} fill={moss} />}
    </g>
  );
};

/** Flat-topped cliff ledge for the fox to stand on: columns of stone with a mossy cap. */
export const Ledge: React.FC<{ x0: number; x1: number; y: number; bottom?: number; seed: number; lit?: string; shade?: string; cap?: string; snow?: boolean }> = ({ x0, x1, y, bottom = H + 30, seed, lit = "#8a7e70", shade = "#554c42", cap = "#b8b738", snow }) => {
  const r = rng(seed);
  const n = Math.max(2, Math.round((x1 - x0) / 85));
  const bw = (x1 - x0) / n;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const a = x0 + bw * i;
        const b = a + bw;
        const off = (r() - 0.5) * 16;
        const mid = a + bw * (0.45 + r() * 0.2);
        return (
          <g key={i}>
            <Cut p={[[a, y + off * 0.3], [mid, y + 8], [mid, bottom], [a, bottom]]} fill={darken(lit, r() * 0.1)} />
            <Cut p={[[mid, y + 8], [b, y + off * 0.3], [b, bottom], [mid, bottom]]} fill={darken(shade, r() * 0.1)} />
            <Cut p={[[a + 6, y + 60 + r() * 60], [mid, y + 90 + r() * 40], [mid - 2, y + 120 + r() * 50]]} fill={darken(shade, 0.25)} opacity={0.45} edge={false} />
          </g>
        );
      })}
      {snow ? (
        <Cut p={[[x0 - 8, y + 4], [x0 + 10, y - 14], [x1 - 14, y - 12], [x1 + 8, y + 4], ...Array.from({ length: n * 2 }, (_, i) => [x1 - ((x1 - x0) * (i + 0.5)) / (n * 2), y + 4 + (i % 2 ? 22 : 8)] as P)]} fill="#ffffff" />
      ) : (
        <Cut p={[[x0 - 6, y + 6], [x0 + 12, y - 10], [x1 - 14, y - 9], [x1 + 6, y + 6], ...Array.from({ length: n * 2 }, (_, i) => [x1 - ((x1 - x0) * (i + 0.5)) / (n * 2), y + 6 + (i % 2 ? 20 : 6)] as P)]} fill={cap} />
      )}
    </g>
  );
};

/* ---------- water ---------- */
export const Water: React.FC<{ y: number; bottom?: number; deep: string; mid: string; foam: string; t: number; speed?: number; amp?: number; rows?: number; seed?: number; x0?: number; x1?: number }> = ({ y, bottom = H + 20, deep, mid, foam, t, speed = 30, amp = 5, rows = 7, seed = 2, x0 = -60, x1 = W + 60 }) => {
  const r = rng(seed);
  const hgt = bottom - y;
  const ribbon = (yy: number, th: number, f: number, ph: number, a: number): P[] => {
    const top: P[] = [];
    const bot: P[] = [];
    for (let x = x0; x <= x1; x += 24) {
      const w = a * Math.sin(x * f + ph) + a * 0.5 * Math.sin(x * f * 2.3 + ph * 1.7);
      top.push([x, yy + w]);
      bot.push([x, yy + w + th * (0.7 + 0.3 * Math.sin(x * f * 1.5 + ph))]);
    }
    return [...top, ...bot.reverse()];
  };
  return (
    <g>
      <Cut p={[[x0, y], [x1, y], [x1, bottom], [x0, bottom]]} fill={deep} />
      {Array.from({ length: rows }, (_, i) => {
        const u = (i + 0.5) / rows;
        const yy = y + hgt * u * u + 4;
        const th = 5 + u * 20;
        const f = 0.012 - u * 0.005;
        return <Cut key={i} p={ribbon(yy, th, f, r() * 6 + t * speed * (0.01 + u * 0.02) * (i % 2 ? 1 : -1), amp * (0.4 + u))} fill={i % 3 === 0 ? foam : mid} opacity={i % 3 === 0 ? 0.8 : 0.9} />;
      })}
    </g>
  );
};

export const Glitter: React.FC<{ x: number; y0: number; y1: number; t: number; color?: string }> = ({ x, y0, y1, t, color = "#ffe9a0" }) => (
  <g style={{ mixBlendMode: "screen" }} fill={color}>
    {Array.from({ length: 16 }, (_, i) => {
      const u = i / 15;
      const yy = y0 + (y1 - y0) * u;
      const w = 12 + u * 90;
      const sh = Math.sin(t * 2 + i * 1.7) * 8;
      return <rect key={i} x={x - w / 2 + sh} y={yy} width={w * (0.5 + 0.5 * Math.sin(t * 1.3 + i) ** 2)} height={2.5 + u * 3} opacity={0.35 + 0.4 * (1 - u)} />;
    })}
  </g>
);

export const Waterfall: React.FC<{ x: number; y0: number; y1: number; w: number; t: number; deep?: string; foam?: string }> = ({ x, y0, y1, w, t, deep = "#3f74d8", foam = "#f4fbff" }) => {
  const n = Math.max(3, Math.round(w / 9));
  const sw = w / n;
  return (
    <g>
      <Cut p={[[x, y0], [x + w, y0], [x + w + 6, y1], [x - 6, y1]]} fill={deep} />
      {Array.from({ length: n }, (_, i) => {
        const dash = 40 + ((i * 37) % 50);
        return (
          <line key={i} x1={x + sw * (i + 0.5)} y1={y0} x2={x + sw * (i + 0.5) + (i - n / 2) * 0.6} y2={y1}
            stroke={i % 2 ? foam : "#9cc7ff"} strokeWidth={sw * 0.7} strokeDasharray={`${dash} ${dash * 0.8}`} strokeDashoffset={-t * (150 + i * 9)} />
        );
      })}
      <ellipse cx={x + w / 2} cy={y1 + 2} rx={w * 0.8} ry={10} fill={foam} opacity={0.85} />
      {Array.from({ length: 6 }, (_, i) => (
        <circle key={i} cx={x + w / 2 + Math.sin(t * 1.2 + i * 2) * w * 0.6} cy={y1 - 4 - ((t * 20 + i * 11) % 28)} r={6 + (i % 3) * 3} fill={foam} opacity={0.55} />
      ))}
    </g>
  );
};

/* ---------- plants ---------- */
export const Flower: React.FC<{ x: number; y: number; s: number; petal: string; core: string; kind?: "daisy" | "cone"; t: number; seed?: number }> = ({ x, y, s, petal, core, kind = "daisy", t, seed = 1 }) => {
  const sway = Math.sin(t * 1.1 + seed) * 3;
  const n = kind === "daisy" ? 9 : 12;
  return (
    <g transform={`translate(${x} ${y}) rotate(${sway})`}>
      <Cut p={[[-2 * s, 0], [2 * s, 0], [1.5 * s, -46 * s], [-1.5 * s, -46 * s]]} fill="#2f6b2a" edge={false} />
      <g transform={`translate(0 ${-48 * s})`}>
        {Array.from({ length: n }, (_, i) => {
          const L2 = (kind === "daisy" ? 17 : 24) * s;
          const wd = (kind === "daisy" ? 5 : 5.5) * s;
          return <g key={i} transform={`rotate(${(i * 360) / n + (kind === "cone" ? 0 : 10)})`}><Cut p={[[0, 0], [L2 * 0.5, -wd], [L2, 0], [L2 * 0.5, wd]]} fill={i % 2 ? petal : darken(petal, 0.1)} /></g>;
        })}
        <circle r={(kind === "daisy" ? 6 : 8) * s} fill={core} stroke="rgba(255,255,255,.3)" />
        {kind === "cone" && <circle r={4 * s} fill={darken(core, 0.2)} />}
      </g>
    </g>
  );
};

export const Fern: React.FC<{ x: number; y: number; s: number; ang: number; t: number; lit: string; shade: string; seed?: number }> = ({ x, y, s, ang, t, lit, shade, seed = 0 }) => {
  const sway = Math.sin(t * 0.9 + seed) * 2.5;
  const leaves = 11;
  return (
    <g transform={`translate(${x} ${y}) rotate(${ang + sway}) scale(${s})`}>
      {Array.from({ length: leaves }, (_, i) => {
        const u = i / leaves;
        const px = Math.sin(u * 1.6) * 30;
        const py = -u * 120;
        const sz = 34 * (1 - u * 0.75);
        return (
          <g key={i} transform={`translate(${px} ${py})`}>
            <Cut p={[[0, 0], [-sz, -sz * 0.3], [-2, -sz * 0.45]]} fill={lit} />
            <Cut p={[[0, 0], [sz, -sz * 0.3], [2, -sz * 0.45]]} fill={shade} />
          </g>
        );
      })}
      <Cut p={[[-1.5, 0], [1.5, 0], [30, -118], [27, -118]]} fill={shade} edge={false} />
    </g>
  );
};

export const Mushroom: React.FC<{ x: number; y: number; s: number; cap?: string }> = ({ x, y, s, cap = "#d62b24" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Cut p={[[-14, 0], [14, 0], [10, -40], [-10, -40]]} fill="#f1e4cc" />
    <Cut p={[[2, 0], [14, 0], [10, -40], [2, -40]]} fill="#d8c8a8" />
    <Cut p={[[-62, -36], [-46, -70], [0, -86], [46, -70], [62, -36], [30, -30], [-30, -30]]} fill={cap} />
    <Cut p={[[0, -86], [46, -70], [62, -36], [30, -30], [10, -50]]} fill={darken(cap, 0.18)} />
    {[[-30, -62, 8], [4, -74, 7], [34, -56, 8], [-8, -48, 6], [-46, -46, 5]].map(([a, b, c], i) => (
      <circle key={i} cx={a} cy={b} r={c} fill="#fff4e4" />
    ))}
  </g>
);

export const Leaf: React.FC<{ x: number; y: number; s: number; ang: number; lit: string; shade: string }> = ({ x, y, s, ang, lit, shade }) => (
  <g transform={`translate(${x} ${y}) rotate(${ang}) scale(${s})`}>
    <Cut p={[[0, 0], [-30, -50], [0, -110], [0, -50]]} fill={lit} />
    <Cut p={[[0, 0], [30, -50], [0, -110], [0, -50]]} fill={shade} />
  </g>
);

export const Berries: React.FC<{ x: number; y: number; s: number; seed: number }> = ({ x, y, s, seed }) => {
  const r = rng(seed);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Cut p={[[-2, 0], [2, 0], [2, -60], [-2, -60]]} fill="#2f6b2a" edge={false} />
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={(r() - 0.5) * 30} cy={-70 + r() * 40} r={4} fill="#d7382c" stroke="rgba(255,255,255,.3)" />
      ))}
    </g>
  );
};

/* ---------- special features ---------- */
export const Icicles: React.FC<{ seed: number; color: string; n?: number }> = ({ seed, color, n = 26 }) => {
  const r = rng(seed);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = (W * (i + r() * 0.8)) / n;
        const h = 40 + r() * 120;
        const w = 14 + r() * 22;
        return (
          <g key={i}>
            <Cut p={[[x - w, 0], [x, h], [x + 2, 0]]} fill={lighten(color, 0.25)} />
            <Cut p={[[x + 2, 0], [x, h], [x + w, 0]]} fill={color} />
          </g>
        );
      })}
    </>
  );
};

export const Crystal: React.FC<{ x: number; y: number; w: number; h: number; tilt?: number; lit?: string; shade?: string }> = ({ x, y, w, h, tilt = 0, lit = "#bfe3ff", shade = "#4f8fe0" }) => (
  <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
    <Cut p={[[-w / 2, 0], [-w / 2, -h * 0.75], [0, -h], [0, 0]]} fill={lit} />
    <Cut p={[[0, 0], [0, -h], [w / 2, -h * 0.78], [w / 2, 0]]} fill={shade} />
    <Cut p={[[-w / 2, -h * 0.75], [0, -h], [-w * 0.1, -h * 0.55]]} fill="#ffffff" opacity={0.7} />
  </g>
);

export const Aurora: React.FC<{ t: number; y: number }> = ({ t, y }) => {
  const band = (k: number, c1: string, c2: string, op: number) => {
    const top: P[] = [];
    const bot: P[] = [];
    for (let x = -40; x <= W + 40; x += 20) {
      const w = Math.sin(x * 0.006 + t * 0.5 + k * 1.7) * 60 + Math.sin(x * 0.017 + t * 0.9 + k) * 22;
      const len = 150 + Math.sin(x * 0.01 + k * 2 + t * 0.4) * 55;
      top.push([x, y + w + k * 28]);
      bot.push([x, y + w + k * 28 + len]);
    }
    return (
      <g key={k} opacity={op}>
        <defs>
          <linearGradient id={`au-${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c2} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path([...top, ...bot.reverse()])} fill={`url(#au-${k})`} stroke="rgba(220,255,240,.25)" />
      </g>
    );
  };
  return (
    <g style={{ mixBlendMode: "screen" }} filter="url(#sh-s)">
      {band(0, "#37e0a0", "#2a8fbf", 0.85)}
      {band(1, "#6af0b8", "#3a6fd0", 0.7)}
      {band(2, "#2fbf8a", "#6b4fc0", 0.6)}
    </g>
  );
};

export const StonePortal: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  const block = (bx: number, by: number, bw: number, bh: number, i: number) => (
    <g key={`${bx}-${by}`}>
      <Cut p={[[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]]} fill={i % 2 ? "#8c8576" : "#9a9382"} />
      <Cut p={[[bx + bw * 0.7, by], [bx + bw, by], [bx + bw, by + bh], [bx + bw * 0.7, by + bh]]} fill="#6e6759" />
    </g>
  );
  const pillar = (px: number, h: number, w: number) => (
    <g>
      {Array.from({ length: Math.round(h / 36) }, (_, i) => block(px, y - (i + 1) * 36, w, 36, i + px))}
      <Cut p={[[px - 6, y - h - 12], [px + w + 6, y - h - 12], [px + w + 6, y - h], [px - 6, y - h]]} fill="#b0a894" />
    </g>
  );
  const pulse = 1 + Math.sin(t * 2) * 0.04;
  return (
    <g>
      <circle cx={x} cy={y - 150} r={210} fill="url(#glow-w)" style={{ mixBlendMode: "screen" }} opacity={0.9} />
      {pillar(x - 190, 240, 46)}
      {pillar(x + 144, 240, 46)}
      {pillar(x - 130, 300, 38)}
      {pillar(x + 92, 300, 38)}
      <g transform={`translate(${x} ${y - 150}) scale(${pulse})`}>
        <circle r={112} fill="#6b5a2a" />
        <circle r={104} fill="#e2b341" />
        <circle r={92} fill="#8a6b22" />
        <circle r={84} fill="#ffd96a" />
        <circle r={70} fill="url(#glow-w)" />
        {Array.from({ length: 12 }, (_, i) => (
          <Cut key={i} p={[[0, -92], [6, -104], [-6, -104]]} fill="#fff1b0" />
        ))}
      </g>
      {/* steps */}
      {[0, 1, 2, 3].map((i) => (
        <Cut key={i} p={[[x - 140 + i * 8, y - i * 14], [x + 140 - i * 8, y - i * 14], [x + 140 - i * 8, y - i * 14 + 14], [x - 140 + i * 8, y - i * 14 + 14]]} fill={i % 2 ? "#aaa391" : "#b9b2a0"} />
      ))}
    </g>
  );
};

export const Bridge: React.FC<{ x0: number; x1: number; y: number }> = ({ x0, x1, y }) => {
  const n = 9;
  const bw = (x1 - x0) / n;
  return (
    <g>
      <Cut p={[[x0, y + 6], [x1, y + 6], [x1, y + 70], [(x0 + x1) / 2 + 90, y + 40], [(x0 + x1) / 2 - 90, y + 40], [x0, y + 70]]} fill="#7a4a2a" />
      {Array.from({ length: n }, (_, i) => (
        <Cut key={i} p={[[x0 + bw * i + 1, y], [x0 + bw * (i + 1) - 1, y], [x0 + bw * (i + 1) - 1, y + 10], [x0 + bw * i + 1, y + 10]]} fill={i % 2 ? "#b27a45" : "#c28850"} />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const px = x0 + 20 + ((x1 - x0 - 40) * i) / 4;
        return <Cut key={`p${i}`} p={[[px - 4, y], [px + 4, y], [px + 4, y - 50], [px - 4, y - 50]]} fill="#6a3f23" />;
      })}
      <Cut p={[[x0 + 16, y - 52], [x1 - 16, y - 52], [x1 - 16, y - 44], [x0 + 16, y - 44]]} fill="#8d5a32" />
    </g>
  );
};

export const Waves: React.FC<{ y: number; t: number; deep: string; mid: string; foam: string }> = ({ y, t, deep, mid, foam }) => {
  const wave = (yy: number, a: number, f: number, sp: number, col: string, crest: boolean) => {
    const top: P[] = [];
    for (let x = -40; x <= W + 40; x += 16) top.push([x, yy + a * Math.sin(x * f + t * sp) + a * 0.45 * Math.sin(x * f * 2.4 + t * sp * 1.4)]);
    return (
      <g>
        <Cut p={[...top, [W + 40, H + 20], [-40, H + 20]]} fill={col} />
        {crest && <path d={"M" + top.map((p) => p.join(" ")).join("L")} fill="none" stroke={foam} strokeWidth={9} strokeLinejoin="round" opacity={0.85} />}
      </g>
    );
  };
  return (
    <g>
      {wave(y, 14, 0.008, 1.4, deep, true)}
      {wave(y + 60, 22, 0.006, 1.8, mid, true)}
      {wave(y + 130, 28, 0.005, 2.2, darken(deep, 0.15), true)}
    </g>
  );
};
