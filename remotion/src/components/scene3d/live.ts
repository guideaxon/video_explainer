/**
 * scene3d live page: the bubble toy you can play with. Hold to blow (button, Space or long press), drag while blowing
 * to aim, tap a bubble to pop it, drag elsewhere to look around, pinch or wheel to zoom, Reset to start again.
 * Keys: Space blow, arrows aim, P pop the bubble nearest the centre, R reset, E save the session's event log.
 *
 * Same World and BubbleSet as the video, stepped by three-core's fixed-step LiveLoop.
 */

import { Stage } from "../three-core/stage";
import { World, SimSpec, Vec3 } from "../three-core/sim";
import { LiveLoop, EventLog, Orbit, attachGestures, QualityGovernor } from "../three-core/live";
import { BubbleSet } from "./toy";
import type { WaterSpec } from "./water";
import { LOOKS, LookName } from "./look";

export type ToyOptions = { spec: SimSpec; look?: LookName; title?: string; wand: { at: Vec3; dir: Vec3 }; water?: WaterSpec | null; view?: { target: Vec3; yaw: number; pitch: number; dist: number } };

const css = (look: (typeof LOOKS)[LookName]) => `
  html, body { margin: 0; height: 100%; background: ${look.skyBottom}; overflow: hidden; font-family: ${look.caption.font}; }
  .s3-root { position: fixed; inset: 0; touch-action: none; }
  .s3-root canvas { width: 100%; height: 100%; display: block; }
  .s3-bar { position: absolute; left: 0; right: 0; bottom: max(18px, env(safe-area-inset-bottom)); display: flex; gap: 12px; justify-content: center; }
  .s3-btn { font: 600 17px/1 ${look.caption.font}; color: ${look.caption.fg}; background: ${look.caption.bg}; border: 0; border-radius: 999px;
            padding: 15px 24px; min-height: 48px; min-width: 48px; cursor: pointer; backdrop-filter: blur(8px); user-select: none; -webkit-user-select: none; }
  .s3-btn[aria-pressed="true"] { outline: 2px solid ${look.caption.fg}; }
  .s3-btn:focus-visible { outline: 3px solid ${look.caption.fg}; outline-offset: 2px; }
  .s3-hint { position: absolute; top: max(18px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); color: ${look.caption.fg};
             background: ${look.caption.bg}; padding: 10px 18px; border-radius: 999px; font-size: 15px; transition: opacity .8s; pointer-events: none; white-space: nowrap; }
  .s3-msg { position: absolute; inset: 0; display: grid; place-items: center; color: ${look.caption.fg}; background: ${look.caption.bg}; text-align: center; padding: 24px; font-size: 18px; }
  .s3-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }`;

