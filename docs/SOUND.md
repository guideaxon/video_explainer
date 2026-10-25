# Sound Design

The sound design system provides frame-accurate SFX, AI-generated background music, and audio mixing capabilities.

## Overview

Sound design enhances videos with:
- **SFX (Sound Effects)** - Subtle sounds synced to animations
- **Background Music** - AI-generated ambient music via MusicGen
- **Audio Mixing** - Combining voiceover, SFX, and music

## Quick Start

```bash
# Generate SFX library
python -m src.cli sound <project> library --generate

# Analyze scenes for sound moments
python -m src.cli sound <project> analyze

# Generate SFX cues automatically
python -m src.cli sound <project> generate

# Generate background music
python -m src.cli music <project> generate
```

---

## SFX System

### Sound Library

The system includes 18 professionally-designed sounds:

#### Core Sounds

| Sound | Description | Use Case |
|-------|-------------|----------|
| `ui_pop` | Soft digital pop | Elements appearing |
| `text_tick` | Light keyboard click | Text appearing |
| `lock_click` | Crisp mechanical click | Things locking into place |
| `data_flow` | Subtle digital stream | Data movement |
| `counter_sweep` | Rising electronic sweep | Number counters |
| `reveal_hit` | Punchy impact | Big reveals (87x faster, etc) |
| `warning_tone` | Low rumble | Problem states |
| `success_tone` | Positive chime | Solutions and success |
| `transition_whoosh` | Smooth sweep | Phase transitions |
| `cache_click` | Solid digital click | Cache/memory operations |

#### Extended Sounds (New)

| Sound | Description | Use Case |
|-------|-------------|----------|
| `keyboard_type` | Single keystroke click | Typing animations |
| `keyboard_rapid` | Burst of 3-5 keys | Fast typing sequences |
| `bar_grow` | Rising sweep tone | Bar chart growth |
| `progress_tick` | Digital increment | Progress bars |
| `digital_stream` | Flowing data sound | Token streaming |
| `impact_soft` | Soft thump | Subtle reveals |
| `impact_hard` | Punchy hit | Dramatic reveals |
| `footstep` | Soft low thump with a little scuff | A rigged character's footfall (see below) |

```bash
# List available sounds
python -m src.cli sound <project> library --list

# Generate all sound files to project's sfx/ directory
python -m src.cli sound <project> library --generate
```

### Automatic SFX Generation

The system can automatically analyze scene code and generate SFX cues:

```bash
# Preview what would be detected (dry run)
python -m src.cli sound <project> analyze
python -m src.cli sound <project> analyze --verbose  # Show detailed moments

# Generate cues and write to storyboard.json
python -m src.cli sound <project> generate
python -m src.cli sound <project> generate --dry-run  # Preview without writing

# Clear all SFX cues
python -m src.cli sound <project> clear
```

### Detection Patterns

The system uses **TypeScript AST analysis** to accurately detect animations, even with dynamic expressions:

```tsx
// These expressions ARE properly evaluated:
const phase1End = Math.round(durationInFrames * 0.10);  // Evaluates to ~50 frames
const phase2End = Math.round(durationInFrames * 0.40);  // Evaluates to ~200 frames
const slowSpeed = interpolate(localFrame, [phase2Start, phase2End], [0, 40]);
```

#### Detected Animation Patterns

| Pattern | Sound Type | Detection Method |
|---------|------------|------------------|
| Opacity fade in | `element_appear` | `interpolate(frame, [X,Y], [0,1])` with opacity in variable name |
| Opacity fade out | `element_disappear` | `interpolate(frame, [X,Y], [1,0])` with opacity in variable name |
| Spring animations | `reveal` | `spring({frame: X, ...})` |
| Counter animations | `counter` | `Math.round(interpolate(...))` or variables with "counter/count/speed" |
| Bar/chart growth | `chart_grow` | Variables with "bar/width/chart" in name |
| Phase transitions | `transition` | Phase constant detection via symbol table |

#### Semantic Sound Mapping

The system intelligently selects sounds based on context:

| Context Pattern | Mapped Sound |
|-----------------|--------------|
| `prompt` + opacity | `keyboard_type` |
| `code` + opacity | `keyboard_type` |
| `token` + opacity | `text_tick` |
| `speed/counter` + counter | `counter_sweep` |
| `bar/chart` + width | `bar_grow` |
| `progress` + width | `progress_tick` |
| `reveal/badge` + scale | `reveal_hit` |
| `stream/flow` + opacity | `data_flow` |

### SFX Cue Format

SFX cues are stored in `storyboard.json`:

```json
{
  "scenes": [
    {
      "id": "scene1_hook",
      "sfx_cues": [
        {"sound": "ui_pop", "frame": 15, "volume": 0.08},
        {"sound": "reveal_hit", "frame": 90, "volume": 0.12}
      ]
    }
  ]
}
```

### Volume Guidelines

