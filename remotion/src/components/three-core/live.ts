/**
 * Live mode (HTML deliverable): a fixed-step loop, pointer gestures, an orbit camera and the input event log.
 *
 * The browser frame clock only decides how many fixed steps to run; simulation time is always stepIndex * STEP, so a
 * session replays exactly from its event log (docs/scene3d_design.md section 4). Rendering pauses while the page is
 * hidden. No styles here: the bundle draws its own hint, buttons and messages.
 */

import { STEP } from "./time";
import type { SimEvent, Vec3 } from "./sim";
import type { Pose } from "./camera";

export class LiveLoop {
  private raf = 0;
  private last = -1;
  private acc = 0;
  private running = false;
  private onVisibility = () => (document.hidden ? this.stop() : this.start());

  /** step(): one fixed simulation step. draw(): render the current state. maxSteps caps catch-up after a stall. */
  constructor(private readonly o: { step: () => void; draw: () => void; maxSteps?: number }) {
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  start(): void {
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = -1;
    const tick = (now: number) => {
      if (!this.running) return;
      if (this.last >= 0) this.acc += Math.min(0.25, (now - this.last) / 1000);
      this.last = now;
      let n = 0;
      while (this.acc >= STEP && n < (this.o.maxSteps ?? 8)) { this.o.step(); this.acc -= STEP; n++; }
      if (n === (this.o.maxSteps ?? 8)) this.acc = 0; // too slow to catch up: drop time rather than spiral
      this.o.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.stop();
    document.removeEventListener("visibilitychange", this.onVisibility);
  }
}

/** The events a person caused, with simulation times, so a session can be baked into a film. */
export class EventLog {
  readonly events: SimEvent[] = [];
  push(e: SimEvent): SimEvent { this.events.push(e); return e; }
  clear(): void { this.events.length = 0; }
  toJSON(): string { return JSON.stringify({ version: 1, events: this.events }, null, 1); }
}

/** Orbit camera: yaw, pitch and distance around a target, eased toward the goal with fixed steps. */
export class Orbit {
  yaw: number; pitch: number; dist: number;
  private goal: { yaw: number; pitch: number; dist: number };
  constructor(readonly target: Vec3, yaw: number, pitch: number, dist: number, readonly limits = { pitch: [-0.2, 1.1] as [number, number], dist: [1.2, 8] as [number, number] }, public fov = 40) {
    this.yaw = yaw; this.pitch = pitch; this.dist = dist;
    this.goal = { yaw, pitch, dist };
  }
  rotate(dYaw: number, dPitch: number): void {
    this.goal.yaw += dYaw;
    this.goal.pitch = Math.min(this.limits.pitch[1], Math.max(this.limits.pitch[0], this.goal.pitch + dPitch));
  }
  zoom(factor: number): void {
    this.goal.dist = Math.min(this.limits.dist[1], Math.max(this.limits.dist[0], this.goal.dist * factor));
  }
  set(yaw: number, pitch: number, dist: number, snap = false): void {
    this.goal = { yaw, pitch, dist };
    if (snap) { this.yaw = yaw; this.pitch = pitch; this.dist = dist; }
  }
  /** One fixed step of easing (call from the loop's step). */
  step(): void {
    const k = 1 - Math.exp(-STEP * 8);
    this.yaw += (this.goal.yaw - this.yaw) * k;
    this.pitch += (this.goal.pitch - this.pitch) * k;
    this.dist += (this.goal.dist - this.dist) * k;
  }
  pose(): Pose {
    const c = Math.cos(this.pitch);
    return { pos: [this.target[0] + this.dist * c * Math.sin(this.yaw), this.target[1] + this.dist * Math.sin(this.pitch), this.target[2] + this.dist * c * Math.cos(this.yaw)], target: [...this.target], fov: this.fov };
  }
}

export type Gestures = {
  /** A quick press and release without much movement. ndc: -1..1. */
  onTap?: (ndcX: number, ndcY: number) => void;
  /** One-finger or mouse drag, in pixels since the last move. */
  onDrag?: (dx: number, dy: number, ndcX: number, ndcY: number) => void;
  onDragEnd?: () => void;
  /** Wheel or pinch: < 1 zooms in. */
  onZoom?: (factor: number) => void;
};

/** Pointer, touch and wheel gestures on an element. Returns a function that detaches them. */
export const attachGestures = (el: HTMLElement, g: Gestures): (() => void) => {
  const pts = new Map<number, { x: number; y: number; x0: number; y0: number; t0: number }>();
  let pinch = 0;
  let dragging = false;
  const ndc = (x: number, y: number): [number, number] => {
    const r = el.getBoundingClientRect();
    return [((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1)];
  };
  const spread = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const down = (e: PointerEvent) => {
    el.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: e.timeStamp });
    if (pts.size === 2) pinch = spread();
  };
  const move = (e: PointerEvent) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2) {
      const s = spread();
      if (pinch > 0 && s > 0) g.onZoom?.(pinch / s);
      pinch = s;
      return;
    }
    if (Math.hypot(p.x - p.x0, p.y - p.y0) > 6) dragging = true;
    if (dragging) g.onDrag?.(dx, dy, ...ndc(e.clientX, e.clientY));
  };
  const up = (e: PointerEvent) => {
    const p = pts.get(e.pointerId);
    pts.delete(e.pointerId);
    if (!p) return;
    if (!dragging && pts.size === 0 && e.timeStamp - p.t0 < 350) g.onTap?.(...ndc(e.clientX, e.clientY));
    if (pts.size === 0) { if (dragging) g.onDragEnd?.(); dragging = false; pinch = 0; }
  };
  const wheel = (e: WheelEvent) => { e.preventDefault(); g.onZoom?.(Math.exp(e.deltaY * 0.001)); };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener("wheel", wheel, { passive: false });
  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    el.removeEventListener("wheel", wheel);
  };
};

/** Frame-time governor (docs/scene3d_design.md A2): steps quality down when frames run long, up when they recover. */
export class QualityGovernor {
  level = 0;
  private slow = 0;
  private fast = 0;
  constructor(private readonly levels: number, private readonly onChange: (level: number) => void, private readonly budgetMs = 20) {}
  /** Feed the measured duration of one drawn frame. */
  sample(ms: number): void {
    if (ms > this.budgetMs * 1.3) { this.slow++; this.fast = 0; } else if (ms < this.budgetMs * 0.6) { this.fast++; this.slow = 0; } else { this.slow = this.fast = 0; }
    if (this.slow > 45 && this.level < this.levels - 1) { this.level++; this.slow = 0; this.onChange(this.level); }
    if (this.fast > 240 && this.level > 0) { this.level--; this.fast = 0; this.onChange(this.level); }
  }
}
