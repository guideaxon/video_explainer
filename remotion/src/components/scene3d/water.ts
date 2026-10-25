/**
 * scene3d water: a shallow tiled pool under a moving surface, with caustics on the floor. Physics and formulas follow
 * three-core/waves.ts; this file is the look (docs/scene3d_design.md section 6, water).
 *
 * Surface: normal from the wave and ripple slopes; exact unpolarised Fresnel for air to water (n = 1.333); the
 * reflection is the studio environment; the refraction is exact for a flat floor: the view ray is refracted at the
 * surface, intersected with the floor plane, and the floor is shaded there (tiles, caustics, sun). Light is absorbed on
 * the way down and back up (Beer-Lambert, per channel) and the water scatters a little of its own colour.
 * (A planar floor makes screen-space refraction and its depth check unnecessary; bubbles are not reflected in v1.)
 *
 * Caustics: a grid of sun rays is refracted through the same surface onto the floor; each grid cell's area before and
 * after refraction gives the light's focusing (area ratio, from screen-space derivatives), accumulated additively into
 * a half-float target that the surface shader samples.
 */

import {
  AdditiveBlending, Color, DoubleSide, HalfFloatType, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial,
  Vector2, Vector3, Vector4, WebGLRenderTarget,
} from "three";
import type { Stage } from "../three-core/stage";
import { makeWaves, ripplesAt, Ripple, RippleSpec, Wave, WaveSpec } from "../three-core/waves";
import type { DropletSpec, Pop } from "../three-core/sim";
import { ENV, envUniforms } from "./shade";
import type { Look } from "./look";

export type WaterSpec = {
  /** Rest height of the surface and of the pool floor (metres). */
  level: number;
  floor: number;
  waves: WaveSpec;
  ripples: RippleSpec;
  /** Square area (centre x, z and half size) that gets caustics; elsewhere the floor is lit evenly. */
  caustics: { center: [number, number]; half: number; resolution: number; grid: number };
};

const MAX_RIPPLES = 16;
const IOR = 1.333;

/** GLSL slope of the wave field plus ripples. fw: pixel footprint (metres) to fade waves the pixel cannot resolve. */
const SLOPE = (nw: number) => /* glsl */ `
#define NW ${nw}
#define NR ${MAX_RIPPLES}
uniform vec4 uWave[NW];   // dx, dz, k, amp
uniform vec2 uWaveW[NW];  // omega, phase
uniform vec4 uRip[NR];    // x, z, t0, amp
uniform vec4 uRipS;       // speed, width, k, decay
uniform float uRipLife;
uniform int uNRip;
uniform float uTime;
vec2 slope(vec2 p, float t, float fw) {
  vec2 g = vec2(0.0);
  for (int i = 0; i < NW; i++) {
    vec4 w = uWave[i];
    float fade = 1.0 - smoothstep(0.25, 0.8, fw * w.z / 6.2831853);
    g += w.w * w.z * cos(w.z * dot(w.xy, p) - uWaveW[i].x * t + uWaveW[i].y) * fade * w.xy;
  }
  for (int i = 0; i < NR; i++) {
    if (i >= uNRip) break;
    vec4 r = uRip[i];
    float tau = t - r.z;
    if (tau < 0.0 || tau > uRipLife) continue;
    vec2 dp = p - r.xy;
    float rr = max(length(dp), 1e-4);
    float d = rr - uRipS.x * tau;
    float e = exp(-(d / uRipS.y) * (d / uRipS.y));
    float A = r.w * exp(-uRipS.w * tau);
    g += A * e * (-2.0 * d / (uRipS.y * uRipS.y) * sin(uRipS.z * d) + uRipS.z * cos(uRipS.z * d)) * dp / rr;
  }
  return g;
}`;

const waveUniforms = (waves: Wave[], r: RippleSpec) => ({
  uWave: { value: waves.map((w) => new Vector4(w.dx, w.dz, w.k, w.amp)) },
  uWaveW: { value: waves.map((w) => new Vector2(w.omega, w.phase)) },
  uRip: { value: Array.from({ length: MAX_RIPPLES }, () => new Vector4()) },
  uRipS: { value: new Vector4(r.speed, r.width, (2 * Math.PI) / r.wavelength, r.decay) },
  uRipLife: { value: r.life },
  uNRip: { value: 0 },
  uTime: { value: 0 },
});

