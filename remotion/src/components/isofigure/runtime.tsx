/**
 * Isofigure runtime. A figure is a small pure model (state, act, tick, readout) plus a View that draws the state.
 * The runtime owns everything around it:
 *   - press handling: one `press(id)` for mouse, touch, keyboard and the buttons under the figure (the same path),
 *   - the animation clock (the model's `tick` runs every frame, so what you see is what the model says),
 *   - "Look inside" (eased 0..1), callout labels, the framed card with its live readout,
 *   - accessibility: real buttons mirroring the figure's controls, an aria-live announcer, reduced motion.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { H, W } from "./iso";
import { Callouts } from "./callout";
import type { CalloutItem } from "./callout";

export type Control = { id: string; label: string; keys: string[]; hint?: string };

export type FigureSpec<S> = {
  fig: string; // "Fig 1"
  name: string; // "Washing machine"
  title: string; // document title
  hint: string; // bottom-left caption
  caption?: string; // a true sentence under the card
  controls: Control[];
  init: () => S;
  act: (s: S, id: string) => S;
  tick: (s: S, dt: number) => S;
  readout: (s: S) => string;
  /** a short phrase for screen readers; announced when it changes */
  announce: (s: S) => string;
  View: React.FC;
  callouts: (s: S) => CalloutItem[];
};

type Ctx = { s: any; down: ReadonlySet<string>; inside: number; press: (id: string) => void; reduce: boolean };
const FigCtx = createContext<Ctx>({ s: null, down: new Set(), inside: 0, press: () => {}, reduce: false });
export const useFig = <S,>() => useContext(FigCtx) as Ctx & { s: S };

/** A pressable part: dips 3px when pressed, whatever input pressed it. Wrap the part's drawing in it. */
export const Press: React.FC<{ id: string; dip?: number; children: React.ReactNode }> = ({ id, dip = 3, children }) => {
  const { down } = useFig();
  return (
    <g data-press={id} style={{ cursor: "pointer", transform: down.has(id) ? `translateY(${dip}px)` : "none", transition: "transform 60ms ease-out" }}>
      {children}
    </g>
  );
};

