# Papercut video style guide

Papercut films are drawn entirely in code (SVG in React) as layered paper cut-outs, scored with music
synthesised in the browser, and delivered as **one self-contained HTML file**. There are no images, fonts or audio
files. Open `projects/<p>/film.html` in any browser; no server, no internet.

Format: landscape 1280x720, 30 fps, scenes of 6 s (default), crossfaded. Style bundle id: `papercut`.

## 1. The look

- Everything is a flat-colour **facet** (`Cut`): a polygon with a thin pale cut edge. Light faces are lighter, shaded
  faces darker. Do not use gradients for objects; gradients are only for skies, glows and aurora.
- Depth comes from **layers** (`L`): back to front, each layer gets a soft drop shadow of its silhouette and
  parallaxes with the camera (`d` 0.03 sky, 0.1 far hills, 0.6 mid, 1.2 foreground).
- A grain + fibre + vignette overlay (`PaperOverlay`) is drawn once over the whole frame.
- **Edge weight follows part size** (`Cut` does this itself): petals and ears get a hairline cut edge, rocks and cliffs a
  heavier one. Do not pass a fixed stroke width.
- **Isometric blocks** (`IsoBox`, `IsoStairs`) shade their three visible faces from one light direction (top lightest, left
  face next, right face darkest). Use them for stacked-card dioramas (steps, pillars, platforms), drawn back to front
  (smaller x+y first, lower z first). `iso().plane()` lays flat shapes such as a ring or text onto an isometric plane.
- One recurring character (the fox) and one recurring motif (the guiding four-point star) tie the scenes together.
- Palettes per mood: dusk (lavender to peach), night (navy, cream moon), cave (deep blue, gold, ice blue), storm
  (slate), aurora (green and teal over navy), sunrise (gold). Keep foreground flowers saturated.

## 2. Kit (`remotion/src/components/papercut/`)

| File | What it gives you |
|---|---|
| `paper.tsx` | `Cut`, `L` (layer), `Defs`, `PaperOverlay`, `GuideStar`, `Fireflies`, `Rain`, `Snowfall`, `rng`, colour helpers |
| `world.tsx` | `Sky`, `Stars`, `Moon`, `Sun`, `Clouds`, `Mountains`, `Hills`, `Firs`, `BigTrunk`, `Rock`, `Ledge`, `Water`, `Waterfall`, `Waves`, `Glitter`, `Flower`, `Fern`, `Mushroom`, `Leaf`, `Berries`, `Icicles`, `Crystal`, `Aurora`, `StonePortal`, `Bridge` |
| `iso.tsx` | `iso()` projection, `IsoBox` (three faces shaded from one light), `IsoStairs`, `IsoGate` (the star-gate diorama) |
| `callout.tsx` | `Callouts`: labelled paper pills with leader lines |
| `ui.ts` | interaction state (`useUi`, `pokeAge`, `pokeKick`) shared by the player and kit parts |
| `fox.tsx` | `Fox` (walk speed, head angle, tail, ear twitch) |
| `film.tsx` | `Film` type and `FilmSvg` (scenes, crossfades, slow push-in) |
| `music.ts` | `buildScore` (progression to events) and `Music` (Web Audio synth) |
| `player.tsx` | `mountPlayer(film)`: play/pause, scrubber, sound on/off, clock |

Project files import the kit through the `@papercut/...` alias (resolved by `scripts/papercut_build_html.mjs`). A
project may only use the papercut kit (guard hook rule 3).

## 3. Interaction (all of it is optional for a scene)

The player makes every film playable, and the kit parts react without any scene code:

- **Click or press S, F, N** on the guiding star (flare and chime), the fox (hop, tail wag, ears and plucked notes) or a
  flower (sway and its own pentatonic note). Key S is the star, F the fox, N a random flower.
- **Look inside** (button or X): scenes can read `useUi().xray` (0..1, eased) to fade a surface and show what is under it.
  `IsoGate` shows its glowing rune cores and ring lens; scene 6 turns its ledge see-through to reveal a hidden geode.
- **Callouts** (`<Callouts t={t} items={[{ label, x, y, t0?, t1?, xray? }]} />`): pills sit in two columns at the frame
  edges, ordered by target height so leaders do not cross; items fade in by scene time; `xray: true` items only appear
  during Look inside. Name the things a scene shows, in 1 to 3 words.
