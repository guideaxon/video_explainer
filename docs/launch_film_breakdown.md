# launch-film.mp4: breakdown and how to reproduce it

Source: `docs/launch-film.mp4`, the Video Factory launch film (LordVayron/video-factory). Measured with ffprobe,
ffmpeg scene detection and a 2-second frame sheet. Audio content (voice or music) was not transcribed; the track is
continuous with no silence gaps and mean loudness -16.6 dB (peak -1.6 dB), so it is most likely a music bed.

## Specs

| | |
|---|---|
| Length / size | 33.5 s, 5.5 MB |
| Frame | 1280x720, 24 fps, H.264 + AAC 48 kHz |
| Look | Warm hand-painted storybook illustration (Ghibli-like): cream, terracotta, teal, soft light |
| Story | An idea becomes a finished video through a small "factory" run by a cartoon boy |
| End card | "Video Factory" title and a red "Get it on GitHub" button over the factory exterior |

## Shot list (approximate times)

| Time | Shot | What carries it |
|---|---|---|
| 0-6 s | Desk with a pinboard; a hand pins a lightbulb note, then slips it into a closed laptop, which opens | Idea enters the system. Hand with a red sleeve recurs as the "user" |
| 6-10 s | Laptop screen shows the factory; zoom out to the factory in a village square | Establishing shot, sets the metaphor |
| 10-14 s | Workshop interior: boy at a typewriter (script), boy pinning a 3x3 grid of faces (storyboard) | Script and storyboard stages |
| 14-16 s | A tall man with a camera or projector hands the boy a cassette | Hand-off to production |
| 16-20 s | The user's hand stamps at a wooden gate (approval gate); boy jumps through the opened gate with the cassette and a check mark | Approval gate before spend |
| 20-24 s | Cassette rides the conveyor out of the factory | Production run |
| 24-30 s | Wall of old TVs; two start black and fill in with a woman holding a product, a man, a cat, a moonlit lake | The deliverables: ads, characters, ambient video |
| 30-33.5 s | Factory exterior, button appears, then title | Call to action |

Eight beats, about 4 s each, one continuous visual metaphor, a recurring hand and a recurring character, and
almost no text until the last 4 seconds. Cuts are mostly soft (dissolves and camera moves), which is why only five
hard cuts register at a 0.15 scene threshold.

## What it is technically

Illustrated stills with limited animation, not rendered UI. The visible motion is:
hand and object moves (note slides, laptop lid opens), camera push-ins and pans on a flat painting, character poses that
change between stills (typing, pinning, jumping), gates opening, TV screens swapping from black to a clip, and a
button and title overlay. The first group are image-to-video or layered cutouts; the rest are ordinary compositing.

## Reproducing it here

Recommended: a new style bundle, `storybook` (illustrated storybook film, landscape 1280x720). It would not fit
Launch, whose style is flat playful UI with a mascot and phone mockups, and CLAUDE.md says not to mix style bundles.

1. **Style guide** `docs/storybook_video_style_guide.md`: palette (cream, terracotta, teal, sky blue), paper grain,
   one recurring cast (the boy, the helper, the red-sleeved hand), one recurring set (the factory), caption-free
   until the end card, 4 s per beat, dissolves not wipes.
2. **Reference sheet first** (`projects/<p>/plan/refs/`): front and three-quarter views of each character and the
   set. Every shot prompt cites it. This is what `continuity_qc.py --refs` checks against.
3. **Script and radio cut**: one-line narration or text per beat in `narration/narrations.json`, then
   `python scripts/radio_cut.py <p>` to lock the ~34 s timeline before generating any art.
4. **Stills**: about 17 locally generated paintings in ComfyUI (see `docs/ComfyUIBasedStoryGeneration.md` and
   `docs/TryComfyUIOptions.md` for the options already evaluated), same seed family and style prompt. Free, but slow
   on battery power.
5. **Motion** in Remotion (`remotion/src/components/storybook/`): `PaintedShot` (slow push-in or pan, 1.0 to 1.08
   scale, eased), `Dissolve`, `CutoutMove` (hand, note and cassette as transparent PNG layers on paths), `TvWall`
   (clips masked into TV screens), `EndCard` (title plus pill button). Use image-to-video only for the three
   shots that need real pose changes (laptop opening, boy jumping, stamping).
6. **Audio**: music bed from the existing MusicGen step, plus a few SFX cues (paper, stamp, gate, tape) from the SFX
   system; no narration is needed to match this film.
7. **QC**: `python scripts/continuity_qc.py --project <p> --refs projects/<p>/plan/refs`, read `qc/brief.md` and the
   contact sheet, fix, re-render, and only then deliver. The guard hook blocks sending the video before `qc.json` passes.

Effort estimate: style guide and kit components about a day; art generation and picking about another; the 8
scenes themselves are short because they are mostly `PaintedShot` plus overlays.

## Risks

- Character identity across 17 generated stills is the hard part; budget for rerolls and use the continuity QC brief.
- The film's own look is a third-party style; copy the structure and technique, not its characters or factory design.
- Image-to-video clips on this hardware are slow; keep them to three or fewer.
