/**
 * Lowpoly style bundle: the Presenter, a flat-shaded low-poly character built entirely from three.js primitives, so
 * it is identical in every video and needs no model files. Rig: head (look, nod), blink, brows, mouth (open 0..1),
 * torso (breathing) and two arms (shoulder, elbow, wrist) that rest on the desk or play a gesture.
 * Units are metres-ish: desk top y=0, shoulders y=0.55, head centre y=0.95, camera looks at about y=0.5.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const SKIN = "#e8a77f";
export const SKIN_SHADE = "#d58f66";
export const HAIR = "#b4531f";
export const SHIRT = "#4a4a4c";
export const EYE = "#3f7fc4";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.3, 0.1, 0.2, 1);

export type Gesture = "rest" | "open" | "point" | "count" | "shrug";
export type Mood = "smile" | "serious" | "surprise";
export type Look = "camera" | "left" | "right" | "down";

type V3 = [number, number, number];
const v = (a: V3) => new THREE.Vector3(...a);

/** Arm pose: shoulder is fixed; elbow and wrist positions (right arm; the left arm mirrors x). */
const POSES: Record<Gesture, { elbow: V3; wrist: V3 }> = {
  rest: { elbow: [0.46, 0.2, 0.08], wrist: [0.27, 0.02, 0.36] },
  open: { elbow: [0.62, 0.3, 0.2], wrist: [0.72, 0.42, 0.52] },
  point: { elbow: [0.56, 0.34, 0.22], wrist: [0.5, 0.62, 0.62] },
  count: { elbow: [0.5, 0.36, 0.18], wrist: [0.38, 0.66, 0.4] },
  shrug: { elbow: [0.6, 0.4, 0.14], wrist: [0.66, 0.34, 0.4] },
};

/** A tapered 6-sided prism between two points: a limb segment. */
const Limb: React.FC<{ a: V3; b: V3; r0: number; r1: number; color: string }> = ({ a, b, r0, r1, color }) => {
  const { pos, quat, len } = useMemo(() => {
    const pa = v(a);
    const pb = v(b);
    const dir = pb.clone().sub(pa);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: pa.clone().add(pb).multiplyScalar(0.5).toArray() as V3, quat: q, len: dir.length() };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r1, r0, len, 6, 1]} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
  );
};

const Blob: React.FC<{ p: V3; s: V3; color: string; detail?: number; rot?: V3 }> = ({ p, s, color, detail = 0, rot = [0, 0, 0] }) => (
  <mesh position={p} scale={s} rotation={rot}>
    <icosahedronGeometry args={[1, detail]} />
    <meshStandardMaterial color={color} flatShading roughness={0.9} />
  </mesh>
);

const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const Arm: React.FC<{ side: 1 | -1; from: Gesture; to: Gesture; t: number; sway: number }> = ({ side, from, to, t, sway }) => {
  const mirror = (p: V3): V3 => [p[0] * side, p[1], p[2]];
  const shoulder = mirror([0.4, 0.48, 0]);
  const pa = POSES[from];
  const pb = POSES[to];
  // The left arm always rests; only the right arm gestures.
  const e = side === 1 ? lerp3(pa.elbow, pb.elbow, t) : POSES.rest.elbow;
  const w = side === 1 ? lerp3(pa.wrist, pb.wrist, t) : POSES.rest.wrist;
  const wrist: V3 = [w[0], w[1] + (side === 1 ? sway : 0), w[2]];
  return (
    <group>
      <Blob p={shoulder} s={[0.12, 0.11, 0.11]} color={SHIRT} />
      <Limb a={shoulder} b={mirror(e)} r0={0.085} r1={0.075} color={SHIRT} />
      <Limb a={mirror(e)} b={mirror(wrist)} r0={0.07} r1={0.058} color={SKIN} />
      <Blob p={mirror(wrist)} s={[0.075, 0.045, 0.09]} color={SKIN} />
    </group>
  );
};

