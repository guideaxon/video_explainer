/**
 * The robot, drawn from the model's state. Back to front: floor shadow, far arm and legs, the working parts (hidden
 * behind the body until "Look inside" fades it), torso, neck, head with its face screen, antenna, then the near arm.
 * It faces the front plane (lower-left); the arm on its x-max side waves. Arms are boxes rotated about the shoulder
 * axis (along y) and shaded from their rotated normals, so they stay solid at every angle.
 * The idle blink and the talking mouth come from the shared rig contract; sounds are synthesised in the page.
 */
import React, { useEffect, useRef } from "react";
import { Box, DiscStack, Face, INK, OnFront, OnSide, Rod, faceTone, fitIso, makeIso, mix, H, W } from "@isofigure/iso";
import type { P3 } from "@isofigure/iso";
import { Press, useFig } from "@isofigure/runtime";
import type { CalloutItem } from "@isofigure/callout";
import { blinkAt, fallbackMouth } from "@rig";
import { RAISE, TALK_TIME, WAVES, WAVE_PERIOD, WAVE_TIME, armPose, lid, talking, waving } from "./model";
import type { RState } from "./model";

const HEAD = { x: 6, y: 84, z: 280 }; // top-left corner of the face (front plane)
const PIV: P3 = [140, 46, 172]; // near shoulder pivot
const FAR: P3 = [-16, 46, 172]; // far shoulder pivot
const UPPER = 58, FORE = 46; // arm segment lengths
const BALL: P3 = [60, 45, 330]; // antenna light
// fit the body, the antenna and every place the waving hand can reach; leave room either side for the callout pills
const PTS: P3[] = [[-24, 46, 60], [236, 46, 252], [236, 46, 150], BALL];
for (const x of [0, 120]) for (const y of [0, 90]) for (const z of [0, 280]) PTS.push([x, y, z]);
const q = fitIso(PTS, 430, H, 34);
export const o = makeIso(q.ox + (W - 430) / 2 + 12, q.oy, q.k);
const face = (u: number, v: number) => o.P(HEAD.x + u, HEAD.y, HEAD.z - v);

const BODY = "#ece5d2";
const ACCENT = "#e8743b";
const SCREEN = "#1f2b33";
const GLOW = "#8ff5e4";
const PROFILE = [0.45, 0.7, 0.9, 1, 0.9, 0.7, 0.45];

/* ---------- geometry ---------- */
const rot = (piv: P3, deg: number, lx: number, y: number, lz: number): P3 => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [piv[0] + lx * c - lz * s, y, piv[2] + lx * s + lz * c];
};
/** A box in local (lx, y, lz) turned `deg` about the y axis through `piv`; draws the faces turned toward the viewer. */
const Limb: React.FC<{ piv: P3; deg: number; x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; color: string }> = ({ piv, deg, x0, x1, y0, y1, z0, z1, color }) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const P = (lx: number, y: number, lz: number) => o.P(...rot(piv, deg, lx, y, lz));
  const faces: { n: number[]; p: [number, number][] }[] = [
    { n: [c, 0, s], p: [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)] },
    { n: [-c, 0, -s], p: [P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)] },
    { n: [-s, 0, c], p: [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)] },
    { n: [s, 0, -c], p: [P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)] },
    { n: [0, 1, 0], p: [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)] },
  ];
  return <g>{faces.filter((f) => f.n[0] + f.n[1] + f.n[2] > 0.01).map((f, i) => <Face key={i} p={f.p} fill={faceTone(color, f.n)} />)}</g>;
};
/** An arm hanging from `piv`: upper arm, elbow, forearm, round hand. Angles in degrees (positive swings toward +x). */
const Arm: React.FC<{ piv: P3; upper: number; fore: number }> = ({ piv, upper, fore }) => {
  const elbow = rot(piv, upper, 0, piv[1], -UPPER);
  const hand = rot(elbow, upper + fore, 0, piv[1], -FORE - 9);
  return (
    <g>
      <Limb piv={piv} deg={upper} x0={-9} x1={9} y0={36} y1={56} z0={-UPPER} z1={6} color={BODY} />
      <Limb piv={elbow} deg={upper + fore} x0={-8} x1={8} y0={37} y1={55} z0={-FORE} z1={0} color={BODY} />
      <DiscStack o={o} cx={elbow[0]} cz={elbow[2]} r={10} y0={36} y1={57} color={ACCENT} />
      <DiscStack o={o} cx={hand[0]} cz={hand[2]} r={12} y0={38} y1={54} color={ACCENT} />
    </g>
  );
};
const still = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches; // as the runtime decides
export const handAt = (s: RState) => {
  const { upper, fore } = armPose(s, still());
  return o.P(...rot(rot(PIV, upper, 0, 46, -UPPER), upper + fore, 0, 55, -FORE / 2)); // mid forearm
};

