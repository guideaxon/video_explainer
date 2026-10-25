/**
 * Clay style bundle: surface textures BAKED ONCE in code. Each texture is seeded noise drawn to an offscreen canvas
 * (lumps, fingerprint whorls and tool marks for plasticine; fibres for felt; flutes for cardboard), exported as a PNG
 * data URL and cached for the page. The kit uses them as tiled SVG <pattern>s laid over the shaded shapes, so a frame
 * costs a cheap image fill instead of a full-frame feTurbulence. Deterministic: same seed, same pixels. Browser only.
 */

export type TextureKind = "clay" | "felt" | "card";
export const TEX_SIZE = 256;

/** Small seeded PRNG (mulberry32). */
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Draw `fn` at (x, y) and at its wrapped copies so the tile repeats seamlessly. */
const wrapped = (x: number, y: number, reach: number, fn: (x: number, y: number) => void) => {
  const S = TEX_SIZE;
  for (const dx of [0, -S, S]) {
    for (const dy of [0, -S, S]) {
      const px = x + dx;
      const py = y + dy;
      if (px > -reach && px < S + reach && py > -reach && py < S + reach) fn(px, py);
    }
  }
};

const softDot = (g: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) => {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, `rgba(${rgb},${a})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
};

const DARK = "48,24,12";
const LIGHT = "255,246,230";

const bakeClay = (g: CanvasRenderingContext2D, r: () => number) => {
  // Soft lumps and dents: the hand-pressed unevenness of the surface.
  for (let i = 0; i < 160; i++) {
    const x = r() * TEX_SIZE;
    const y = r() * TEX_SIZE;
    const rad = 5 + r() * 16;
    const light = r() < 0.45;
    wrapped(x, y, rad, (px, py) => softDot(g, px, py, rad, light ? LIGHT : DARK, light ? 0.07 + r() * 0.05 : 0.06 + r() * 0.06));
  }
  // Fingerprint whorls: concentric partial ridges, faint.
  for (let k = 0; k < 4; k++) {
    const cx = r() * TEX_SIZE;
    const cy = r() * TEX_SIZE;
    const rot = r() * Math.PI;
    const squash = 0.55 + r() * 0.3;
    wrapped(cx, cy, 44, (px, py) => {
      g.save();
      g.translate(px, py);
      g.rotate(rot);
      g.scale(1, squash);
      for (let rad = 4; rad < 40; rad += 2.6) {
        const a0 = r() * Math.PI * 2;
        g.beginPath();
        g.arc(0, 0, rad, a0, a0 + Math.PI * (0.9 + r() * 0.9));
        g.strokeStyle = `rgba(${DARK},${0.07 + r() * 0.05})`;
        g.lineWidth = 0.9;
        g.stroke();
      }
      g.restore();
    });
  }
  // Tool scrapes: a few short soft curved lines.
  for (let i = 0; i < 10; i++) {
    const x = r() * TEX_SIZE;
    const y = r() * TEX_SIZE;
    const len = 14 + r() * 30;
    const a = r() * Math.PI;
    wrapped(x, y, len, (px, py) => {
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo(px + Math.cos(a) * len * 0.5 + 4, py + Math.sin(a) * len * 0.5 - 4, px + Math.cos(a) * len, py + Math.sin(a) * len);
      g.strokeStyle = `rgba(${DARK},0.08)`;
      g.lineWidth = 1.6;
      g.stroke();
      g.translate(0, 1.5);
      g.strokeStyle = `rgba(${LIGHT},0.08)`;
      g.stroke();
      g.setTransform(1, 0, 0, 1, 0, 0);
    });
  }
  // Pits and specks of dust picked up by the clay.
  for (let i = 0; i < 420; i++) {
    g.fillStyle = r() < 0.7 ? `rgba(${DARK},${0.1 + r() * 0.14})` : `rgba(${LIGHT},${0.12 + r() * 0.1})`;
    g.beginPath();
    g.arc(r() * TEX_SIZE, r() * TEX_SIZE, 0.4 + r() * 0.9, 0, Math.PI * 2);
    g.fill();
  }
};

const bakeFelt = (g: CanvasRenderingContext2D, r: () => number) => {
  for (let i = 0; i < 40; i++) {
    const x = r() * TEX_SIZE;
    const y = r() * TEX_SIZE;
    const rad = 10 + r() * 14;
    wrapped(x, y, rad, (px, py) => softDot(g, px, py, rad, r() < 0.5 ? LIGHT : DARK, 0.025));
  }
  g.lineCap = "round";
  for (let i = 0; i < 2600; i++) {
    const x = r() * TEX_SIZE;
    const y = r() * TEX_SIZE;
    const a = r() * Math.PI * 2;
    const len = 2 + r() * 5;
    wrapped(x, y, 8, (px, py) => {
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo(px + Math.cos(a + 0.8) * len * 0.5, py + Math.sin(a + 0.8) * len * 0.5, px + Math.cos(a) * len, py + Math.sin(a) * len);
      g.strokeStyle = r() < 0.55 ? `rgba(${DARK},${0.06 + r() * 0.08})` : `rgba(${LIGHT},${0.07 + r() * 0.08})`;
      g.lineWidth = 0.7;
      g.stroke();
    });
  }
};

const bakeCard = (g: CanvasRenderingContext2D, r: () => number) => {
  // Corrugated flutes showing through the liner: 16 soft vertical bands per tile.
  const period = TEX_SIZE / 16;
  for (let x = 0; x < TEX_SIZE; x++) {
    const a = 0.035 * (0.5 + 0.5 * Math.sin((x / period) * Math.PI * 2));
    g.fillStyle = `rgba(${DARK},${a})`;
    g.fillRect(x, 0, 1, TEX_SIZE);
  }
  for (let i = 0; i < 30; i++) {
    const x = r() * TEX_SIZE;
    const y = r() * TEX_SIZE;
    const rad = 10 + r() * 34;
    wrapped(x, y, rad, (px, py) => softDot(g, px, py, rad, r() < 0.6 ? DARK : LIGHT, 0.045));
  }
  for (let i = 0; i < 700; i++) {
    g.fillStyle = r() < 0.75 ? `rgba(${DARK},${0.08 + r() * 0.12})` : `rgba(${LIGHT},0.14)`;
    g.fillRect(r() * TEX_SIZE, r() * TEX_SIZE, 0.6 + r() * 1.6, 0.6 + r() * 0.8);
  }
};

const CACHE = new Map<string, string>();

/** PNG data URL of a texture tile (baked once per page and seed). Empty string outside a browser. */
export const bakeTexture = (kind: TextureKind, seed = 7): string => {
  const key = `${kind}:${seed}`;
  const hit = CACHE.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const g = canvas.getContext("2d");
  if (!g) return "";
  const r = rng(seed * 2654435761 + (kind === "clay" ? 1 : kind === "felt" ? 2 : 3));
  if (kind === "clay") bakeClay(g, r);
  else if (kind === "felt") bakeFelt(g, r);
  else bakeCard(g, r);
  const url = canvas.toDataURL("image/png");
  CACHE.set(key, url);
  return url;
};