const CSS = `
:root{color-scheme:light;--bg:#ebe6d8;--card:#f6f2e7;--edge:#d9d2c0;--ink:#2a2118;--mute:#7a7060;--btn:#fffaf0;--on:#b8730a}
@media (prefers-color-scheme: dark){:root{color-scheme:dark;--bg:#14110d;--card:#1d1913;--edge:#332d22;--ink:#ece6d6;--mute:#9a917e;--btn:#2a251c;--on:#ffc457}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg)}
body{color:var(--mute);font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:20px 16px}
main{max-width:900px;margin:0 auto;display:grid;gap:14px}
figure{margin:0;background:var(--card);border:1px solid var(--edge);border-radius:22px;padding:20px 24px;display:grid;gap:6px}
.cap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 18px;text-transform:uppercase;letter-spacing:.14em}
.cap .hi{color:var(--ink);text-transform:none;letter-spacing:.04em}
.stage{touch-action:manipulation;user-select:none;-webkit-user-select:none}
.stage svg{display:block;width:100%;height:auto}
.stage:focus-visible{outline:3px solid var(--on);outline-offset:4px;border-radius:10px}
.bar{display:flex;flex-wrap:wrap;gap:8px}
.bar button{font:inherit;color:var(--ink);background:var(--btn);border:1px solid var(--edge);border-radius:10px;padding:7px 12px;cursor:pointer}
.bar button kbd{font:inherit;color:var(--mute);margin-left:6px}
.bar button[aria-pressed="true"]{border-color:var(--on);color:var(--on)}
.bar button:focus-visible{outline:3px solid var(--on);outline-offset:2px}
.bar button:active{transform:translateY(1px)}
p{margin:0;max-width:70ch}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

const Figure = <S,>({ spec }: { spec: FigureSpec<S> }) => {
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const m = useRef({ s: spec.init(), inside: 0, insideTo: 0, labels: true, down: new Map<string, number>(), last: 0, said: "" });
  const [snap, setSnap] = useState({ s: m.current.s, inside: 0, down: new Set<string>() });
  const [insideOn, setInsideOn] = useState(false);
  const [labels, setLabels] = useState(true);
  const [said, setSaid] = useState("");
  const dirty = useRef(true);
  const held = useRef(new Set<string>()); // parts a pointer is currently holding down

  const dip = (id: string) => {
    m.current.down.set(id, performance.now() + 110); // visual dip lasts at least 110 ms, longer while the pointer is held
    dirty.current = true;
  };
  const press = (id: string) => {
    m.current.s = spec.act(m.current.s, id);
    dip(id);
  };
  const toggleInside = () => setInsideOn((v) => { m.current.insideTo = v ? 0 : 1; return !v; });
  const toggleLabels = () => setLabels((v) => !v);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const r = m.current;
      const dt = Math.min(0.1, (now - (r.last || now)) / 1000);
      r.last = now;
      const next = spec.tick(r.s, dt);
      if (next !== r.s) { r.s = next; dirty.current = true; }
      if (r.inside !== r.insideTo) {
        r.inside = Math.abs(r.insideTo - r.inside) < 0.004 || reduce ? r.insideTo : r.inside + (r.insideTo - r.inside) * Math.min(1, dt * 7);
        dirty.current = true;
      }
      for (const [id, until] of r.down) if (now > until && !held.current.has(id)) { r.down.delete(id); dirty.current = true; }
      if (dirty.current) {
        dirty.current = false;
        setSnap({ s: r.s, inside: r.inside, down: new Set(r.down.keys()) });
        const a = spec.announce(r.s);
        if (a !== r.said) { r.said = a; setSaid(a); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const keymap = new Map<string, string>();
    spec.controls.forEach((c) => c.keys.forEach((k) => keymap.set(k, c.id)));
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "BUTTON" && (e.key === " " || e.key === "Enter")) return; // a focused button handles its own Space/Enter
      const k = e.key.toLowerCase();
      if (k === "x") toggleInside();
      else if (k === "l") toggleLabels();
      else if (keymap.has(e.key === " " ? " " : k)) press(keymap.get(e.key === " " ? " " : k)!);
      else return;
      e.preventDefault();
    };
    const up = () => { held.current.clear(); };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, []);

  // The part dips on pointer-down, but the press only counts on click: a finger that starts scrolling the page, or a
  // right-click, must not operate the machine.
  const partOf = (e: React.SyntheticEvent) => (e.target as Element).closest?.("[data-press]") as SVGElement | null;
  const onPointerDown = (e: React.PointerEvent) => {
    const id = partOf(e)?.dataset.press;
    if (!id || (e.pointerType === "mouse" && e.button !== 0)) return;
    held.current.add(id);
    dip(id);
  };
  const onClick = (e: React.MouseEvent) => {
    const id = partOf(e)?.dataset.press;
    if (id) press(id);
  };

  const s = snap.s as S;
  return (
    <main>
      <style>{CSS}</style>
      <figure>
        <div className="cap"><span className="hi">{spec.fig}</span><span>{spec.name}</span></div>
        <div className="stage" tabIndex={0} onPointerDown={onPointerDown} onClick={onClick}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${spec.name}. ${spec.hint} ${spec.controls.map((c) => `${c.label}: ${c.keys[0] === " " ? "space" : c.keys[0]}`).join(", ")}. X looks inside, L toggles labels.`}>
            <defs>
              <filter id="iso-sh" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="9" /></filter>
            </defs>
            <FigCtx.Provider value={{ s, down: snap.down, inside: snap.inside, press, reduce }}>
              <spec.View />
              <Callouts items={spec.callouts(s)} inside={snap.inside} show={labels} />
            </FigCtx.Provider>
          </svg>
        </div>
        <div className="cap"><span>{spec.hint}</span><span className="hi" aria-hidden="true">{spec.readout(s)}</span></div>
      </figure>
      <div className="bar" role="toolbar" aria-label={`${spec.name} controls`}>
        {spec.controls.map((c) => (
          <button key={c.id} onClick={() => press(c.id)} title={c.hint}>{c.label}<kbd>{c.keys[0] === " " ? "space" : c.keys[0].toUpperCase()}</kbd></button>
        ))}
        <button aria-pressed={insideOn} onClick={toggleInside}>Look inside<kbd>X</kbd></button>
        <button aria-pressed={labels} onClick={toggleLabels}>Labels<kbd>L</kbd></button>
      </div>
      {spec.caption && <p>{spec.caption}</p>}
      <div className="sr" aria-live="polite">{said}</div>
    </main>
  );
};

/** Entry point used by every isofigure project's main.tsx. */
export const mountFigure = <S,>(spec: FigureSpec<S>) => {
  document.title = spec.title;
  createRoot(document.getElementById("root")!).render(<Figure spec={spec} />);
};
