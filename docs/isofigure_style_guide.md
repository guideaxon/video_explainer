# Isofigure style guide

An isofigure explains how a thing works by building it as an interactive isometric object: paper-card solids on a warm
page, parts you press, a live readout, labelled callouts and a "look inside" view. It is delivered as **one
self-contained HTML file** (`projects/<p>/figure.html`): no images, fonts, libraries or network. It is not a video; there
is no timeline, narration or render. Style bundle id: `isofigure`. Card: 760x560 viewBox.

## 1. The one idea

**The object must do something real.** Pressing a part changes a model; the drawing, the display, the readout, the door
lock and the callouts all read that one model, so nothing the figure shows can disagree with how the thing works. If an
object has nothing to press, choose a different object. Decide what pressing each part produces before drawing anything.

## 2. Look

- Flat-colour solids shaded from one light: top lightest, the left ("front") face next, the right ("side") face darkest
  (`Box`, `faceTone`). Dark ink outline whose width follows the part's size (hairline for knobs, heavier for the body).
- Warm paper page (`#ebe6d8` light, `#14110d` dark) and a card; parts in warm whites, chrome greys and a few saturated
  accents (red power, green start, teal water). One colour is lit to mean "live".
- Flat detail (panels, text, dials, doors) is drawn in ordinary 2D on an isometric plane: `OnFront`, `OnSide`
  (`iso().front/side/top` give the matrix), so rings, rounded corners and text sit in correct perspective.
- Round parts with their axis towards the viewer are stacks of discs (`DiscStack`); springs are projected helices (`Coil`).
- Words stay out of the drawing except a display, tiny engraved labels and the callout pills.
- Frame: `Fig n` top-left, object name top-right, hint bottom-left, live readout bottom-right (lowercase, dot-separated).

## 3. Kit (`remotion/src/components/isofigure/`)

| File | What it gives you |
|---|---|
| `iso.tsx` | `makeIso` / `fitIso` projection, `Box`, `Face`, `OnFront`, `OnSide`, `DiscStack`, `Coil`, `Rod`, `faceTone`, `mix` |
| `runtime.tsx` | `mountFigure(spec)`, `Press`, `useFig`: press handling, animation clock, look inside, labels, card, accessibility |
| `callout.tsx` | `layoutPills` and `Callouts`: pills in two columns, leaders that do not cross, `inside` items |

A project may only use the isofigure kit (guard hook rule 3). Import it through the `@isofigure/...` alias. The one
exception is the shared character rig contract (`remotion/src/components/rig/`, pure timing, no drawing) through the
`@rig` alias, which a character figure may use for its blink rhythm and syllable mouth (section 6).

## 4. A project

```
projects/<p>/config.json   style_bundle: "isofigure"
projects/<p>/model.ts      the truth: a pure state machine (no imports, no DOM): init, act, tick, readout, announce
projects/<p>/figure.tsx    the drawing (a View reading useFig<State>()) and the callout positions
projects/<p>/main.tsx      mountFigure({ fig, name, hint, controls, init, act, tick, readout, announce, View, callouts })
projects/<p>/figure.html   the built figure (generated)
```

### How the user operates it (one path for every input)

Every control is `{ id, label, keys }`. Mouse, touch, keyboard and the buttons under the figure all call the same
`press(id)`, which calls `model.act(state, id)`; the runtime's clock calls `model.tick(state, dt)` every frame.

- **In the figure:** wrap a part's drawing in `<Press id="start">…</Press>`. It dips 3 px when the pointer goes down (at least 110 ms,
  longer while held), but the press counts on click, so scrolling with a finger or right-clicking never operates the device. Put a transparent shape inside so the whole part is a hit target.
- **Keys:** `keys: ["s", " "]`. X toggles Look inside, L toggles labels.
- **Buttons under the figure:** one real `<button>` per control (with its key shown), so the figure works for keyboard,
  screen-reader and touch users without hunting for small targets.
- **Refusals say why:** a press that does nothing (door pressed mid-cycle) sets `msg` and the readout shows it for 2.5 s.
- **`tick` returns the same object when nothing changes**, so an idle figure costs no redraws.

### Look inside and callouts

`useFig().inside` is 0..1 (eased; instant under reduced motion). Draw the working parts first, back to front, then the
cabinet at opacity `1 - 0.9 * inside`. Callouts are `{ label, x, y, inside? }` in view units; `inside: true` items only
show during Look inside. Name things in one to three words; pills are ordered by height so leaders do not cross.

### Accessibility

