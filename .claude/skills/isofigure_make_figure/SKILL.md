---
name: isofigure_make_figure
description: Produce an interactive isometric figure of a working object (a washing machine, desk lamp, lock, synth) for the Isofigure style bundle: paper-card solids, buttons you press by mouse, touch or keyboard, a live readout, callout labels and a Look inside view, delivered as one self-contained HTML file. Use when asked to explain how something works as a playable figure, or to make or restyle an Isofigure.
---

# Isofigure: make a figure

Read `docs/isofigure_style_guide.md` first (the one idea, the kit, how pressing works, and the worked washing machine).

1. **Pick an object whose working is the point** and say in one sentence what each control does. If nothing can be pressed,
   pick a different object. Offer 2 or 3 candidates; the user decides.
2. **Scaffold:** `python scripts/isofigure_new_figure.py <p>` (copies `templates/isofigure_figure/`; the template is the washer).
   For a character whose actions are the buttons (wave, blink, talk, a light), use `--template robot`
   (`templates/isofigure_robot/`, style guide section 6): no voiceover; optional in-page sound effects with a mute control.
3. **Truth first, in `model.ts`:** real numbers and rules as a pure state machine (`init`, `act`, `tick`, `readout`,
   `announce`). Refusals set a message that says why. Write it and test it before drawing.
4. **Controls in `main.tsx`:** `{ id, label, keys }` for every pressable part. The same `press(id)` serves clicks, keys and the
   buttons under the figure.
5. **Draw in `figure.tsx`:** fit all eight corners of the main body with `fitIso`; draw the working parts first, back to
   front, then the body at opacity `1 - 0.9 * inside`, then flat detail with `OnFront` / `OnSide`. Wrap each pressable part in
   `<Press id>` with a transparent hit shape. Add `callouts(state)`; mark parts that are only visible inside with `inside: true`.
6. **Build:** `python scripts/isofigure_build_html.py <p>` writes `projects/<p>/figure.html`.
7. **Check like a critic:** press every control by pointer and by key, trigger each refusal, screenshot idle, mid-action, the
   end state and Look inside, and zoom into joints and the display. Check nothing is cropped and that nearer parts cover farther
   ones. Import only the isofigure kit (a character may also use the shared rig contract through `@rig`).

This bundle has no narration, voiceover or MP4 render (short synthesised sound effects are optional, as in the robot): the HTML file is the deliverable. It does not use `video_make_core`.

**As a video chapter** (for a composed story, `compose_make_story`): write `projects/<p>/tour.json` (narrated steps with timed key presses or clicks; format in the docstring of
`scripts/isofigure_capture_video.py`), then `python scripts/isofigure_capture_video.py <p>` records `output/final.mp4` with a voice. Check frames idle, inside and mid-action.
