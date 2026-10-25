/**
 * scene3d looks: palette, studio lights and the post chain (HDR bloom -> tone map -> grade with seeded grain).
 * A scene names its look in its brief; colours live here and nowhere in three-core.
 */

import { HalfFloatType, PerspectiveCamera, Scene, Uniform, WebGLRenderer } from "three";
import { BlendFunction, BloomEffect, Effect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import type { Post } from "../three-core/stage";
import type { Vec3 } from "../three-core/sim";

export type Look = {
  name: string;
  skyTop: string; skyBottom: string;
  key: string; keyDir: Vec3;
  fill: string; fillDir: Vec3;
  bokeh: number; bokehColors: string[]; bokehSeed: number;
  filmGain: number;
  wand: string; droplet: string;
  bloom: { intensity: number; threshold: number };
  exposure: number; saturation: number; warmth: number; vignette: number; grain: number;
  caption: { bg: string; fg: string; font: string };
  /** Pool water: tile and grout colours, tile size (m), absorption per metre (r, g, b), in-scatter colour, sun and ambient strength. */
  water: { tile: string; grout: string; tileSize: number; sigma: Vec3; scatter: string; sun: number; ambient: number };
};

export const LOOKS: Record<"studio" | "garden" | "dusk", Look> = {
  // soft lavender-to-peach studio sweep, warm white bokeh: the default
  studio: {
    name: "studio", skyTop: "#6f8fc4", skyBottom: "#f4b9a2", key: "#fff4e6", keyDir: [0.45, 0.6, 0.65], fill: "#c9d8ff", fillDir: [-0.7, 0.25, 0.5],
    bokeh: 0.16, bokehColors: ["#fff1d6", "#ffd6c2", "#e8e0ff"], bokehSeed: 11, filmGain: 6, wand: "#e0567a", droplet: "#e9f2ff",
    bloom: { intensity: 0.7, threshold: 0.82 }, exposure: 1.0, saturation: 1.2, warmth: 0.03, vignette: 0.28, grain: 0.025,
    caption: { bg: "rgba(30, 28, 44, 0.72)", fg: "#fbf6ee", font: "Inter, system-ui, sans-serif" },
    water: { tile: "#a9d6dc", grout: "#6a96a0", tileSize: 0.15, sigma: [0.55, 0.12, 0.08], scatter: "#2f7f92", sun: 1.1, ambient: 0.22 },
  },
  // summer garden: green shade, low sun, gold bokeh
  garden: {
    name: "garden", skyTop: "#5f8f6a", skyBottom: "#d9e6b0", key: "#fff0c4", keyDir: [0.3, 0.45, 0.85], fill: "#bfe8ff", fillDir: [-0.6, 0.5, 0.3],
    bokeh: 0.3, bokehColors: ["#fff3b0", "#d8f5a8", "#ffe1a3"], bokehSeed: 23, filmGain: 5, wand: "#2f7fd8", droplet: "#f4fbe9",
    bloom: { intensity: 0.85, threshold: 0.78 }, exposure: 1.0, saturation: 1.15, warmth: 0.05, vignette: 0.32, grain: 0.03,
    caption: { bg: "rgba(18, 38, 26, 0.72)", fg: "#f6f3e4", font: "Inter, system-ui, sans-serif" },
    water: { tile: "#d6e8c8", grout: "#8aa585", tileSize: 0.12, sigma: [0.6, 0.15, 0.2], scatter: "#3d7f5f", sun: 1.2, ambient: 0.22 },
  },
  // blue hour: deep sky, coral key, city-light bokeh
  dusk: {
    name: "dusk", skyTop: "#1d2a52", skyBottom: "#7a4a6e", key: "#ffb48a", keyDir: [-0.4, 0.35, 0.85], fill: "#7fb6ff", fillDir: [0.7, 0.3, 0.4],
    bokeh: 0.45, bokehColors: ["#ffcf8a", "#ff8fa8", "#9fd0ff"], bokehSeed: 37, filmGain: 6.5, wand: "#ffd166", droplet: "#ffe9d6",
    bloom: { intensity: 1.1, threshold: 0.7 }, exposure: 1.05, saturation: 1.18, warmth: 0.0, vignette: 0.38, grain: 0.035,
    caption: { bg: "rgba(14, 14, 30, 0.74)", fg: "#fff4ea", font: "Inter, system-ui, sans-serif" },
    water: { tile: "#9fb8d6", grout: "#4d5f80", tileSize: 0.15, sigma: [0.5, 0.14, 0.06], scatter: "#1f3d6a", sun: 1.0, ambient: 0.16 },
  },
};

export type LookName = keyof typeof LOOKS;

/** White balance, saturation, vignette and film grain after tone mapping. Grain is seeded by uSeed (the frame), never a clock. */
class GradeEffect extends Effect {
  constructor(look: Look) {
    super("Scene3dGrade", /* glsl */ `
      uniform float uSat, uWarm, uVig, uGrain, uSeed;
      float g13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, uSat);
        c += vec3(uWarm, uWarm * 0.35, -uWarm) * smoothstep(0.3, 1.0, l);
        vec2 q = uv - 0.5;
        c *= 1.0 - uVig * pow(length(q * vec2(1.0, 0.85)) * 1.4, 2.4);
        c += (g13(vec3(gl_FragCoord.xy, uSeed)) - 0.5) * uGrain;
        outputColor = vec4(clamp(c, 0.0, 1.0), inputColor.a);
      }`, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ["uSat", new Uniform(look.saturation)], ["uWarm", new Uniform(look.warmth)], ["uVig", new Uniform(look.vignette)],
        ["uGrain", new Uniform(look.grain)], ["uSeed", new Uniform(0)],
      ]),
    });
  }
  set seed(v: number) { this.uniforms.get("uSeed")!.value = v % 4096; }
}

export type LookPost = Post & { setSeed: (n: number) => void; setBloom: (on: boolean) => void };

/** The post chain for a look. render() passes deltaTime 0: no effect may advance on its own clock. */
export const lookPost = (look: Look, { multisampling = 4 } = {}) => (renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): LookPost => {
  renderer.toneMappingExposure = look.exposure;
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({ intensity: look.bloom.intensity, luminanceThreshold: look.bloom.threshold, luminanceSmoothing: 0.2, mipmapBlur: true, radius: 0.7 });
  const grade = new GradeEffect(look);
  const bloomPass = new EffectPass(camera, bloom);
  composer.addPass(bloomPass);
  // Neutral (Khronos PBR) keeps hues: AgX greyed the pastel sweep and the film colours in the first test renders
  composer.addPass(new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade));
  return {
    render: () => composer.render(0),
    setSize: (w, h) => composer.setSize(w, h, false),
    dispose: () => composer.dispose(),
    setSeed: (n) => { grade.seed = n; },
    setBloom: (on) => { bloomPass.enabled = on; },
  };
};