| Sound Type | Recommended Volume |
|------------|-------------------|
| Text/typing (repeated) | 0.05 |
| UI elements | 0.08 |
| Transitions | 0.08-0.10 |
| Counters | 0.10 |
| Warnings/success | 0.10 |
| Reveals | 0.12-0.15 |

**Rules:**
- Never exceed 0.15 for any sound
- Use lower volumes for repeated sounds in quick succession
- Space repeated sounds at least 15-20 frames apart

---

## Earshot (optional engine)

[Earshot](https://github.com/Leonxlnx/earshot) (MIT) renders effects from a bank of 201 code-defined
recipes. It is an **opt-in** engine for the SFX *files*; the analyzer and cue generator still decide what
sound goes where, and Remotion still plays `sfx/<name>.wav`. Built-in numpy sounds stay the default.

```bash
pip install -e ".[earshot]"        # about 1.2 GB (PyTorch CPU). Not the PyPI package named "earshot".
python -m src.cli sound <project> build --engine earshot
```

- **Why:** Earshot's own `sfx check` found defects in some built-in sounds (clicks at the start or end,
  cut tails, a rising "synth whip" pitch). Its bank sounds pass those checks. Whether they sound better
  is a listening call: audition them in the UI's Sound step.
- **How it runs:** as a subprocess (`src/sound/earshot_backend.py`), so torch is never imported by the
  pipeline. Found via `EARSHOT_BIN`, the `earshot` executable beside the Python in use, or `PATH`.
- **Output:** 16-bit, 48 kHz WAV (Remotion's mix rate), peak -3 dB like the built-ins, so the cue volumes
  in this document still apply. All bank picks are under 2 s, so no cue is clipped at the player's
  60-frame default.
- **Fallback:** a sound Earshot cannot render (missing, timed out twice, ffmpeg error) is generated by the
  built-in engine instead. The reason is in `sfx/manifest.json` and shown in the UI.
- **Palettes are a starting point.** A style bundle picks its palette (`vantage`, `markets`, `promo`,
  `launch`, `lyric`, `leaderbot`, `demo`; `default` otherwise). Choose another with `--palette` or
  Project Settings, and swap single sounds in `config.json`:

  ```json
  { "sound": { "palette": "promo", "overrides": { "ui_pop": "pro_pop/boop", "reveal_hit": "pro_impact/deep" } } }
  ```

  Bank ids come from `earshot sfx list`. Palette picks were chosen by sound kind and checked with
  Earshot's critic, not by ear.

### Cues for style bundle scenes

Style bundle scenes compose kit components (`<Title delay={4}>`, `<LineChart from={8}>`) and contain no
`interpolate` or `spring` calls, so the AST analyzer finds nothing in them. `src/sound/kit_analyzer.py`
reads each recognised kit component's start frame (the literal `from`/`delay` prop, else the kit's default)
and maps it to a moment type (text, chart, counter, reveal, element). It marks when an element *starts*,
not how it eases, and ignores components it does not recognise. Scenes are found through
`scenes/index.ts`, so a scene file may be named freely (`bull_run` is `title.tsx`). The Demo bundle
(one `DemoScene` component driven by `manifest.json`) is not covered.

### Character cues from the rig

Characters built on the shared rig contract (`remotion/src/components/rig/index.ts`, design in
[CHARACTER_RIG.md](CHARACTER_RIG.md)) get sound cues from their props. `src/sound/rig_analyzer.py` reads them from every scene file on top of the other analyzers
(not only when those find nothing):

| Prop in the scene | Cue |
|---|---|
| `gestureAt={45}` | one `gesture` moment at frame 45, played as `ui_pop` (volume about 0.05) |
| `walk={{ from: 10, to: 100, cadence: 2 }}` | one `footstep` moment per footfall, played as `footstep` (volume about 0.033) |

Footfalls are the frames `walkSteps(walk, fps)` returns: `round(from + i * fps / cadence)` for
`i = 1, 2, ...` while that is before `to`; `cadence` is footsteps per second (default 2). At 30 fps
`{ from: 10, to: 100 }` steps on 25, 40, 55, 70, 85. The fps is the project's `video.fps` from `config.json`
(default 30), so 24 and 12 fps films get footsteps on their own frames.

- **Literals only.** Values must be plain numbers; `walk` keys in any order, with any whitespace or line
  breaks and an optional trailing comma, and only `from`, `to` and `cadence`. A prop written as an expression
  (`gestureAt={beat + 4}`, `walk={WALK}`, `walk={{ from: start, to: 90 }}`, a spread) is skipped, not
  guessed. Commented-out props are ignored. Frames are scene-local.
- **Footsteps keep their rhythm.** In the aggregator they bypass merging, the minimum gap and the density
  cap (a fast walk at cadence 4 is 7.5 frames apart at 30 fps), do not count toward the density of other
  cues, and are only deduplicated against each other (two feet within 2 frames give one sound).
  Gesture pops go through the normal rules with confidence 0.8, so a stronger cue at the same moment wins.
