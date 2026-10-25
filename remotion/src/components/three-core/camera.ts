/**
 * Shot interpolation: data in, camera pose out. The shot presets (where a bundle likes to put its camera) belong to
 * the bundle; this file only knows how to move between two poses.
 */

import type { Vec3 } from "./sim";

export type Pose = { pos: Vec3; target: Vec3; fov: number };
export type Ease = "linear" | "inOut" | "out";
export type Shot = { from: Pose; to: Pose; ease?: Ease };

const EASES: Record<Ease, (x: number) => number> = {
  linear: (x) => x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2), // cubic in-out
  out: (x) => 1 - (1 - x) ** 3, // cubic out
};

const mix = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** Pose at progress k (0..1, clamped) through a shot. */
export const poseAt = (shot: Shot, k: number): Pose => {
  const e = EASES[shot.ease ?? "inOut"](k < 0 ? 0 : k > 1 ? 1 : k);
  return { pos: mix(shot.from.pos, shot.to.pos, e), target: mix(shot.from.target, shot.to.target, e), fov: shot.from.fov + (shot.to.fov - shot.from.fov) * e };
};
