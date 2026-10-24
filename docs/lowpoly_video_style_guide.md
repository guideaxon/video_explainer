# Lowpoly Style Bundle: Style Guide

Style for the **Lowpoly** style bundle: a landscape (1280x720 design space, rendered 1920x1080, 30 fps) explainer or story
told by one recurring flat-shaded low-poly 3D presenter sitting at a desk in a calm room. The presenter talks to camera, gestures,
and is lip-synced to the voiceover; captions sit in a pill at the bottom. Other style bundles have their own guide,
kit and skill; do not mix styles inside a project (to combine bundles in one film, see `docs/compose_story_guide.md`).

Implementation: kit `remotion/src/components/lowpoly/` (`kit.tsx` entry, `character.tsx` Presenter, `room.tsx` set),
templates `templates/lowpoly_video/scenes/`, scaffold `scripts/lowpoly_new_video.py`, finalize (pacing plus lip sync)
`scripts/lowpoly_finalize_storyboard.py`, skill `.claude/skills/lowpoly_make_video/`.

## 1. Look

- Everything is built from flat-shaded primitives (icosahedra, prisms, boxes) with `flatShading`, so facets show. No textures, no smooth gradients,
  no outlines. The look is built in code: same character, same room in every video, no model files, no AI image drift.
- Palette (muted, warm): wall sage `#a9ad93`, floor and desk warm brown `#b98f5c` / `#8a5a37`, skin `#e8a77f`, hair `#b4531f`,
  shirt charcoal `#4a4a4c`, accents clay `#b4531f` and sage `#6f8a6b`. Light is soft and frontal, one warm lamp pool on the wall, a bright window.
- One presenter, one room. Props (window, floor lamp, couch, shelf, wall panel) come from `room.tsx`; a new prop is added there, never in a scene.
- Text on screen: captions (narration phrases) and one end card. Nothing else unless a story needs a label; labels use the caption font.

## 2. Structure

Six beats of 4 to 7 s (30 to 45 s) by default: hello, problem, idea, steps, twist, finale. Adapt the arc to the story; keep the
presenter on screen in every beat. A beat is one `LowPolyShot`: a camera framing (`wide`, `medium`, `close`), one slow move
(`push-in`, `pull-out`, `hold`, `drift-left`, `drift-right`), a mood, a look direction and at most one gesture.
Cuts are 10-frame dissolves (set by the finalize script). Vary framing between neighbouring beats: never two identical framings in a row.

## 3. Presenter rules

- Moods: `smile` (default), `serious` (problem beats), `surprise` (reveals). Gestures (right arm only): `open`, `point`, `count`, `shrug`; `rest` otherwise.
  Start a gesture on a key word with `gestureAt` (frame), at most one per beat. Hands rest on the desk otherwise.
- `look="camera"` by default; `left`/`right` when he refers to something off to the side (a panel, a diagram); `down` to read or work.
- Mouth, blink, breathing, head sway and a small nod on each syllable peak are automatic. Never fake lip sync by hand: the mouth data is
  measured from the trimmed voiceover by `scripts/lowpoly_finalize_storyboard.py` (shared `scripts/_lipsync.py`) and written to
  `scenes/lipsync.ts`. Pass both `mouth={LIPSYNC.<scene>}` and `visemes={VISEMES.<scene>}`: with Rhubarb Lip Sync installed the
  mouth draws shapes (pressed lips for M/B/P, a narrow round O, teeth on the lip for F/V, a tongue for L); without it `VISEMES` is empty
  and the mouth only opens and closes. Blink timing comes from the shared rig (`remotion/src/components/rig/`); give a second presenter
  another `seed`.
- To share the frame with a panel or inset, move him with `presenterX` (about -0.8 to the left, 0.8 to the right) and put the content on the other side.

## 4. Copy rules

- Narration 6 to 16 words per beat, spoken by the presenter, plain and concrete, second person ("you"). No unsupported claims or numbers.
- Captions are the narration, shown in phrases of at most 7 words (automatic). Do not retype narration into scene files.
- End card: title (max 4 words) plus one pill button that is a real call to action.

## 5. Motion rules (kit)

- Camera pushes at most 0.28 m over a scene, eased; never faster. Fade in 8 frames at the start of each shot.
- Design space 1280x720; the kit scales to the render size. Safe zone for overlays: x 80 to 1200, y 60 to 640 (captions occupy y 640 to 690).
- Rendering is WebGL: Remotion renders it slower than 2D bundles (about 10 to 15 minutes for 30 s at 1080p on this laptop). Plug the laptop in.
  Use `--frames A-B` to render a few frames to check a change.

## 6. Registry keys

Registry keys in `scenes/index.ts` equal the slug of each scene title ("The Idea" gives `idea`), as in the other full-video
bundles. Component names end in `Scene`. `scenes/lipsync.ts` is generated: never hand-edit it.

## 7. Extending the look

- New outfit or hairstyle for another presenter: add props to `PresenterProps` and colours in `character.tsx`; keep the default unchanged so existing videos do not move.
- New room: a new component in `room.tsx` with the same colour rules; select it with a prop, do not fork the kit.