export type PresenterProps = {
  /** Mouth openness per frame at the project fps (0..1), from `scenes/lipsync.ts`. Falls back to a syllable rhythm. */
  mouth?: number[];
  gesture?: Gesture;
  /** Frame (scene-local) when the gesture starts; it eases in over 14 frames. */
  gestureAt?: number;
  /** Gesture before `gestureAt` (default rest). */
  gestureFrom?: Gesture;
  mood?: Mood;
  look?: Look;
  /** Show the mouth moving (false = silent, closed). */
  talking?: boolean;
  position?: V3;
  rotationY?: number;
};

/** Deterministic syllable rhythm used when no lip-sync data exists, so previews still talk. */
const fallbackMouth = (frame: number): number => {
  const s = Math.sin(frame * 0.9) * 0.5 + Math.sin(frame * 0.37 + 1.3) * 0.5;
  return Math.max(0, Math.min(1, 0.5 + s * 0.5 - (Math.sin(frame * 0.11) > 0.8 ? 0.6 : 0)));
};

export const Presenter: React.FC<PresenterProps> = ({
  mouth,
  gesture = "rest",
  gestureAt = 0,
  gestureFrom = "rest",
  mood = "smile",
  look = "camera",
  talking = true,
  position = [0, 0, 0],
  rotationY = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;

  const open = !talking ? 0 : mouth ? (frame < mouth.length ? mouth[frame] : 0) : fallbackMouth(frame); // closed once the speech ends
  const g = interpolate(frame, [gestureAt, gestureAt + 14], [0, 1], { ...clamp, easing: ease });

  // Idle: breathing, a slow head sway, a nod on each mouth peak, a blink about every 3.4 s.
  const breath = Math.sin(sec * 1.9) * 0.008;
  const blinkPhase = (sec % 3.4) / 0.14;
  const blink = blinkPhase < 1 ? Math.sin(blinkPhase * Math.PI) : 0;
  const yaw = { camera: 0, left: -0.35, right: 0.35, down: 0 }[look] + Math.sin(sec * 0.7) * 0.04;
  const pitch = (look === "down" ? 0.28 : 0) + Math.sin(sec * 0.9) * 0.02 + open * 0.035;
  const browLift = mood === "surprise" ? 0.045 : mood === "serious" ? -0.02 : 0;
  const browTilt = mood === "serious" ? 0.12 : 0;
  const smile = mood === "smile" ? 1 : mood === "surprise" ? 0.2 : 0;

  const mouthOpen = 0.12 + open * 0.88;
  const eyeY = 0.045;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* torso */}
      <group position={[0, breath, 0]} scale={[1, 1 + breath * 3, 1]}>
        <mesh position={[0, 0.17, 0]} scale={[1, 1, 0.62]}>
          <cylinderGeometry args={[0.25, 0.37, 0.9, 7, 1]} />
          <meshStandardMaterial color={SHIRT} flatShading roughness={0.9} />
        </mesh>
        <Blob p={[0, 0.5, 0]} s={[0.43, 0.12, 0.22]} color={SHIRT} />
        {/* neck */}
        <mesh position={[0, 0.66, 0.01]}>
          <cylinderGeometry args={[0.1, 0.125, 0.24, 6, 1]} />
          <meshStandardMaterial color={SKIN_SHADE} flatShading roughness={0.9} />
        </mesh>
        {/* collar notch */}
        <mesh position={[0, 0.58, 0.17]} rotation={[0.35, 0, Math.PI / 4]}>
          <boxGeometry args={[0.12, 0.12, 0.02]} />
          <meshStandardMaterial color={SKIN} flatShading roughness={0.9} />
        </mesh>
        <Arm side={1} from={gestureFrom} to={gesture} t={g} sway={Math.sin(sec * 3) * 0.012 * g} />
        <Arm side={-1} from="rest" to="rest" t={0} sway={0} />
      </group>

      {/* head */}
      <group position={[0, 0.9 + breath, 0.02]} rotation={[pitch, yaw, 0]}>
        <Blob p={[0, 0, 0]} s={[0.205, 0.245, 0.215]} color={SKIN} detail={1} />
        {/* jaw / chin */}
        <Blob p={[0, -0.15, 0.03]} s={[0.13, 0.1, 0.12]} color={SKIN} detail={0} />
        {/* ears */}
        <Blob p={[0.215, -0.01, -0.01]} s={[0.04, 0.07, 0.05]} color={SKIN_SHADE} />
        <Blob p={[-0.215, -0.01, -0.01]} s={[0.04, 0.07, 0.05]} color={SKIN_SHADE} />
        {/* nose */}
        <mesh position={[0, -0.03, 0.225]} rotation={[0.25, Math.PI / 4, 0]} scale={[1, 1.3, 1]}>
          <tetrahedronGeometry args={[0.04, 0]} />
          <meshStandardMaterial color={SKIN_SHADE} flatShading roughness={0.9} />
        </mesh>
        {/* eyes: white, iris, pupil, lid */}
        {[-1, 1].map((s) => (
          <group key={s} position={[0.085 * s, eyeY, 0.19]}>
            <Blob p={[0, 0, 0]} s={[0.04, 0.034 * (1 - blink * 0.9), 0.025]} color="#f4f1ea" detail={1} />
            <Blob p={[0, 0, 0.018]} s={[0.022, 0.022 * (1 - blink * 0.9), 0.012]} color={EYE} detail={1} />
            <Blob p={[0, 0, 0.026]} s={[0.01, 0.01 * (1 - blink * 0.9), 0.008]} color="#16202e" />
            {/* brow */}
            <mesh position={[0, 0.066 + browLift, 0.012]} rotation={[0, 0, browTilt * s]}>
              <boxGeometry args={[0.095, 0.02, 0.025]} />
              <meshStandardMaterial color={HAIR} flatShading roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* mouth: lip line plus an opening that grows with the voice */}
        <group position={[0, -0.11, 0.2]}>
          <mesh scale={[1 - open * 0.25, mouthOpen, 1]} position={[0, -open * 0.012, 0]}>
            <icosahedronGeometry args={[0.05, 0]} />
            <meshStandardMaterial color="#5a1f1a" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.002, 0.03]} scale={[1, 0.6, 1]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.11 - open * 0.015, 0.014, 0.014]} />
            <meshStandardMaterial color={SKIN_SHADE} flatShading roughness={0.9} />
          </mesh>
          {/* mouth corners curl up for a smile */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.058 * s, 0.01 * smile, 0.03]} rotation={[0, 0, 0.55 * s * smile]}>
              <boxGeometry args={[0.035, 0.012, 0.014]} />
              <meshStandardMaterial color={SKIN_SHADE} flatShading roughness={0.9} />
            </mesh>
          ))}
        </group>
        {/* hair: swept top, side tufts, back */}
        <Blob p={[0, 0.2, -0.02]} s={[0.24, 0.12, 0.25]} color={HAIR} detail={1} />
        <Blob p={[0.05, 0.27, 0.07]} s={[0.15, 0.08, 0.13]} color={HAIR} rot={[0.3, 0.4, 0.2]} />
        <Blob p={[-0.1, 0.25, 0.08]} s={[0.12, 0.08, 0.1]} color={HAIR} rot={[0.2, -0.5, -0.3]} />
        <Blob p={[0, 0.07, -0.13]} s={[0.23, 0.2, 0.14]} color={HAIR} detail={1} />
        <Blob p={[0.19, 0.1, 0.0]} s={[0.05, 0.1, 0.12]} color={HAIR} />
        <Blob p={[-0.19, 0.1, 0.0]} s={[0.05, 0.1, 0.12]} color={HAIR} />
        <Blob p={[0.0, 0.22, 0.17]} s={[0.17, 0.045, 0.06]} color={HAIR} rot={[0.2, 0, 0.1]} />
      </group>
    </group>
  );
};
