/**
 * The washing machine, drawn from the model's state. Back to front: floor shadow, the working parts (hidden behind the
 * cabinet until "Look inside" fades it), the cabinet, then the front panel and door lying on the front plane.
 * Local units on the front plane: u runs right from the cabinet's left edge, v runs down from its top edge.
 */
import React from "react";
import { Box, Coil, DiscStack, INK, OnFront, OnSide, Rod, fitIso, mix, H, W } from "@isofigure/iso";
import { Press, useFig } from "@isofigure/runtime";
import type { CalloutItem } from "@isofigure/callout";
import { PROGRAMS, locked, running, timeLeft, totalMinutes } from "./model";
import type { WState } from "./model";

const F = 170; // y of the front face
const TOP = 250; // z of the top face
// fit all eight corners of the cabinet (feet included) so nothing is cropped
const CORNERS: [number, number, number][] = [];
for (const x of [0, 190]) for (const y of [0, F]) for (const z of [-9, TOP]) CORNERS.push([x, y, z]);
export const o = fitIso(CORNERS, W, H, 60);
const at = (u: number, v: number) => o.P(u, F, TOP - v); // front-plane point to screen

const DOOR = { u: 95, v: 122 };
const BODY = "#ece7d9";
const PHASES = ["fill", "wash", "rinse", "spin"];
const BLOBS = [
  { a: 0, c: "#e86a5a", s: 15, j: [1, 0.8, 1.1, 0.9, 1.05, 0.85] },
  { a: 62, c: "#f2c14e", s: 13, j: [0.9, 1.1, 0.85, 1, 0.9, 1.1] },
  { a: 125, c: "#5aa0d6", s: 16, j: [1.1, 0.9, 1, 0.8, 1.1, 0.95] },
  { a: 190, c: "#9bd17a", s: 12, j: [0.85, 1, 1.1, 0.95, 0.85, 1.05] },
  { a: 250, c: "#d68ad1", s: 14, j: [1, 1.1, 0.9, 1.05, 0.8, 1] },
  { a: 305, c: "#fbf6e9", s: 13, j: [0.95, 0.85, 1.05, 1, 1.1, 0.9] },
];
const blob = (cx: number, cy: number, s: number, j: number[]) =>
  "M" + j.map((k, i) => `${(cx + Math.cos((i / j.length) * Math.PI * 2) * s * k).toFixed(1)} ${(cy + Math.sin((i / j.length) * Math.PI * 2) * s * k).toFixed(1)}`).join("L") + "Z";

export const callouts = (s: WState): CalloutItem[] => [
  { label: "Display", x: at(48, 24)[0], y: at(48, 24)[1] },
  { label: "Program knob", x: at(116, 28)[0], y: at(116, 28)[1] },
  { label: "Start / pause", x: at(174, 28)[0], y: at(174, 28)[1] },
  { label: locked(s) ? "Door · locked" : "Door", x: at(60, 150)[0], y: at(60, 150)[1] },
  { label: "Drum", x: o.P(95, 100, 150)[0], y: o.P(95, 100, 150)[1], inside: true },
  { label: "Tub", x: o.P(95, 60, 190)[0], y: o.P(95, 60, 190)[1], inside: true },
  { label: "Springs", x: o.P(145, 90, 226)[0], y: o.P(145, 90, 226)[1], inside: true },
  { label: "Motor + belt", x: o.P(95, 42, 24)[0], y: o.P(95, 42, 24)[1], inside: true },
  { label: "Drain pump", x: o.P(37, 132, 20)[0], y: o.P(37, 132, 20)[1], inside: true },
  { label: "Water level", x: at(DOOR.u + 30, DOOR.v + 56 - 112 * s.water)[0], y: at(DOOR.u + 30, DOOR.v + 56 - 112 * s.water)[1], inside: true },
];