/** A wire through world points: an ink line under a coloured one. */
const Wire: React.FC<{ pts: P3[]; color: string }> = ({ pts, color }) => {
  const d = "M" + pts.map((p) => o.P(...p).map((v) => v.toFixed(1)).join(" ")).join("L");
  return (
    <g fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path d={d} stroke={INK} strokeOpacity={0.6} strokeWidth={3.6} />
      <path d={d} stroke={color} strokeWidth={2.2} />
    </g>
  );
};

/* ---------- sound: tiny Web Audio blips, only ever started by a press (a user gesture); M mutes ---------- */
let ac: AudioContext | null = null;
let master: GainNode | null = null;
const audio = () => {
  if (!ac) {
    const C = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!C) return null;
    ac = new C() as AudioContext;
    master = ac.createGain();
    master.gain.value = 0.22;
    master.connect(ac.destination);
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
};
const blip = (at: number, f0: number, f1: number, len: number, type: OscillatorType = "square", vol = 0.4) => {
  const a = ac!, osc = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 2200;
  osc.type = type;
  osc.frequency.setValueAtTime(f0, at); osc.frequency.exponentialRampToValueAtTime(f1, at + len);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(lp).connect(g).connect(master!);
  osc.start(at); osc.stop(at + len + 0.03);
};
const useSfx = (s: RState) => {
  const prev = useRef(s);
  useEffect(() => {
    const p = prev.current;
    prev.current = s;
    if (master) master.gain.value = s.sound ? 0.22 : 0; // muting also silences sounds already scheduled
    if (!s.sound) return;
    const startWave = p.wave < 0 && s.wave >= 0, startTalk = p.talk < 0 && s.talk >= 0, startBlink = p.blink < 0 && s.blink >= 0;
    const flip = p.antenna !== s.antenna;
    if (!(startWave || startTalk || startBlink || flip) || !audio()) return;
    const t = ac!.currentTime + 0.01;
    if (startWave) {
      blip(t, 140, 260, RAISE, "sawtooth", 0.12); // shoulder servo whirr up
      for (let i = 0; i < WAVES; i++) blip(t + RAISE + i * WAVE_PERIOD + WAVE_PERIOD / 4, 900, 700, 0.07, "triangle", 0.3);
      blip(t + WAVE_TIME - RAISE, 260, 140, RAISE, "sawtooth", 0.12);
    }
    if (startBlink) blip(t, 1600, 2400, 0.05, "sine", 0.18);
    if (startTalk) for (let k = 0; k * 0.11 < TALK_TIME - 0.1; k++) {
      const m = fallbackMouth(k * 0.11 * 30); // the same syllable rhythm the mouth LEDs show
      if (m > 0.15) blip(t + k * 0.11, 240 + 360 * m, (240 + 360 * m) * 0.82, 0.09, "square", 0.12 + 0.25 * m);
    }
    if (flip) {
      const [a, b] = s.antenna ? [660, 990] : [990, 660];
      blip(t, a, a, 0.08, "sine", 0.3); blip(t + 0.09, b, b, 0.12, "sine", 0.3);
    }
  }, [s]);
};

export const callouts = (s: RState): CalloutItem[] => {
  const at = (p: [number, number]) => ({ x: p[0], y: p[1] }); // targets sit at a part's edge so the dot never covers where you press
  return [
    { label: s.antenna ? "Antenna light · on" : "Antenna light", ...at(o.P(60, 45, 312)) },
    { label: "Eyes", ...at(face(28, 22)) },
    { label: "Mouth LEDs", ...at(face(31, 60)) },
    { label: waving(s) ? "Arm · waving" : "Arm", ...at(handAt(s)) },
    { label: "Speaker grille", ...at(o.P(64, 90, 106)) },
    { label: "Battery", ...at(o.P(30, 80, 96)), inside: true },
    { label: "Circuit board", ...at(o.P(30, 12, 176)), inside: true },
    { label: "Shoulder servo", ...at(o.P(110, 58, 166)), inside: true },
    { label: "Speaker", ...at(o.P(84, 86, 112)), inside: true },
    { label: "Wiring", ...at(o.P(60, 45, 240)), inside: true },
  ];
};

