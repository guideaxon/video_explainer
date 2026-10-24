/**
 * Callout labels: paper pills in two columns at the frame edges, joined to their targets by leader lines. Pills are
 * ordered by target height and spaced apart, so leaders do not cross. Items fade in and out by scene time; items marked
 * `xray` only show while the viewer has "Look inside" on.
 */
import React from "react";
import { W, clamp } from "./paper";
import { useUi } from "./ui";

export type CalloutItem = { label: string; x: number; y: number; t0?: number; t1?: number; xray?: boolean };

const GAP = 44;
const PAD = 14;

/** Pill positions: one column per side, each pill as close to its target's height as the spacing allows. */
export const layoutCallouts = (items: CalloutItem[]) => {
  const out: { item: CalloutItem; left: boolean; px: number; py: number; w: number }[] = [];
  for (const left of [true, false]) {
    const col = items.filter((i) => (i.x < W / 2) === left).sort((a, b) => a.y - b.y);
    let prev = 70 - GAP;
    const pys: number[] = [];
    for (const item of col) {
      prev = Math.max(prev + GAP, Math.min(item.y, 640));
      pys.push(prev);
    }
    // a stack that ran past the bottom limit is pulled back up, keeping the spacing
    for (let i = pys.length - 1; i >= 0; i--) pys[i] = Math.min(pys[i], 680 - (pys.length - 1 - i) * GAP);
    for (const [i, item] of col.entries()) {
      const py = pys[i];
      const w = item.label.length * 8.6 + PAD * 2;
      out.push({ item, left, px: left ? 22 : W - 22 - w, py, w });
    }
  }
  return out;
};

export const Callouts: React.FC<{ t: number; items: CalloutItem[] }> = ({ t, items }) => {
  const { xray } = useUi();
  return (
    <g fontFamily="ui-sans-serif, system-ui, Segoe UI, sans-serif" fontSize={15}>
      {layoutCallouts(items).map(({ item, left, px, py, w }) => {
        const on = clamp((t - (item.t0 ?? 1)) / 0.5) * clamp(((item.t1 ?? 5.5) - t) / 0.5);
        const o = item.xray ? on * clamp((xray - 0.4) / 0.4) : on * (1 - 0.5 * xray);
        if (o <= 0.01) return null;
        const ax = left ? px + w : px;
        return (
          <g key={item.label} opacity={o}>
            <path d={`M${ax} ${py} L${item.x} ${item.y}`} stroke="#fff4dc" strokeWidth={1.6} fill="none" />
            <circle cx={item.x} cy={item.y} r={4.5} fill="#fff4dc" stroke="#3b2a22" strokeWidth={1.2} />
            <g filter="url(#sh-s)">
              <rect x={px} y={py - 15} width={w} height={30} rx={15} fill="#fff4dc" stroke="rgba(0,0,0,.18)" />
              <text x={px + w / 2} y={py + 5} textAnchor="middle" fill="#3b2a22">{item.label}</text>
            </g>
          </g>
        );
      })}
    </g>
  );
};