export const View: React.FC = () => {
  const { s, inside } = useFig<WState>();
  const cab = 1 - 0.9 * inside;
  const panelOp = 1 - 0.45 * inside;
  const run = running(s);
  const sx = 1 - 0.86 * s.doorAmt; // the open door is seen nearly edge-on
  const stuck = Math.min(1, Math.abs(s.rpm) / 600); // at high speed the load pins itself to the drum wall
  const floor = o.P(95, 85, -9);

  return (
    <g>
      <ellipse cx={floor[0]} cy={floor[1] + 6} rx={o.k * 215} ry={o.k * 95} fill="#000" opacity={0.22} filter="url(#iso-sh)" />
      {[[8, 8], [168, 8], [8, 148], [168, 148]].map(([x, y]) => <Box key={`${x}${y}`} o={o} x={x} y={y} z={-9} w={14} d={14} h={9} color="#3a3733" />)}

      {/* the working parts, back to front; hidden behind the cabinet until Look inside */}
      <Box o={o} x={70} y={24} z={8} w={50} d={36} h={32} color="#3b4650" />
      <Rod o={o} a={[95, 42, 40]} b={[95, 36, 128]} w={3.5} color="#1d1d1d" />
      <Box o={o} x={50} y={84} z={0} w={10} d={10} h={52} color="#4d555c" />
      <Box o={o} x={130} y={84} z={0} w={10} d={10} h={52} color="#4d555c" />
      <DiscStack o={o} cx={95} cz={128} r={76} y0={22} y1={150} color="#8f979e" />
      <Coil o={o} x={45} y={90} z0={TOP - 4} z1={206} />
      <Coil o={o} x={145} y={90} z0={TOP - 4} z1={206} />
      <DiscStack o={o} cx={95} cz={128} r={62} y0={34} y1={140} color="#b9bfc5" />
      <g transform={o.plane([95, 140, 128], [1, 0, 0], [0, 0, -1])}>
        <g transform={`rotate(${s.angle})`}>
          {[0, 120, 240].map((a) => <rect key={a} x={-5} y={-61} width={10} height={20} fill="#8a9097" stroke={INK} strokeOpacity={0.6} vectorEffect="non-scaling-stroke" transform={`rotate(${a})`} />)}
          {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={Math.cos((i / 16) * 6.283) * 50} cy={Math.sin((i / 16) * 6.283) * 50} r={2.4} fill="#5d646b" />)}
        </g>
      </g>
      <g transform={o.plane([95, 146, 128], [1, 0, 0], [0, 0, -1])}>
        <clipPath id="tubclip"><circle r={75} /></clipPath>
        <g clipPath="url(#tubclip)" opacity={0.55}>
          <rect x={-76} y={76 - 152 * s.water} width={152} height={156} fill="#3f9fba" />
          <rect x={-76} y={76 - 152 * s.water} width={152} height={2} fill="#ffffff" opacity={0.7} />
        </g>
      </g>
      <Box o={o} x={22} y={118} z={8} w={30} d={28} h={22} color="#5a6a73" />
      <Rod o={o} a={[52, 132, 18]} b={[88, 120, 54]} w={5} color="#394850" />

      {/* the cabinet */}
      <g opacity={cab}>
        <Box o={o} x={0} y={0} z={0} w={190} d={F} h={TOP} color={BODY} />
        <OnSide o={o} x={190} y={F} z={TOP}>
          {Array.from({ length: 7 }, (_, i) => <rect key={i} x={30 + i * 14} y={28} width={7} height={3} rx={1.5} fill="#b9b2a0" />)}
          <rect x={44} y={200} width={80} height={5} rx={2.5} fill="#cdc6b3" />
        </OnSide>
      </g>

      {/* front panel and door, flat on the front plane */}
      <OnFront o={o} x={0} y={F} z={TOP}>
        <g opacity={panelOp}>
          <rect width={190} height={56} fill="#d4cebd" stroke={INK} strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />
          <rect x={12} y={8} width={72} height={32} rx={3} fill={s.power ? "#0f2a22" : "#0b1512"} stroke={INK} strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />
          {s.power && (
            <g fontFamily="ui-monospace, Menlo, Consolas, monospace" fill="#7dffb4">
              <text x={17} y={19} fontSize={8}>{PROGRAMS[s.prog].name.toUpperCase()} {PROGRAMS[s.prog].temp ? PROGRAMS[s.prog].temp + "°" : ""}</text>
              <text x={17} y={35} fontSize={15}>{run ? Math.ceil(timeLeft(s)) : totalMinutes(PROGRAMS[s.prog])}<tspan fontSize={7}> MIN</tspan></text>
            </g>
          )}
          {PHASES.map((p, i) => {
            const lit = s.power && run && PHASES.indexOf(s.phase) >= i;
            return <rect key={p} x={12 + i * 18.5} y={46} width={16} height={3} rx={1.5} fill={lit ? "#48c98a" : "#a8a290"} />;
          })}

          <Press id="program">
            <circle cx={116} cy={28} r={26} fill="transparent" />
            {[0, 1, 2, 3].map((i) => {
              const a = ((-60 + i * 40) * Math.PI) / 180;
              return <circle key={i} cx={116 + Math.sin(a) * 23} cy={28 - Math.cos(a) * 23} r={i === s.prog ? 2.6 : 1.6} fill={i === s.prog ? "#c0392b" : "#8e8878"} />;
            })}
            <circle cx={116} cy={28} r={15} fill="#c3c8cf" stroke={INK} strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />
            <circle cx={116} cy={28} r={11} fill="#d9dde2" />
            <g transform={`translate(116 28) rotate(${-60 + s.knob})`}><rect x={-1.6} y={-14} width={3.2} height={9} rx={1} fill={INK} /></g>
          </Press>
          <Press id="power">
            <circle cx={151} cy={28} r={12} fill="transparent" />
            <circle cx={151} cy={28} r={8} fill={s.power ? "#ff6a52" : "#8e3b30"} stroke={INK} strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />
            <path d="M151 22.5 V28.5 M147.2 24.6 A5 5 0 1 0 154.8 24.6" fill="none" stroke="#fff6ea" strokeWidth={1.4} strokeLinecap="round" />
          </Press>
          <Press id="start">
            <circle cx={174} cy={28} r={12} fill="transparent" />
            <circle cx={174} cy={28} r={8} fill={run && !s.paused ? "#52d17c" : "#2f6b45"} stroke={INK} strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />
            {run && !s.paused
              ? <path d="M171.6 24.6 V31.4 M176.4 24.6 V31.4" stroke="#eafff0" strokeWidth={2} strokeLinecap="round" />
              : <path d="M172.4 24.4 L177.6 28 L172.4 31.6Z" fill="#eafff0" />}
          </Press>
        </g>

        {/* the drum seen through the door opening */}
        <clipPath id="mouthclip"><circle cx={DOOR.u} cy={DOOR.v} r={56} /></clipPath>
        <circle cx={DOOR.u} cy={DOOR.v} r={57} fill="#1d252b" opacity={1 - 0.8 * inside} />
        <g clipPath="url(#mouthclip)" opacity={1 - 0.55 * inside}>
          {BLOBS.map((b, i) => {
            const a = ((b.a + s.angle * 0.8) * Math.PI) / 180;
            const rr = 30 + 18 * stuck;
            return <path key={i} d={blob(DOOR.u + Math.cos(a) * rr, DOOR.v + Math.sin(a) * rr, b.s, b.j)} fill={b.c} stroke={INK} strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />;
          })}
          <g opacity={0.72}>
            <rect x={DOOR.u - 57} y={DOOR.v + 56 - 112 * s.water} width={114} height={114} fill="#3f9fba" />
            <rect x={DOOR.u - 57} y={DOOR.v + 56 - 112 * s.water} width={114} height={2.2} fill="#ffffff" opacity={0.7} />
          </g>
        </g>

        <Press id="door" dip={0}>
          <circle cx={DOOR.u} cy={DOOR.v} r={70} fill="transparent" />
          <g transform={`translate(25 0) scale(${sx} 1) translate(-25 0)`}>
            <circle cx={DOOR.u} cy={DOOR.v} r={65.5} fill="none" stroke="#c5c9ce" strokeWidth={9} />
            <circle cx={DOOR.u} cy={DOOR.v} r={70} fill="none" stroke={INK} strokeOpacity={0.7} vectorEffect="non-scaling-stroke" strokeWidth={1.6} />
            <circle cx={DOOR.u} cy={DOOR.v} r={57.5} fill="none" stroke="#2a2f33" strokeWidth={7} />
            <circle cx={DOOR.u} cy={DOOR.v} r={54} fill="#9fd0dd" fillOpacity={0.3 * (1 - 0.7 * inside)} stroke="#ffffff" strokeOpacity={0.4} vectorEffect="non-scaling-stroke" />
            <path d={`M${DOOR.u - 36} ${DOOR.v - 24} A44 44 0 0 1 ${DOOR.u - 10} ${DOOR.v - 46}`} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />
            <rect x={DOOR.u + 52} y={DOOR.v - 11} width={11} height={22} rx={4} fill={locked(s) ? "#c0392b" : "#8c9096"} stroke={INK} strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />
          </g>
        </Press>
      </OnFront>
    </g>
  );
};
