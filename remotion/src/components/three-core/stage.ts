/**
 * The one render path for both modes: a WebGL2 renderer, a scene, a camera and an optional post chain, drawn
 * synchronously for a given t. Video mode (video.tsx) and live mode (live.ts) both use this class, so a frame at the
 * same t is drawn by the same code (docs/scene3d_design.md risk 5).
 *
 * Why not @remotion/three's ThreeCanvas here: it schedules react-three-fiber's own loop. The imperative stage lets the
 * live page and the video share every line of scene code without React, and the post chain is driven with an explicit
 * delta of 0, so no effect reads a wall clock.
 */

import { PerspectiveCamera, Scene, WebGLRenderer, NoToneMapping, SRGBColorSpace, Vector2, Vector3 } from "three";
import type { Pose } from "./camera";
import type { Vec3 } from "./sim";

export type Post = { render: () => void; setSize: (w: number, h: number) => void; dispose: () => void };
export type PostBuilder = (renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) => Post;
export type Mode = "video" | "live";

export type Capabilities = { webgl2: boolean; floatTargets: boolean; halfFloatTargets: boolean; missing: string[] };

/** WebGL2 plus renderable float or half-float targets (bloom and HDR buffers need one of them). */
export const checkCapabilities = (renderer: WebGLRenderer): Capabilities => {
  const gl = renderer.getContext();
  const webgl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
  const floatTargets = webgl2 && !!gl.getExtension("EXT_color_buffer_float");
  const halfFloatTargets = floatTargets || !!gl.getExtension("EXT_color_buffer_half_float");
  const missing = [!webgl2 && "WebGL2", !halfFloatTargets && "renderable float or half-float targets"].filter(Boolean) as string[];
  return { webgl2, floatTargets, halfFloatTargets, missing };
};

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly caps: Capabilities;
  private post: Post | null = null;

  constructor(canvas: HTMLCanvasElement, { width, height, mode, pixelRatio = 1 }: { width: number; height: number; mode: Mode; pixelRatio?: number }) {
    // preserveDrawingBuffer in video mode: Remotion screenshots the canvas after the frame has been drawn.
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: mode === "video", powerPreference: "high-performance" });
    this.caps = checkCapabilities(this.renderer);
    if (this.caps.missing.length && mode === "video") {
      throw new Error(`three-core: this browser lacks ${this.caps.missing.join(", ")}; refusing to render a degraded video frame.`);
    }
    if (mode === "video") {
      // three.js only logs a shader that fails to compile and then skips the object; a video frame with a missing
      // object must fail the render instead of shipping quietly.
      this.renderer.debug.onShaderError = (gl, program, vs, fs) => {
        const log = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs)].filter(Boolean).join("\n");
        throw new Error(`three-core: a shader failed to compile; refusing to render.\n${log}`);
      };
    }
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping; // tone mapping belongs to the post chain (HDR first, then tone map)
    this.camera = new PerspectiveCamera(40, width / height, 0.05, 200);
  }

  setPost(build: PostBuilder | null): void {
    this.post?.dispose();
    this.post = build ? build(this.renderer, this.scene, this.camera) : null;
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.post?.setSize(width, height);
  }

  setPose(pose: Pose): void {
    this.camera.position.set(...pose.pos);
    this.camera.lookAt(...pose.target);
    if (this.camera.fov !== pose.fov) { this.camera.fov = pose.fov; this.camera.updateProjectionMatrix(); }
    this.camera.updateMatrixWorld();
  }

  private before: (() => void)[] = [];

  /** Run `fn` before every frame (offscreen passes such as caustics). Returns a function that removes it. */
  beforeRender(fn: () => void): () => void {
    this.before.push(fn);
    return () => { this.before = this.before.filter((f) => f !== fn); };
  }

  render(): void {
    for (const fn of this.before) fn();
    if (this.post) this.post.render();
    else this.renderer.render(this.scene, this.camera);
  }

  /** World-space ray through a canvas point given in normalised device coordinates (-1..1). */
  rayAt(ndcX: number, ndcY: number): { origin: Vec3; dir: Vec3 } {
    const p = new Vector3(ndcX, ndcY, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
    return { origin: this.camera.position.toArray() as Vec3, dir: p.toArray() as Vec3 };
  }

  /** Project a world point to normalised device coordinates. */
  toNdc(p: Vec3): Vector2 {
    const v = new Vector3(...p).project(this.camera);
    return new Vector2(v.x, v.y);
  }

  dispose(): void {
    this.post?.dispose();
    this.scene.traverse((o) => {
      const m = o as unknown as { geometry?: { dispose(): void }; material?: { dispose(): void } | { dispose(): void }[] };
      m.geometry?.dispose();
      (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss(); // free the context: a long storyboard mounts many scenes in one tab
  }
}