export const View: React.FC = () => {
  const { s, inside, reduce } = useFig<RState>();
  useSfx(s);
  const cab = 1 - 0.9 * inside;
  const { upper, fore } = armPose(s, reduce);
  const shut = Math.max(lid(s), reduce ? 0 : blinkAt(s.t * 30, 30, 3));
  const taper = talking(s) ? Math.min(1, s.talk / 0.1, (TALK_TIME - s.talk) / 0.1) : 0;
  const open = talking(s) ? (reduce ? 0.5 : fallbackMouth(s.talk * 30)) * taper : 0;
  const pulse = reduce ? 1 : 0.75 + 0.25 * Math.sin(s.t * 5);
  const ball = o.P(...BALL);
  const floor = o.P(60, 45, 0);

  return (
    <g>
      <defs><filter id="rb-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" /></filter></defs>
      <ellipse cx={floor[0] + 10} cy={floor[1] + 4} rx={o.k * 130} ry={o.k * 58} fill="#000" opacity={0.2} filter="url(#iso-sh)" />

      {/* far arm, mostly behind the torso */}
      <g opacity={cab}><Arm piv={FAR} upper={0} fore={0} /></g>
      {/* legs and feet */}
      {[8, 68].map((x) => <Box key={`f${x}`} o={o} x={x} y={20} z={0} w={44} d={66} h={16} color="#4a5058" />)}
      {[18, 78].map((x) => <Box key={`l${x}`} o={o} x={x} y={36} z={16} w={24} d={30} h={54} color="#8e959c" />)}

      {/* the working parts, back to front; hidden behind the body until Look inside */}
      <Box o={o} x={12} y={8} z={118} w={96} d={4} h={66} color="#2f7d4f" />
      <Box o={o} x={40} y={12} z={140} w={30} d={4} h={26} color="#22262a" />
      {[78, 90].map((x) => <Box key={x} o={o} x={x} y={12} z={164} w={9} d={3} h={9} color="#3a3f44" />)}
      <Wire pts={[[60, 14, 178], [60, 45, 186], [60, 45, 276]]} color="#f2c14e" />
      <Wire pts={[[98, 14, 176], [98, 40, 176]]} color="#5aa0d6" />
      <Wire pts={[[84, 14, 130], [84, 50, 118]]} color="#9bd17a" />
      <Wire pts={[[26, 14, 128], [26, 54, 122]]} color="#e8574a" />
      <Wire pts={[[42, 14, 124], [42, 54, 120]]} color="#2a2a2a" />
      <Box o={o} x={12} y={34} z={76} w={44} d={44} h={42} color="#3f6fb5" />
      <Box o={o} x={22} y={50} z={118} w={10} d={10} h={4} color="#c7cbd0" />
      <OnFront o={o} x={12} y={78} z={118}>
        <rect x={6} y={8} width={32} height={10} rx={2} fill="#2a4a7a" />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={8 + i * 7.5} y={10} width={6} height={6} fill="#7ff0a0" />)}
      </OnFront>
      <DiscStack o={o} cx={84} cz={112} r={9} y0={50} y1={62} color="#3a3f44" />
      <DiscStack o={o} cx={84} cz={112} r={19} y0={64} y1={86} color="#6f7780" />
      <Box o={o} x={92} y={32} z={150} w={26} d={28} h={32} color="#30343a" />
      <Rod o={o} a={[118, 46, 172]} b={[134, 46, 172]} w={5} color="#c7cbd0" />

      {/* the torso */}
      <g opacity={cab}>
        <Box o={o} x={0} y={0} z={70} w={120} d={90} h={120} color={BODY} />
        <OnSide o={o} x={120} y={90} z={190}>
          {Array.from({ length: 5 }, (_, i) => <rect key={i} x={16} y={74 + i * 8} width={34} height={3.5} rx={1.75} fill="#c4bca6" />)}
        </OnSide>
        <Box o={o} x={120} y={32} z={158} w={12} d={28} h={28} color={ACCENT} />
      </g>
      <OnFront o={o} x={0} y={90} z={190} opacity={1 - 0.6 * inside}>
        <rect x={10} y={10} width={100} height={100} rx={10} fill="none" stroke={INK} strokeOpacity={0.45} vectorEffect="non-scaling-stroke" />
        {[[16, 16], [104, 16], [16, 104], [104, 104]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={1.8} fill="#a39a84" />)}
        {["#48c98a", "#f2c14e", GLOW].map((c, i) => <circle key={c} cx={24 + i * 11} cy={26} r={3.2} fill={i === 2 && !talking(s) ? "#5d6e70" : c} stroke={INK} strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />)}
        <text x={20} y={100} fontSize={8} fontFamily="ui-monospace, Menlo, Consolas, monospace" fill="#a39a84" letterSpacing={1}>RB-1</text>
        <Press id="talk">
          <circle cx={84} cy={78} r={23} fill="#d9d1bb" stroke={INK} strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />
          {[-12, -6, 0, 6, 12].flatMap((dx) => [-12, -6, 0, 6, 12].map((dy) => (dx * dx + dy * dy <= 200 ? <circle key={`${dx},${dy}`} cx={84 + dx} cy={78 + dy} r={1.7 + 0.8 * open} fill="#4a4436" /> : null)))}
        </Press>
      </OnFront>

      {/* neck and head */}
      <g opacity={cab}>
        <Box o={o} x={44} y={28} z={190} w={32} d={34} h={10} color="#8e959c" />
        <Box o={o} x={6} y={6} z={200} w={108} d={78} h={80} color={BODY} />
        <OnSide o={o} x={114} y={84} z={280}>
          <circle cx={39} cy={40} r={13} fill={ACCENT} stroke={INK} strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />
          <circle cx={39} cy={40} r={5} fill={mix(ACCENT, "#000000", 0.3)} />
        </OnSide>
        <Box o={o} x={54} y={39} z={280} w={12} d={12} h={6} color="#8e959c" />
      </g>
      <OnFront o={o} x={HEAD.x} y={HEAD.y} z={HEAD.z} opacity={1 - 0.7 * inside}>
        <rect x={10} y={10} width={88} height={60} rx={12} fill={SCREEN} stroke={INK} strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />
        <circle cx={20} cy={50} r={4} fill="#f08a9a" opacity={0.7} />
        <circle cx={88} cy={50} r={4} fill="#f08a9a" opacity={0.7} />
        <Press id="blink">
          <rect x={18} y={16} width={72} height={30} fill="transparent" />
          {[36, 72].map((u) => {
            const h = 20 * (1 - shut) + 1.6;
            return <rect key={u} x={u - 8} y={30 - h / 2} width={16} height={h} rx={Math.min(8, h / 2)} fill={GLOW} />;
          })}
        </Press>
        <Press id="talk">
          <rect x={30} y={46} width={48} height={20} fill="transparent" />
          {PROFILE.map((p, i) => {
            const j = reduce ? 1 : 0.75 + 0.25 * Math.sin(s.t * 23 + i * 1.7);
            const h = 2.4 + 17 * open * p * j;
            return <rect key={i} x={33 + i * 6.3} y={56 - h / 2} width={4.2} height={h} rx={1.6} fill={talking(s) ? GLOW : "#4d6a6e"} />;
          })}
        </Press>
      </OnFront>

      {/* antenna */}
      <g opacity={1 - 0.5 * inside}><Rod o={o} a={[60, 45, 286]} b={BALL} w={2.6} color="#5a6068" /></g>
      <Press id="antenna">
        <circle cx={ball[0]} cy={ball[1]} r={o.k * 16} fill="transparent" />
        {s.glow > 0.01 && <circle cx={ball[0]} cy={ball[1]} r={o.k * 15 * (0.8 + 0.2 * pulse)} fill="#ff6b4a" opacity={0.6 * s.glow * pulse} filter="url(#rb-glow)" />}
        <circle cx={ball[0]} cy={ball[1]} r={o.k * 8} fill={mix("#8a3a30", "#ff6b4a", s.glow)} stroke={INK} strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />
        <circle cx={ball[0] - o.k * 2.5} cy={ball[1] - o.k * 2.5} r={o.k * 2.4} fill="#ffffff" opacity={0.35 + 0.4 * s.glow} />
      </Press>

      {/* the near arm, in front of everything it can pass */}
      <Press id="wave"><Arm piv={PIV} upper={upper} fore={fore} /></Press>
    </g>
  );
};