The SVG has `role="img"` and a label that lists the controls and keys; focus is visible; a polite live region announces
`announce(state)` when it changes (phase changes and refusals, not every readout tick); the theme follows the system; under
`prefers-reduced-motion` the inside view switches instantly.

## 5. Worked example: `projects/isofigure_washer`

A front-loading washing machine (the template, unchanged). How it was made:

1. **Truth first (`model.ts`).** Four programs (cotton 40° = fill 4, wash 45, rinse 25, spin 12 min at 1200 rpm, and three
   more). State: power, program, phase, elapsed, paused, water level, door, drum angle and rpm, knob angle, message.
   Rules: start needs power and a closed door; the door stays locked while a cycle runs (even paused) and while water is in
   the drum; the program cannot change mid-cycle; water fills, holds, drains and refills for rinse, then drains for spin;
   the drum reverses at 45 rpm while washing and spins up to the program's rpm; power-off cancels and the pump empties the
   drum. Time is a 10 min/s time-lapse.
2. **Controls.** Power (P), Program knob (N), Start / pause (S or Space), Door (D). Each is a `<Press>` in the figure, a
   key and a button below the figure.
3. **Parts.** Cabinet box; front panel (display, phase pips, knob with four detents, power and start buttons); the door
   as an annulus over the drum opening so the glass is a real window (clothes, water and the open door's dark mouth); and,
   hidden until Look inside, the tub and drum (disc stacks), two coil springs, dampers, motor with belt, pump with hose,
   and the water level in the tub.
4. **Callouts:** Display, Program knob, Start / pause, Door (shows "locked"); inside: Drum, Tub, Springs, Motor + belt,
   Drain pump, Water level.
5. **Build and check:**

```
python scripts/isofigure_new_figure.py isofigure_washer   # scaffold from templates/isofigure_figure/
python scripts/isofigure_build_html.py isofigure_washer   # writes projects/isofigure_washer/figure.html (about 160 KB)
```

6. **Verify.** Press every control by key and by pointer; try the refusals (door mid-cycle, start with the door open);
   screenshot idle, mid-wash, spin, door open and Look inside; check no clipping at 1280 and at phone width; run the
   model tests (`remotion/src/components/isofigure/isofigure.test.ts`).

To make a new figure: scaffold, replace the model first, then the drawing, then the controls and callouts.

## 6. A character figure: `templates/isofigure_robot`

`python scripts/isofigure_new_figure.py <p> --template robot` starts from a small toy robot instead of the washer. A
character has no machine cycle to explain, so its **actions are the controls**: Wave (W: the shoulder servo raises the
arm, the forearm waves three times, the arm lowers; 2.5 s), Blink (B), Talk (T: the mouth LEDs and chest speaker run a
syllable rhythm for 2.5 s) and Antenna light (A, a toggle; the light glows and pulses). The arm, the face screen, the
mouth, the chest grille and the antenna ball are `<Press>` parts too. A second press of a running action is refused in
the readout ("already waving"). Look inside shows what makes each action happen: battery, circuit board, shoulder servo,
speaker and the wiring up the neck to the antenna.

- **No voiceover.** "Talk" is a picture of talking (lights and, optionally, babble blips), not speech: a figure has no
  script, and a voice would make it a video. If it must speak, record it as a chapter with a narrated `tour.json`.
- **Alive when idle.** It blinks on its own (`blinkAt` from the rig contract), so `tick` always advances a clock and the
  figure redraws every frame; that is the price of a character, and it is cheap at this size.
- **Arms are rotated boxes.** `Limb` in `figure.tsx` turns a box about the shoulder axis and shades each face from its
  rotated normal with `faceTone`, so a moving limb stays solid at every angle.
- **Sound is optional** and synthesised in the page (Web Audio blips, no files). It only starts after a press (a user
  gesture), idle blinks are silent, and Sound (M) mutes it, including sounds already scheduled.
- **Reduced motion:** no idle blink, no antenna pulse, the wave holds the raised arm without swinging, the mouth shows a
  steady bar pattern.

Model tests: `remotion/src/components/isofigure/robot.test.ts`.

## 7. Where the ideas come from

The projection and press patterns follow MrBongoC/ai-iso-skill (flat shapes on isometric planes, one `render`, class toggles
for pressed parts); the model-first workflow, parts list and "verify like a critic" follow wheresryan22/anatomy; the warm
coloured finish and callouts follow the Colorfigures demo. Ideas only: both repositories are MIT licensed and no code is copied.
