/**
 * Clay style bundle: chunky plasticine letters. Each glyph is a few rounded strokes on a 6-unit cap height (y 0 at
 * the top, 6 on the baseline), drawn by the kit as rolled clay "snakes" with round caps and joins. Upper case,
 * digits and a little punctuation; anything else becomes a space. Pure data plus layout, unit-tested.
 */

export type Glyph = { d: string; w: number };

const O = "M2 0 A2 3 0 1 1 2 6 A2 3 0 1 1 2 0 Z";
const P = "M0 6 V0 H2.2 Q4 0 4 1.7 Q4 3.4 2.2 3.4 H0";
const S = "M3.8 0.9 Q3.2 0 2 0 Q0.2 0 0.2 1.5 Q0.2 2.8 2 3 Q3.8 3.2 3.8 4.5 Q3.8 6 2 6 Q0.7 6 0 5";
const DOT = (x: number, y: number) => `M${x} ${y} L${x + 0.01} ${y}`;

export const GLYPHS: Record<string, Glyph> = {
  A: { d: "M0 6 L2 0 L4 6 M0.8 3.9 H3.2", w: 4 },
  B: { d: "M0 6 V0 H2.2 Q3.7 0 3.7 1.5 Q3.7 3 2.2 3 H0 M2.2 3 Q4 3 4 4.5 Q4 6 2.2 6 H0", w: 4 },
  C: { d: "M4 1 Q3.3 0 2 0 Q0 0 0 3 Q0 6 2 6 Q3.3 6 4 5", w: 4 },
  D: { d: "M0 0 V6 H1.8 Q4 6 4 3 Q4 0 1.8 0 Z", w: 4 },
  E: { d: "M3.8 0 H0 V6 H3.8 M0 3 H3", w: 3.8 },
  F: { d: "M3.8 0 H0 V6 M0 3 H3", w: 3.8 },
  G: { d: "M4 1 Q3.3 0 2 0 Q0 0 0 3 Q0 6 2 6 Q4 6 4 3.4 H2.4", w: 4 },
  H: { d: "M0 0 V6 M4 0 V6 M0 3 H4", w: 4 },
  I: { d: "M0 0 V6", w: 0 },
  J: { d: "M3.3 0 V4.2 Q3.3 6 1.7 6 Q0.3 6 0 4.6", w: 3.3 },
  K: { d: "M0 0 V6 M3.8 0 L0 3.6 M1.3 2.5 L4 6", w: 4 },
  L: { d: "M0 0 V6 H3.6", w: 3.6 },
  M: { d: "M0 6 V0 L2.5 3.8 L5 0 V6", w: 5 },
  N: { d: "M0 6 V0 L4 6 V0", w: 4 },
  O: { d: O, w: 4 },
  P: { d: P, w: 4 },
  Q: { d: `${O} M2.6 4.5 L4.2 6.4`, w: 4.2 },
  R: { d: `${P} M2 3.4 L4 6`, w: 4 },
  S: { d: S, w: 3.8 },
  T: { d: "M0 0 H4 M2 0 V6", w: 4 },
  U: { d: "M0 0 V4 Q0 6 2 6 Q4 6 4 4 V0", w: 4 },
  V: { d: "M0 0 L2 6 L4 0", w: 4 },
  W: { d: "M0 0 L1.2 6 L2.5 2.2 L3.8 6 L5 0", w: 5 },
  X: { d: "M0 0 L4 6 M4 0 L0 6", w: 4 },
  Y: { d: "M0 0 L2 3 L4 0 M2 3 V6", w: 4 },
  Z: { d: "M0 0 H4 L0 6 H4", w: 4 },
  "0": { d: "M1.8 0 A1.8 3 0 1 1 1.8 6 A1.8 3 0 1 1 1.8 0 Z", w: 3.6 },
  "1": { d: "M0.2 1.3 L1.6 0 V6", w: 1.6 },
  "2": { d: "M0.1 1.2 Q0.6 0 2 0 Q3.8 0 3.8 1.7 Q3.8 3 2 4 L0 6 H4", w: 4 },
  "3": { d: "M0.2 0.6 Q0.9 0 2 0 Q3.7 0 3.7 1.5 Q3.7 3 1.8 3 Q4 3 4 4.5 Q4 6 2 6 Q0.6 6 0 5.2", w: 4 },
  "4": { d: "M3 6 V0 L0 4.2 H4", w: 4 },
  "5": { d: "M3.8 0 H0.5 L0.2 2.8 Q0.9 2.3 2 2.3 Q4 2.3 4 4.1 Q4 6 2 6 Q0.6 6 0 5.2", w: 4 },
  "6": { d: "M3.5 0.6 Q2.9 0 2 0 Q0 0 0 3.5 Q0 6 2 6 Q4 6 4 4.1 Q4 2.4 2 2.4 Q0.6 2.4 0 3.6", w: 4 },
  "7": { d: "M0 0 H4 L1.4 6", w: 4 },
  "8": { d: "M2 3 Q0.3 3 0.3 1.5 Q0.3 0 2 0 Q3.7 0 3.7 1.5 Q3.7 3 2 3 Q0 3 0 4.5 Q0 6 2 6 Q4 6 4 4.5 Q4 3 2 3 Z", w: 4 },
  "9": { d: "M0.5 5.4 Q1.1 6 2 6 Q4 6 4 2.5 Q4 0 2 0 Q0 0 0 1.9 Q0 3.6 2 3.6 Q3.4 3.6 4 2.4", w: 4 },
  "%": { d: "M1 0.2 A0.9 1 0 1 1 1 2.2 A0.9 1 0 1 1 1 0.2 M3.9 0 L0.5 6 M3.4 3.8 A0.9 1 0 1 1 3.4 5.8 A0.9 1 0 1 1 3.4 3.8", w: 4.3 },
  "+": { d: "M1.6 1.6 V4.6 M0.1 3.1 H3.1", w: 3.2 },
  "-": { d: "M0.2 3.2 H2.4", w: 2.6 },
  ".": { d: DOT(0, 5.8), w: 0 },
  ",": { d: "M0.3 5.6 L-0.1 6.8", w: 0.3 },
  "!": { d: `M0 0 V3.9 ${DOT(0, 5.8)}`, w: 0 },
  "?": { d: `M0 1.2 Q0.4 0 1.7 0 Q3.3 0 3.3 1.5 Q3.3 2.6 1.7 3.2 V4 ${DOT(1.7, 5.8)}`, w: 3.3 },
  "'": { d: "M0 0 V1.4", w: 0 },
  ":": { d: `${DOT(0, 2)} ${DOT(0, 5.8)}`, w: 0 },
  "/": { d: "M3 0 L0 6", w: 3 },
  $: { d: `${S} M2 -0.8 V6.8`, w: 3.8 },
  "&": { d: "M4 6 L0.9 2.2 Q0.4 1.5 0.6 0.9 Q0.9 0 1.8 0 Q2.8 0 2.8 1 Q2.8 2 1.4 3 Q0 4 0 4.8 Q0 6 1.6 6 Q2.8 6 3.8 4.4", w: 4 },
};

