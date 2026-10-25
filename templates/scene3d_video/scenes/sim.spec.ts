/**
 * Simulation specs, one per scene (keys = scene registry keys), plus the live toy. Baked by
 * scripts/three_core_bake_sim.mjs into scenes/sim.json; the finalize step re-bakes with the storyboard durations.
 * Units: metres, seconds. Edit the events to change what happens; the bake refuses to write if a check fails.
 */

import type { SimSpec, Vec3 } from "@remotion-components/three-core/sim";
import type { WaterSpec } from "@remotion-components/scene3d/water";

export const WAND: { at: Vec3; dir: Vec3 } = { at: [-1.3, 1.1, 0.3], dir: [1, 0.35, -0.15] };

/**
 * The pool under the `pool` scene: 0.6 m of clear water over tiles. Waves follow the gravity-capillary dispersion
 * relation (three-core/waves.ts); bubbles that sink onto the surface pop and ring it; caustics cover the floor in view.
 */
export const WATER: WaterSpec = {
  level: 0.35,
  floor: -0.25,
  // calm indoor water: steepness ak of 0.012 to 0.035 focuses light into lines a little above the floor, as in a real pool
  waves: { seed: 5, count: 10, wavelength: [0.08, 0.7], steepness: [0.012, 0.035], directionSpread: 1.2, heading: 0.4 },
  ripples: { amp: 0.01, speed: 0.35, width: 0.06, wavelength: 0.04, decay: 1.2, life: 3, max: 16 },
  caustics: { center: [0, -0.8], half: 3.5, resolution: 1024, grid: 400 },
};

const base: Omit<SimSpec, "events" | "seed"> = {
  duration: 8,
  bounds: { min: [-2.6, 0.2, -1.8], max: [2.6, 3.4, 1.8] },
  gravity: 9.81,
  buoyancy: 9.79, // nearly neutral: soap bubbles sink slowly unless the air carries them
  drag: 3,
  breeze: { amp: 0.18, scale: 1.1, speed: 0.35 },
  radius: [0.07, 0.16],
  lifetime: [4, 9],
  minLifetime: 1,
  caps: { bodies: 28, droplets: 600 },
  droplets: { perPop: 14, speed: 0.9, life: [0.25, 0.6], drag: 4, gravity: 9.81, size: 0.012 },
  vmax: 4,
  popOnBounds: true,
};

export const SIMS: Record<string, SimSpec> = {
  blow: {
    ...base, seed: 101, initial: 0,
    events: [
      { t: 0.4, type: "emit", until: 3.2, origin: WAND.at, dir: WAND.dir, rate: 6, speed: 1.6, spread: 0.18 },
      { t: 3.0, type: "emit", until: 6.5, origin: WAND.at, dir: [1, 0.55, 0.1], rate: 6, speed: 1.5, spread: 0.2 },
    ],
  },
  drift: { ...base, seed: 202, initial: 14, lifetime: [8, 14], events: [] },
  // a smaller box keeps the bubbles in the medium shot, so every pop is seen
  pop: {
    ...base, seed: 303, initial: 12, lifetime: [8, 14], bounds: { min: [-1.4, 0.6, -0.9], max: [1.4, 2.6, 0.9] },
    events: [0.8, 1.3, 1.8, 2.4, 2.9, 3.5, 4.2].map((t) => ({ t, type: "popOldest" as const })),
  },
  // the box floor is the water: a bubble that settles onto it touches the surface and pops, ringing it
  pool: {
    ...base, seed: 404, initial: 12, lifetime: [8, 14],
    buoyancy: 9.76, // a little heavier than air, so bubbles settle onto the water
    bounds: { min: [-2, WATER.level, -2], max: [2, 2.6, 1.5] },
    events: [
      { t: 0.3, type: "emit", until: 3.5, origin: [-1.7, 1.5, -0.6], dir: [1, 0.2, 0.3], rate: 4, speed: 1.2, spread: 0.25 },
      ...[1.5, 2.6, 3.8].map((t) => ({ t, type: "popOldest" as const })),
    ],
  },
};

/** The live page starts empty; the viewer blows. Its events come from input, not from here. */
export const TOY: SimSpec = { ...base, seed: 7, initial: 3, lifetime: [5, 10], events: [] };
