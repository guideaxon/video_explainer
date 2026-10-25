/**
 * The three-core time contract (docs/scene3d_design.md section 4).
 *
 * Everything visible at time t is computed from t, the seed and the logged inputs. Scenes receive t (seconds) and the
 * simulation step index only; they never read performance.now(), Date.now(), r3f's useFrame delta or clock, or three's
 * Clock / Timer. Video mode gets t from Remotion's frame; live mode advances t in fixed steps.
 */

/** Simulation steps per second. Fixed: the same steps run in the Node bake and in the live page. */
export const STEP_HZ = 60;
export const STEP = 1 / STEP_HZ;

/** Scene-local time in seconds for a video frame. */
export const frameTime = (frame: number, fps: number): number => frame / fps;

/** Number of simulation steps that have run by time t (rounded, so 30 fps maps exactly onto every second step). */
export const stepsAt = (t: number): number => Math.round(t * STEP_HZ);

/** Clamp a frame into a baked range [0, frames - 1]. */
export const clampFrame = (frame: number, frames: number): number => (frame < 0 ? 0 : frame >= frames ? frames - 1 : Math.floor(frame));
