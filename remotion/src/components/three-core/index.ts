/**
 * three-core: the shared, style-free engine for code-built three.js scenes (docs/scene3d_design.md).
 * Any bundle may import it, as any bundle may import `rig`. It must not contain colours, look-defining shaders or
 * camera presets; a test enforces that.
 *
 * Node-safe modules (no DOM, no three.js): time, rng, sim, bake, camera. Browser modules: stage, live, video.
 */

export * from "./time";
export * from "./rng";
export * from "./sim";
export * from "./waves";
export * from "./bake";
export * from "./camera";
export * from "./stage";
export * from "./live";
export { StageView } from "./video";
export type { SceneHandle, BuildScene } from "./video";