- **Music pulse:** the guiding star swells and the fireflies brighten with the live loudness (`useUi().level`).
- **Accessibility:** the film has `role="img"` and an `aria-label` that names the current scene (pass `sceneNames` to
  `mountPlayer`) and the controls; controls have visible focus; Space, arrow keys (seek 5 s), M, X, S, F, N all work; the
  scene name is announced politely; the player bar has a light and dark theme; with `prefers-reduced-motion` the film
  starts paused and the camera push is off.

## 4. A project

```
projects/<p>/config.json   style_bundle: "papercut"
projects/<p>/scenes.tsx    the scenes (SCENES array of components taking { t, p, cam })
projects/<p>/score.ts      the music (chord progression per scene via buildScore)
projects/<p>/main.tsx      mountPlayer({ title, scenes, events, sceneNames })
projects/<p>/film.html     the built film (generated)
```

A scene is a React component. `t` is seconds since the scene started, `p` is 0..1 progress and `cam` is the -1..1 camera
position for parallax. Compose back to front; animate only from `t` or `p` (no state, no randomness except `rng(seed)`).
The registry order is the film order; 10 scenes x 6 s = 60 s.

## 5. Music

Keep scene length and bars in step: a scene is `sceneSeconds` long (default 6), so give each scene two 3 s bars
(change `sceneSeconds` in `mountPlayer` if you use another count). `buildScore` takes, per scene, a list of bars `[root MIDI note, intervals]` (3 s per bar), a pluck density and a bell
density, and builds seeded events: pads, bass, plucked arpeggio, bells, and a guiding-star chime at each scene start.
Extras: `drums` (timpani under a scene), `extras` (`rain`, `thunder`, any event at an exact second) and `finale`
(closing chimes). Pick progressions by mood (major for dawn and wonder, minor for night and cave, a dominant 7th for
tension, ending on the tonic). The score is fixed, so it always matches the picture; the player re-syncs after seeks
and loops. Browsers only start audio after a click, so the player shows "Click anywhere to start the music".

## 6. Worked example: `papercut_fox`

`projects/papercut_fox` is the template unchanged: a 60 s film of a fox following a guiding star, made from a
reference clip (`docs/-HEnk6mAuVbFU7Wf.mp4`, ten painted-paper scenes). How it was made:

1. **Read the reference.** Sample one frame every 5 s into a contact sheet and write the shot list: dusk meadow and
   bridge, night river, firefly forest, waterfall cliffs, snowy summit, crystal cave, storm at sea, aurora ridge,
   star gate, sunrise. The fox stays in the left half; the star is always visible.
2. **Build parts, not pictures.** Every recurring object became a parametrised component in the kit (a mountain range
   with snow caps, a row of firs, a waterfall with moving stripes, a fox).
3. **Compose each scene** in `scenes.tsx` as a stack of layers, back to front. Scene 3, for example: `Sky`, two `Firs`
   rows, `Water`, `Waterfall`, `Rock`s, a `Ledge` with the `Fox`, then `BigTrunk`s, `Fern`s, `Mushroom`s and flowers in
   front, the `GuideStar`, and `Fireflies` on top.
4. **Write the score** in `score.ts`: two bars per scene (C-G dusk, Am-F night, Dm-Am forest ... G-C sunrise), timpani,
   rain, and a thunder hit at 38.4 s that lines up with the lightning flash in scene 7.
5. **Build:**

```
python scripts/papercut_new_video.py papercut_fox     # scaffold from templates/papercut_video/
python scripts/papercut_build_html.py papercut_fox    # writes projects/papercut_fox/film.html (about 185 KB)
```

6. **Add the interactive parts.** Scene 9 uses `IsoGate` (isometric blocks, Look inside); scenes 3, 6 and 9 carry
   `Callouts`; every scene gets the star, fox and flower reactions for free.
7. **Check.** Screenshot frames (open `film.html#f=450` for frame 450, paused) and render the score offline to confirm
   it is audible, never clips and fades out (peak about 0.6, about -25 dB RMS, louder in the storm).

To make a new film: scaffold a project, replace the scenes and the progressions, rebuild.