export const startBubbleToy = (root: HTMLElement, opts: ToyOptions): { dispose: () => void } => {
  const look = LOOKS[opts.look ?? "studio"];
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const spec: SimSpec = reduced
    ? { ...opts.spec, breeze: { ...opts.spec.breeze, amp: opts.spec.breeze.amp * 0.5 }, droplets: { ...opts.spec.droplets, perPop: Math.ceil(opts.spec.droplets.perPop / 2) }, events: [] }
    : { ...opts.spec, events: [] };

  const style = document.createElement("style");
  style.textContent = css(look);
  document.head.appendChild(style);
  root.classList.add("s3-root");
  root.innerHTML = `<canvas aria-label="${opts.title ?? "Bubble toy"}: an interactive 3D scene"></canvas>
    <div class="s3-hint" role="note">Hold Blow · tap a bubble to pop · drag to look</div>
    <div class="s3-bar"><button class="s3-btn" data-blow aria-pressed="false">Blow</button><button class="s3-btn" data-reset>Reset</button></div>
    <div class="s3-sr" aria-live="polite"></div>`;
  const canvas = root.querySelector("canvas")!;
  const hint = root.querySelector<HTMLElement>(".s3-hint")!;
  const live = root.querySelector<HTMLElement>(".s3-sr")!;
  const blowBtn = root.querySelector<HTMLButtonElement>("[data-blow]")!;

  const size = () => [Math.max(1, root.clientWidth), Math.max(1, root.clientHeight)] as const;
  const [w, h] = size();
  let stage: Stage;
  try {
    stage = new Stage(canvas, { width: w, height: h, mode: "live", pixelRatio: Math.min(devicePixelRatio || 1, 2) });
  } catch {
    root.insertAdjacentHTML("beforeend", `<div class="s3-msg">This scene needs WebGL2. Try a recent Chrome, Edge, Firefox or Safari.</div>`);
    return { dispose: () => undefined };
  }
  if (stage.caps.missing.length) root.insertAdjacentHTML("beforeend", `<div class="s3-msg">This device lacks ${stage.caps.missing.join(", ")}, so the scene cannot run here.</div>`);

  const set = new BubbleSet(stage, spec, look, { wand: opts.wand, water: opts.water ?? null, multisampling: 4 });
  const view = opts.view ?? { target: [0, 1.5, 0] as Vec3, yaw: 0, pitch: 0.05, dist: 4.4 };
  const orbit = new Orbit(view.target, view.yaw, view.pitch, view.dist);
  const log = new EventLog();
  let world = new World(spec);
  let aim = { yaw: 0, pitch: 0 };
  let blowing = false;
  let used = false;

  const blowDir = (): Vec3 => {
    const d = opts.wand.dir, cy = Math.cos(aim.yaw), sy = Math.sin(aim.yaw);
    const x = d[0] * cy - d[2] * sy, z = d[0] * sy + d[2] * cy;
    return [x, d[1] + aim.pitch, z];
  };
  const emit = () => world.addEvent(log.push({ t: world.t, type: "emit", until: world.t + 3600, origin: opts.wand.at, dir: blowDir(), rate: 7, speed: 1.5, spread: 0.18 }));
  const setBlow = (on: boolean) => {
    if (on === blowing) return;
    blowing = on;
    blowBtn.setAttribute("aria-pressed", String(on));
    if (on) { emit(); if (!used) { used = true; hint.style.opacity = "0"; } }
    else world.addEvent(log.push({ t: world.t, type: "stopEmit" }));
  };
  const reAim = (dYaw: number, dPitch: number) => {
    aim = { yaw: Math.max(-1.1, Math.min(1.1, aim.yaw + dYaw)), pitch: Math.max(-0.5, Math.min(0.9, aim.pitch + dPitch)) };
    if (blowing) { world.addEvent(log.push({ t: world.t, type: "stopEmit" })); emit(); }
  };
  const popAt = (x: number, y: number) => {
    const ray = stage.rayAt(x, y);
    if (world.pick(ray.origin, ray.dir) >= 0) { world.addEvent(log.push({ t: world.t, type: "pop", ray })); live.textContent = "Pop"; }
  };
  const reset = () => {
    setBlow(false);
    world = new World(spec);
    log.clear();
    aim = { yaw: 0, pitch: 0 };
    orbit.set(view.yaw, view.pitch, view.dist, true);
    live.textContent = "Reset";
  };

  const offGestures = attachGestures(canvas, {
    onTap: popAt,
    onDrag: (dx, dy) => (blowing ? reAim(dx * 0.004, -dy * 0.004) : orbit.rotate(-dx * 0.006, dy * 0.004)),
    onZoom: (f) => orbit.zoom(f),
  });
  const hold = (on: boolean) => (e: Event) => { e.preventDefault(); setBlow(on); };
  blowBtn.addEventListener("pointerdown", hold(true));
  blowBtn.addEventListener("pointerup", hold(false));
  blowBtn.addEventListener("pointercancel", hold(false));
  blowBtn.addEventListener("pointerleave", () => setBlow(false));
  root.querySelector("[data-reset]")!.addEventListener("click", reset);
  const keydown = (e: KeyboardEvent) => {
    if (e.code === "Space") { e.preventDefault(); if (!e.repeat) setBlow(true); }
    else if (e.code === "ArrowLeft") reAim(-0.08, 0);
    else if (e.code === "ArrowRight") reAim(0.08, 0);
    else if (e.code === "ArrowUp") reAim(0, 0.06);
    else if (e.code === "ArrowDown") reAim(0, -0.06);
    else if (e.code === "KeyP") popAt(0, 0);
    else if (e.code === "KeyR") reset();
    else if (e.code === "KeyE") {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([log.toJSON()], { type: "application/json" }));
      a.download = "events.json";
      a.click();
    }
  };
  const keyup = (e: KeyboardEvent) => { if (e.code === "Space") setBlow(false); };
  addEventListener("keydown", keydown);
  addEventListener("keyup", keyup);

  const governor = new QualityGovernor(3, (level) => {
    set.post.setBloom(level < 1);
    stage.renderer.setPixelRatio(level >= 2 ? 1 : Math.min(devicePixelRatio || 1, 2));
    stage.setSize(...size());
  });
  let lastDraw = -1;
  // a pop matters until its last droplet lands and its ripple fades; older pops are forgotten (long sessions stay fast)
  const keepPops = Math.max(spec.droplets.life[1], opts.water ? opts.water.ripples.life + 4 : 0) + 0.5;
  const loop = new LiveLoop({
    step: () => { world.advance(); world.forgetPops(keepPops); orbit.step(); },
    draw: () => {
      const t0 = performanceNow();
      set.setBodies(world.snapshot(), world.t, world.stepIndex);
      set.setDroplets(world.pops, world.t);
      stage.setPose(orbit.pose());
      stage.render();
      const t1 = performanceNow();
      if (lastDraw >= 0) governor.sample(t1 - t0);
      lastDraw = t1;
    },
  });
  const resize = () => stage.setSize(...size());
  addEventListener("resize", resize);
  loop.start();
  // read-only handle for automated QA (Playwright): the stage and the bubble set
  (globalThis as { __scene3d?: unknown }).__scene3d = { stage, set };

  return {
    dispose: () => {
      loop.dispose();
      offGestures();
      removeEventListener("keydown", keydown);
      removeEventListener("keyup", keyup);
      removeEventListener("resize", resize);
      set.dispose();
      stage.dispose();
    },
  };
};

/** Frame cost measurement for the quality governor only; it never feeds simulation time. */
const performanceNow = (): number => globalThis.performance.now();
