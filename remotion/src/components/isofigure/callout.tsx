/**
 * Callout pills: labels in two columns at the frame edges, joined to their targets by leader lines. Pills are ordered
 * by target height and spaced apart, so leaders do not cross. Items marked `inside` only show during "Look inside".
 */
import React from "react";
import { W } from "./iso";

export type CalloutItem = { label: string; x: number; y: number; inside?: boolean };

const GAP = 40;
const PAD = 13;

export const layoutPills = (items: CalloutItem[], top = 50, bottom = 520) => {
  const out: { item: CalloutItem; left: boolean; px: number; py: number; w: number }[] = [];
  for (const left of [true, false]) {
    const col = items.filter((i) => (i.x < W / 2) === left).sort((a, b) => a.y - b.y);
    let prev = top - GAP;
    const ys: number[] = [];
    for (const item of col) { prev = Math.max(prev + GAP, item.y); ys.push(prev); }
    for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], bottom - (ys.length - 1 - i) * GAP); // pull a stack that ran off the bottom back up
    col.forEach((item, i) => {
      const w = item.label.length * 8 + PAD * 2;
      out.push({ item, left, px: left ? 14 : W - 14 - w, py: ys[i], w });
    });
  }
  return out;
};

export const Callouts: React.FC<{ items: CalloutItem[]; inside: number; show: boolean }> = ({ items, inside, show }) => {
  if (!show) return null;
  return (
    <g fontFamily="ui-sans-serif, system-ui, Segoe UI, sans-serif" fontSize={14}>
      {layoutPills(items).map(({ item, left, px, py, w }) => {
        const o = item.inside ? Math.max(0, (inside - 0.4) / 0.6) : 1 - 0.6 * inside;
        if (o < 0.02) return null;
        const ax = left ? px + w : px;
        return (
          <g key={item.label} opacity={o}>
            <path d={`M${ax} ${py} L${item.x} ${item.y}`} stroke={INK_LINE} strokeWidth={1.4} fill="none" />
            <circle cx={item.x} cy={item.y} r={4} fill="#fff8e6" stroke={INK_LINE} strokeWidth={1.4} />
            <rect x={px} y={py - 14} width={w} height={28} rx={14} fill="#fff8e6" stroke={INK_LINE} strokeOpacity={0.5} />
            <text x={px + w / 2} y={py + 5} textAnchor="middle" fill="#2a2118">{item.label}</text>
          </g>
        );
      })}
    </g>
  );
};
const INK_LINE = "#2a2118";