- **Sounds are fixed by type.** The semantic mapper does not remap footsteps or gesture pops by context or
  scene position. With Earshot, `footstep` renders `pro_tap/soft` at weight 0.6; a palette or
  `sound.overrides` can swap it like any other sound.

### Checks

`sound <p> check` (also run by `sound build`, the post-render verify step and the pre-render review) fails
when a cue names a sound with no file, and warns about Earshot findings and sounds longer than 60 frames.

---

## AI Background Music

Generate ambient background music using Meta's MusicGen model.

### Full Video Music

```bash
# Generate background music
python -m src.cli music <project> generate

# With options
python -m src.cli music <project> generate --duration 120  # 2 minutes
python -m src.cli music <project> generate --style "ambient electronic"

# Check device support
python -m src.cli music <project> info
```

Output: `projects/<project>/music/background.mp3`

### Shorts Music

Generate punchy, energetic music for shorts:

```bash
python -m src.cli music <project> short
python -m src.cli music <project> short --variant teaser
python -m src.cli music <project> short --style "upbeat electronic, driving bass"
```

**Shorts music features:**
- Analyzes beat captions to detect content mood
- Detects emotional arc (problem → solution, tension, triumphant)
- Uses punchy presets (120 BPM, bold synths, driving rhythm)
- Higher volume (0.35 vs 0.3) for mobile playback

### Mood Detection

| Mood | Trigger | Music Style |
|------|---------|-------------|
| Journey | Problem + solution detected | Building energy, tension to release |
| Tension | Only problems detected | Building tension, suspenseful |
| Triumphant | Only solutions detected | Uplifting, positive energy |
| Energetic | Default | Standard punchy preset |

### Device Support

MusicGen runs on:
- **MPS** (Apple Silicon) - Recommended for Mac
- **CUDA** (NVIDIA GPU) - Best performance
- **CPU** - Fallback, slower

Check your setup:
```bash
python -m src.cli music <project> info
```

---

## Theme-Aware Sound Generation

The generator supports different themes for varied sonic palettes:

| Theme | Character |
|-------|-----------|
| `tech_ai` | Digital, sci-fi, whole-tone scales |
| `science` | Clean, precise, lydian feel |
| `finance` | Professional, warm, pentatonic |
| `space` | Deep, spacey, mysterious intervals |
| `nature` | Organic, warm, natural major |
| `abstract` | Neutral, balanced |

```bash
python -m src.cli sound <project> generate --theme science
```

---

## Architecture

The SFX system uses a multi-stage pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SFX Generation Pipeline                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TSX File ──► TypeScript AST Analyzer (Node.js)             │
│                  - Parse with @babel/parser                     │
│                  - Build symbol table for constants             │
│                  - Evaluate expressions (Math.round, etc.)      │
│                  - Extract animations with resolved frames      │
│                                                                 │
│  2. Animations ──► Semantic Sound Mapper (Python)              │
│                    - Analyze variable names & context           │
│                    - Map to appropriate sounds                  │
│                    - Consider scene narrative phase             │
│                                                                 │
│  3. Sound Cues ──► Aggregator                                  │
│                    - Deduplicate overlapping cues               │
│                    - Enforce density limits                     │
│                    - Output to storyboard.json                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| AST Extractor | `remotion/scripts/extract-animations.ts` | Parse TSX and evaluate expressions |
| TypeScript Analyzer | `src/sound/ts_analyzer.py` | Python wrapper for AST extractor |
| Semantic Mapper | `src/sound/semantic_mapper.py` | Context-aware sound selection |
| Sound Library | `src/sound/library.py` | Sound generation using numpy |
| Orchestrator | `src/sound/sfx_orchestrator.py` | Coordinates the pipeline |

### Fallback Behavior

The system falls back to regex-based analysis if:
- Node.js is not available
- The AST parser fails
- The scene file cannot be parsed

---

## CLI Reference

### Sound Commands

```bash
python -m src.cli sound <project> <command> [options]
```

| Command | Description |
|---------|-------------|
| `library --list` | List available sounds |
| `library --generate` | Generate all SFX files |
| `analyze` | Preview detected sound moments |
| `generate` | Generate SFX cues to storyboard |
| `clear` | Remove SFX cues from storyboard |

### Generate Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview without writing |
| `--no-llm` | Skip LLM analysis (faster) |
| `--theme` | Sound theme |
| `--max-density` | Max sounds per second (default: 3.0) |
| `--min-gap` | Min frames between sounds (default: 10) |

### Music Commands

```bash
python -m src.cli music <project> <command> [options]
```

| Command | Description |
|---------|-------------|
| `generate` | Generate full video background music |
| `short` | Generate shorts background music |
| `info` | Show device support and presets |

### Music Options

| Option | Description |
|--------|-------------|
| `--duration` | Target duration in seconds |
| `--style` | Custom style prompt |
| `--variant` | Shorts variant name |
