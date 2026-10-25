/**
 * The scene3d bubble set: studio backdrop with bokeh, a bubble wand, soap-film bubbles and droplets. One class drives
 * both the video (from a baked frame) and the live page (from the running World), so both draw the same pixels for
 * the same state.
 */

import {
  Color, CylinderGeometry, DirectionalLight, DynamicDrawUsage, HemisphereLight, IcosahedronGeometry, InstancedBufferAttribute,
  InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, AdditiveBlending, Quaternion, SphereGeometry, TorusGeometry, Vector3, Group,
} from "three";
import { Stage } from "../three-core/stage";
import { BODY_STRIDE, dropletsAt, Pop, SimSpec, Vec3 } from "../three-core/sim";
import { mulberry32 } from "../three-core/rng";
import { bubbleMaterial, backdropMaterial } from "./shade";
import { Look, LookPost, lookPost } from "./look";
import { Water, WaterSpec } from "./water";

/** Ages above this read as fully thinned film (colours shift toward gold and magenta before a pop). */
const THIN_AGE = 6;

export class BubbleSet {
  readonly post: LookPost;
  private bubbles: InstancedMesh[];
  private state: InstancedBufferAttribute;
  private droplets: InstancedMesh;
  private materials: ReturnType<typeof bubbleMaterial>[];
  private m = new Matrix4();
  private q = new Quaternion();
  private v = new Vector3();
  private s = new Vector3();
  private scratch: number[] = [];
  readonly water: Water | null = null;

  constructor(private readonly stage: Stage, private readonly spec: SimSpec, readonly look: Look, opts: { wand?: { at: Vec3; dir: Vec3 } | null; water?: WaterSpec | null; multisampling?: number } = {}) {
    const scene = stage.scene;
    if (opts.water) this.water = new Water(stage, opts.water, look, spec.droplets);

    // backdrop: a large sphere, seen from inside
    const rnd = mulberry32(look.bokehSeed);
    const discs = Array.from({ length: 14 }, (_, i) => ({
      dir: new Vector3(rnd() * 2 - 1, rnd() * 1.1 - 0.25, -0.4 - rnd() * 0.9),
      size: 0.018 + rnd() * 0.035,
      color: new Color(look.bokehColors[i % look.bokehColors.length]).multiplyScalar(0.6 + rnd() * 0.6),
    }));
    const backdrop = new Mesh(new SphereGeometry(60, 48, 32), backdropMaterial(look, discs));
    backdrop.renderOrder = -1;
    scene.add(backdrop);

    // lights for the solid wand
    scene.add(new HemisphereLight(new Color(look.skyTop), new Color(look.skyBottom), 1.4));
    const key = new DirectionalLight(new Color(look.key), 2.2);
    key.position.set(...look.keyDir);
    scene.add(key);

    if (opts.wand) scene.add(makeWand(look, opts.wand.at, opts.wand.dir));

    // bubbles: one unit-sphere geometry, two meshes (back faces first, then front), per-instance state shared
    const cap = spec.caps.bodies * 2;
    const geo = new SphereGeometry(1, 48, 32);
    this.state = new InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(DynamicDrawUsage);
    geo.setAttribute("aState", this.state);
    this.materials = [bubbleMaterial(look, "back"), bubbleMaterial(look, "front")];
    this.bubbles = this.materials.map((mat, i) => {
      const mesh = new InstancedMesh(geo, mat, cap);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.renderOrder = 10 + i;
      mesh.count = 0;
      scene.add(mesh);
      return mesh;
    });

    const dcap = spec.caps.droplets;
    this.droplets = new InstancedMesh(new IcosahedronGeometry(1, 1), new MeshBasicMaterial({ color: new Color(look.droplet).multiplyScalar(1.6), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }), dcap);
    this.droplets.instanceMatrix.setUsage(DynamicDrawUsage);
    this.droplets.frustumCulled = false;
    this.droplets.renderOrder = 12;
    this.droplets.count = 0;
    scene.add(this.droplets);

    this.post = lookPost(look, { multisampling: opts.multisampling ?? 4 })(stage.renderer, scene, stage.camera);
    stage.setPost(() => this.post);
  }

  /** Bodies from a flat snapshot (BODY_STRIDE values each), at scene time t; `seed` drives film grain (frame or step). */
  setBodies(flat: readonly number[], t: number, seed: number): void {
    const n = Math.min(flat.length / BODY_STRIDE, this.bubbles[0].instanceMatrix.count);
    const st = this.state.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const o = i * BODY_STRIDE, r = flat[o + 4], age = flat[o + 5];
      this.v.set(flat[o + 1], flat[o + 2], flat[o + 3]);
      this.s.set(r, r, r);
      this.m.compose(this.v, this.q, this.s);
      for (const b of this.bubbles) b.setMatrixAt(i, this.m);
      st[i * 4] = age; st[i * 4 + 1] = flat[o + 6]; st[i * 4 + 2] = (flat[o + 7] % 1000) / 1000; st[i * 4 + 3] = Math.min(1, Math.max(0, age) / THIN_AGE);
    }
    for (const b of this.bubbles) { b.count = n; b.instanceMatrix.needsUpdate = true; }
    this.state.needsUpdate = true;
    for (const m of this.materials) m.uniforms.uTime.value = t;
    this.post.setSeed(seed);
  }

  /** Droplets of every pop at time t (closed form, three-core dropletsAt), and the water's waves and ripples. */
  setDroplets(pops: readonly Pop[], t: number): void {
    this.water?.update(t, pops);
    this.scratch.length = 0;
    const d = dropletsAt(pops, t, this.spec.droplets, this.scratch);
    const n = Math.min(d.length / 4, this.droplets.instanceMatrix.count);
    for (let i = 0; i < n; i++) {
      this.v.set(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      const s = d[i * 4 + 3];
      this.s.set(s, s, s);
      this.m.compose(this.v, this.q, this.s);
      this.droplets.setMatrixAt(i, this.m);
    }
    this.droplets.count = n;
    this.droplets.instanceMatrix.needsUpdate = true;
  }

  /**
   * Free what the stage's scene walk cannot reach: the water's caustic target and pass. (Meshes in the scene are freed
   * by Stage.dispose.) Call before Stage.dispose.
   */
  dispose(): void {
    this.water?.dispose();
  }
}

/** A plastic bubble wand: a ring at `at` facing `dir`, with a handle. */
const makeWand = (look: Look, at: Vec3, dir: Vec3): Group => {
  const g = new Group();
  const mat = new MeshStandardMaterial({ color: new Color(look.wand), roughness: 0.35, metalness: 0 });
  const ring = new Mesh(new TorusGeometry(0.16, 0.018, 16, 64), mat);
  const handle = new Mesh(new CylinderGeometry(0.016, 0.02, 0.9, 16), mat);
  handle.position.set(0, -0.16 - 0.45, 0);
  g.add(ring, handle);
  g.position.set(...at);
  g.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...dir).normalize()); // the ring faces the blow
  return g;
};
