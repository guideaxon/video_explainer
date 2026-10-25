/**
 * scene3d shaders (GLSL, WebGL2 via three.js ShaderMaterial). Formulas are stated so review can check them
 * (docs/scene3d_design.md section 6; assumptions in docs/scene3d_video_style_guide.md).
 */

import { AdditiveBlending, BackSide, Color, FrontSide, ShaderMaterial, Vector3 } from "three";
import type { Look } from "./look";

export const NOISE = /* glsl */ `
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1,0,0)), f.x), mix(h13(i + vec3(0,1,0)), h13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h13(i + vec3(0,0,1)), h13(i + vec3(1,0,1)), f.x), mix(h13(i + vec3(0,1,1)), h13(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;

/** Analytic studio environment shared by the bubbles (what they reflect) and the backdrop (what we see behind). */
export const ENV = /* glsl */ `
uniform vec3 uSkyTop, uSkyBottom, uKey, uKeyDir, uFill, uFillDir;
vec3 env(vec3 r) {
  vec3 c = mix(uSkyBottom, uSkyTop, smoothstep(-0.35, 0.8, r.y));
  float k = dot(r, uKeyDir), f = dot(r, uFillDir);
  c += uKey * (smoothstep(0.955, 0.975, k) * 2.2 + pow(max(k, 0.0), 400.0) * 10.0); // soft box, hot centre
  c += uFill * smoothstep(0.86, 0.93, f) * 0.7;
  c += uSkyTop * 0.25 * smoothstep(0.2, 0.0, abs(r.y + 0.05));                     // horizon band
  return c;
}`;

export const envUniforms = (look: Look) => ({
  uSkyTop: { value: new Color(look.skyTop) },
  uSkyBottom: { value: new Color(look.skyBottom) },
  uKey: { value: new Color(look.key) },
  uKeyDir: { value: new Vector3(...look.keyDir).normalize() },
  uFill: { value: new Color(look.fill) },
  uFillDir: { value: new Vector3(...look.fillDir).normalize() },
});

/**
 * Soap film. Thin-film interference for two reflections with a pi phase shift at the front surface:
 *   I(lambda) ~ 2 R (1 - cos(4 pi n d cos(theta_t) / lambda)),  sin(theta_t) = sin(theta_i) / n,  n = 1.33
 * R is Schlick's Fresnel (R0 = 0.02). Thickness d (nm) drains toward the bottom, swirls with a slow noise field and
 * thins with age. Shaded as additive, premultiplied reflection with no depth write, so overlapping films need no
 * sorting (design section 6, Transparency). Per-instance state comes from the aState attribute:
 *   x age (s), y pop (-1 none, 0..1 tear, 1..2 fade), z seed (0..1), w thinning (0..1).
 */
export const bubbleMaterial = (look: Look, side: "back" | "front"): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: { ...envUniforms(look), uTime: { value: 0 }, uGain: { value: look.filmGain }, uBack: { value: side === "back" ? 1 : 0 } },
    vertexShader: /* glsl */ `
      attribute vec4 aState;
      uniform float uTime;
      varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec4 vS;
      void main() {
        float age = aState.x, s = aState.z * 6.2831;
        // a film wobbles hard when it leaves the wand, then settles to a faint shimmer
        float wob = 0.06 * exp(-age * 1.8) + 0.01;
        vec3 p = position;
        float w = sin(3.0 * p.x + 2.1 * uTime + s) * sin(2.0 * p.y + 1.7 * uTime + 1.3 * s) + 0.6 * sin(4.0 * p.z - 1.3 * uTime + s);
        float grow = mix(0.5, 1.0, smoothstep(0.0, 0.22, age));             // inflates as it leaves the wand
        vec3 q = p * (1.0 + wob * w) * grow;
        q.y *= 1.0 + 0.12 * exp(-age * 3.0);                                 // newborn stretch
        vec4 world = modelMatrix * instanceMatrix * vec4(q, 1.0);
        vW = world.xyz; vL = p; vS = aState;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * p);
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      ${ENV}
      uniform float uTime, uGain, uBack;
      varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec4 vS;
      void main() {
        float pop = vS.y, seed = vS.z;
        vec3 tear = normalize(vec3(sin(seed * 40.0), cos(seed * 23.0), sin(seed * 17.0 + 1.0)));
        float edge = 0.0;
        if (pop >= 0.0 && pop <= 1.0) {
          float cut = 1.0 - 2.2 * pop;                       // the hole opens from one point and runs round the film
          float s = dot(vL, tear);
          if (s > cut) discard;
          edge = smoothstep(cut - 0.12, cut, s);              // the rolling rim catches light
        }
        float fade = pop > 1.0 ? 2.0 - pop : 1.0;
        vec3 N = normalize(vN) * (uBack > 0.5 ? -1.0 : 1.0);
        vec3 V = normalize(cameraPosition - vW);
        float ci = clamp(dot(N, V), 0.0, 1.0);
        float n = 1.33;
        float st = sqrt(1.0 - ci * ci) / n, ct = sqrt(1.0 - st * st);
        float swirl = vnoise(vL * 3.6 + vec3(0.0, uTime * 0.18, seed * 13.0)) * 0.65 + vnoise(vL * 7.3 - vec3(uTime * 0.1)) * 0.35;
        // 150..800 nm: first- to third-order interference; drainage makes horizontal bands, the swirl bends them
        float d = (180.0 + 330.0 * (0.5 - 0.5 * vL.y) + 300.0 * swirl) * mix(1.0, 0.45, vS.w);
        vec3 lam = vec3(650.0, 550.0, 450.0);
        vec3 film = 1.0 - cos(12.566370 * n * d * ct / lam);
        float F = 0.02 + 0.98 * pow(1.0 - ci, 5.0);
        vec3 R = env(reflect(-V, N));
        // a little reflected light at every angle, so the face of the film is not invisible where F is tiny
        float Fv = max(F, 0.022);
        vec3 col = film * Fv * R * uGain + edge * R * 0.6;
        gl_FragColor = vec4(col * fade * (uBack > 0.5 ? 0.6 : 1.0), 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: side === "back" ? BackSide : FrontSide,
  });