export class Water {
  private readonly waves: Wave[];
  private readonly surface: ShaderMaterial;
  private readonly causticMat: ShaderMaterial;
  /** The caustic map (red channel: light focusing, 1 = flat water). Public for QA. */
  readonly rt: WebGLRenderTarget;
  private readonly cScene = new Scene();
  private readonly cCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly clear = new Color();
  private ripples: Ripple[] = [];
  private readonly surfaceMesh: Mesh;
  private unhook: () => void;

  constructor(private readonly stage: Stage, readonly spec: WaterSpec, look: Look, private readonly droplets: DropletSpec) {
    const w = look.water;
    this.waves = makeWaves(spec.waves);
    const c = spec.caustics;
    this.rt = new WebGLRenderTarget(c.resolution, c.resolution, { type: HalfFloatType, magFilter: LinearFilter, minFilter: LinearFilter, depthBuffer: false });

    const sun = new Vector3(...look.keyDir).normalize();
    const common = { ...waveUniforms(this.waves, spec.ripples), uLevel: { value: spec.level }, uFloor: { value: spec.floor }, uSun: { value: sun } };

    // caustic pass: one vertex per sun ray; the grid overhangs the target so the refracted shift leaves no gap
    const over = Math.abs(spec.level - spec.floor) * 1.5 + 0.3;
    const grid = new PlaneGeometry(2 * (c.half + over), 2 * (c.half + over), c.grid, c.grid);
    grid.rotateX(-Math.PI / 2);
    grid.translate(c.center[0], 0, c.center[1]);
    this.causticMat = new ShaderMaterial({
      uniforms: { ...common, uC: { value: new Vector3(c.center[0], c.center[1], c.half) } },
      vertexShader: /* glsl */ `
        ${SLOPE(this.waves.length)}
        uniform float uLevel, uFloor; uniform vec3 uSun, uC;
        varying vec2 vOld; varying vec2 vNew;
        void main() {
          vec2 p = position.xz;
          vec2 g = slope(p, uTime, 0.0);
          vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
          vec3 L = refract(-uSun, N, ${(1 / IOR).toFixed(6)});
          vec2 hit = p + L.xz * ((uFloor - uLevel) / min(L.y, -1e-3));
          vOld = p; vNew = hit;
          gl_Position = vec4((hit - uC.xy) / uC.z, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec2 vOld; varying vec2 vNew;
        void main() {
          float a0 = abs(dFdx(vOld).x * dFdy(vOld).y - dFdx(vOld).y * dFdy(vOld).x);
          float a1 = abs(dFdx(vNew).x * dFdy(vNew).y - dFdx(vNew).y * dFdy(vNew).x);
          gl_FragColor = vec4(min(a0 / max(a1, 1e-12), 48.0), 0.0, 0.0, 1.0);
        }`,
      // DoubleSide: the xz -> clip mapping mirrors the grid, and folded cells (the bright lines) flip again
      blending: AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, side: DoubleSide,
    });
    const cm = new Mesh(grid, this.causticMat);
    cm.frustumCulled = false;
    this.cScene.add(cm);

    // the surface: a large plane at rest height (it reaches the horizon, where Fresnel turns it into a mirror)
    const plane = new PlaneGeometry(80, 80, 1, 1);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, spec.level, 0);
    this.surface = new ShaderMaterial({
      uniforms: {
        ...envUniforms(look), ...common,
        uCaustic: { value: this.rt.texture }, uC: { value: new Vector3(c.center[0], c.center[1], c.half) },
        uTile: { value: new Color(w.tile) }, uGrout: { value: new Color(w.grout) }, uTileSize: { value: w.tileSize },
        uSigma: { value: new Vector3(...w.sigma) }, uScatter: { value: new Color(w.scatter) },
        uSunCol: { value: new Color(look.key).multiplyScalar(w.sun) }, uAmbient: { value: new Color(look.skyTop).lerp(new Color(look.skyBottom), 0.5).multiplyScalar(w.ambient) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main() { vec4 p = modelMatrix * vec4(position, 1.0); vW = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }`,
      fragmentShader: /* glsl */ `
        ${SLOPE(this.waves.length)}
        ${ENV}
        uniform float uLevel, uFloor, uTileSize; uniform vec3 uSun, uC, uSigma, uScatter, uSunCol, uAmbient, uTile, uGrout;
        uniform sampler2D uCaustic;
        varying vec3 vW;
        float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
        vec3 tiles(vec2 p) {
          vec2 c = p / uTileSize, f = fract(c), id = floor(c);
          float grout = 1.0 - smoothstep(0.035, 0.06, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
          vec3 t = uTile * (0.92 + 0.12 * h12(id));
          return mix(t, uGrout, grout);
        }
        void main() {
          float fw = length(fwidth(vW.xz));
          vec2 g = slope(vW.xz, uTime, fw);
          vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
          vec3 V = normalize(cameraPosition - vW);
          float ci = clamp(dot(N, V), 1e-3, 1.0);
          float n = ${IOR.toFixed(3)};
          float ct = sqrt(max(0.0, 1.0 - (1.0 - ci * ci) / (n * n)));
          float rs = (ci - n * ct) / (ci + n * ct), rp = (n * ci - ct) / (n * ci + ct);
          float F = 0.5 * (rs * rs + rp * rp);                          // exact unpolarised Fresnel
          vec3 refl = env(reflect(-V, N));
          vec3 T = refract(-V, N, 1.0 / n);
          float s = (uFloor - uLevel) / min(T.y, -1e-3);                 // path length to the floor
          vec2 pf = vW.xz + T.xz * s;
          vec2 cuv = (pf - uC.xy) / uC.z * 0.5 + 0.5;
          // fade to even light over the outer 15 % so the caustic area has no visible edge
          vec2 e = min(cuv, 1.0 - cuv);
          float inside = smoothstep(0.0, 0.15, min(e.x, e.y));
          float caustic = mix(1.0, texture2D(uCaustic, clamp(cuv, 0.0, 1.0)).r, inside);
          vec3 Ls = refract(-uSun, vec3(0.0, 1.0, 0.0), 1.0 / n);
          float down = (uLevel - uFloor) / max(-Ls.y, 0.05);            // sunlight's path down to the floor
          vec3 light = uAmbient + uSunCol * caustic * max(-Ls.y, 0.0);
          vec3 trUp = exp(-uSigma * s), trDown = exp(-uSigma * down);
          vec3 under = tiles(pf) * light * trDown * trUp + uScatter * (1.0 - trUp);
          gl_FragColor = vec4(mix(under, refl, F), 1.0);
        }`,
    });
    this.surfaceMesh = new Mesh(plane, this.surface);
    stage.scene.add(this.surfaceMesh);

    // caustics are drawn before every frame, from the same time and ripples as the surface
    this.unhook = stage.beforeRender(() => {
      const r = stage.renderer;
      r.getClearColor(this.clear);
      const alpha = r.getClearAlpha();
      r.setRenderTarget(this.rt);
      r.setClearColor(0x000000, 1);
      r.clear(true, false, false);
      r.render(this.cScene, this.cCam);
      r.setRenderTarget(null);
      r.setClearColor(this.clear, alpha);
    });
  }

  /** Waves at time t, plus ripples from every pop so far (pops on the water ring at once; spray rings where it lands). */
  update(t: number, pops: readonly Pop[]): void {
    this.ripples = ripplesAt(pops, t, this.spec.level, this.droplets, this.spec.ripples);
    for (const m of [this.surface, this.causticMat]) {
      m.uniforms.uTime.value = t;
      m.uniforms.uNRip.value = Math.min(this.ripples.length, MAX_RIPPLES);
      const arr = m.uniforms.uRip.value as Vector4[];
      for (let i = 0; i < MAX_RIPPLES; i++) {
        const rp = this.ripples[i];
        if (rp) arr[i].set(rp.x, rp.z, rp.t0, rp.amp); else arr[i].set(0, 0, -1e6, 0);
      }
    }
  }

  /** Free the caustic target, its grid and both materials, and stop the caustic pass. Safe to call twice. */
  dispose(): void {
    this.unhook();
    this.unhook = () => undefined;
    this.surfaceMesh.removeFromParent();
    this.surfaceMesh.geometry.dispose();
    this.surface.dispose();
    this.cScene.traverse((o) => (o as Mesh).geometry?.dispose());
    this.causticMat.dispose();
    this.rt.dispose();
  }
}