/** Unit gap between letters (the stroke is about 1 unit thick, so this leaves a clear groove). */
export const LETTER_GAP = 1.75;
export const SPACE_W = 2.4;
/** Clay snake thickness in glyph units at the 6-unit cap height. */
export const STROKE = 1.1;

export type PlacedGlyph = { ch: string; d: string; x: number; w: number; index: number };

/** Lay out one line in glyph units: x of each glyph and the total width (stroke overhang included). */
export const layoutLine = (text: string): { glyphs: PlacedGlyph[]; width: number } => {
  const glyphs: PlacedGlyph[] = [];
  let x = STROKE / 2;
  let index = 0;
  for (const raw of text.toUpperCase()) {
    const g = GLYPHS[raw];
    if (!g) {
      x += SPACE_W;
      continue;
    }
    glyphs.push({ ch: raw, d: g.d, x, w: g.w, index: index++ });
    x += g.w + LETTER_GAP;
  }
  const width = glyphs.length ? x - LETTER_GAP + STROKE / 2 : 0;
  return { glyphs, width };
};

/** Px per glyph unit so the line fits `maxW` at a cap height of at most `cap` px. */
export const fitUnit = (text: string, cap: number, maxW: number) => {
  const { width } = layoutLine(text);
  return Math.min(cap / 6, width > 0 ? maxW / width : cap / 6);
};