/** Backdrop: the same studio environment, seen out of focus, with soft bokeh discs (positions from the look's seed). */
export const backdropMaterial = (look: Look, discs: { dir: Vector3; size: number; color: Color }[]): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      ...envUniforms(look),
      uDisc: { value: discs.map((d) => new Vector3().copy(d.dir).normalize()) },
      uDiscSize: { value: discs.map((d) => d.size) },
      uDiscColor: { value: discs.map((d) => d.color) },
      uBokeh: { value: look.bokeh },
    },
    vertexShader: /* glsl */ `
      varying vec3 vD;
      void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${ENV}
      #define DISCS ${discs.length}
      uniform vec3 uDisc[DISCS]; uniform float uDiscSize[DISCS]; uniform vec3 uDiscColor[DISCS]; uniform float uBokeh;
      varying vec3 vD;
      void main() {
        vec3 d = normalize(vD);
        vec3 c = mix(uSkyBottom, uSkyTop, smoothstep(-0.3, 0.7, d.y));
        c += uKey * smoothstep(0.75, 1.0, dot(d, uKeyDir)) * 0.35;           // the key light's glow on the sweep
        for (int i = 0; i < DISCS; i++) {
          float a = acos(clamp(dot(d, uDisc[i]), -1.0, 1.0)) / uDiscSize[i];
          float disc = smoothstep(1.0, 0.9, a) * (0.7 + 0.3 * smoothstep(0.6, 0.97, a)); // brighter rim, like a lens
          c = mix(c, c + uDiscColor[i], disc * uBokeh);
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: BackSide,
    depthWrite: false,
  });
