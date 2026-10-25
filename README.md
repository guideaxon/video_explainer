# Video Explainer System

A system for generating high-quality explainer videos from technical documents. Transform research papers, articles, and documentation into engaging video content with automated narration and programmatic animations.

## Example Videos

- [World Models: The Missing Piece for AGI](https://youtu.be/FWGlRy1lPxM?si=mEd0YmE231VOPs4z)
- [How AI Learned to Reason: DeepSeek and o1 Explained](https://youtu.be/uUTTeGVB6z8)
- [How LLMs Actually Understand Images](https://youtu.be/PuodF4pq79g?si=4T0CV555qr89DSvY)
- [What Happens in 300ms Before AI Responds (Short)](https://youtube.com/shorts/Ctlvk5ALxxI)
- [The Trick That Let AI See (Short)](https://www.youtube.com/shorts/vwI_gD4OG4I)

## Features

### Content Pipeline
- **Multi-Format Input** - Parse Markdown, PDF documents, and web URLs
- **Script Generation** - Generate video scripts with visual cues and voiceover text
- **Text-to-Speech** - Integration with ElevenLabs and Edge TTS
- **Manual Voiceover** - Import your own recordings with Whisper transcription

### Visual Generation
- **Remotion Animations** - React-based programmatic video generation
- **AI Scene Generation** - Claude-powered scene component creation
- **Refinement** - 5-phase quality improvement system (analyze, script, visual-cue, visual, sync)
- **Style Bundle Videos** - Seven style bundles (Vantage, Markets, Promo, Launch, Lyric, Leaderbot, Demo) with templates, kits and skills; pre-render review via `scripts/review_video.py`. See [docs/HowToUse.md](docs/HowToUse.md)

### Sound Design
- **Automated SFX** - Intelligent sound effect planning and generation
- **AI Background Music** - Generate ambient music using MusicGen
- **Audio Mixing** - Combine voiceover, SFX, and music

### Shorts & Distribution
- **Vertical Shorts** - 1080x1920 for YouTube Shorts, Reels, TikTok
- **TikTok-Style Captions** - Single-word captions with glow effects
- **Multiple Variants** - Generate different versions from same project

### Quality Assurance
- **Fact Checking** - Verify accuracy against source material
- **Feedback Processing** - Natural language feedback to file updates

## Architecture

```
Document → Parse → Analyze → Script → TTS → Storyboard → Animation → Video
                                       │         ↑
                                       │    (JSON schema)
                                       └─────────┘
                                    (word timestamps)
```

**Key Insight:** TTS generation happens BEFORE storyboard creation because we need audio timing (word-level timestamps) to sync visuals precisely to narration.

### Project Structure

```
video_explainer/
├── projects/                    # Self-contained video projects
│   └── <project>/               # Each project contains:
│       ├── config.json          # Project configuration
│       ├── input/               # Source documents (MD, PDF)
│       ├── script/              # Generated scripts
│       ├── narration/           # Scene narrations
│       ├── scenes/              # Remotion components (*.tsx)
│       ├── voiceover/           # Audio files (*.mp3)
│       ├── storyboard/          # Storyboard JSON
│       ├── music/               # Background music
│       ├── short/               # Shorts variants
│       └── output/              # Final videos
│
├── src/                         # Core pipeline code
│   ├── cli/                     # CLI commands
│   ├── ingestion/               # Document parsing
│   ├── script/                  # Script generation
│   ├── scenes/                  # Scene component generation
│   ├── audio/                   # TTS providers
│   ├── sound/                   # SFX system
│   ├── music/                   # MusicGen integration
│   ├── refine/                  # Refinement system
│   └── short/                   # Shorts generation
│
├── ui/                          # Local web UI
│   ├── server/                  # FastAPI backend (runs the CLI steps as jobs)
│   └── web/                     # React + Vite frontend
│
└── remotion/                    # Remotion project (React)
    ├── src/components/          # Reusable components
    ├── src/scenes/              # Scene compositions
    └── scripts/render.mjs       # Headless rendering
```

## Quick Start

### Prerequisites

- Python 3.14+ (C:Python314)
- Node.js 22+
- FFmpeg

### Installation

```bash
# Clone and setup
git clone <repository-url>
cd video_explainer

# Python environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .

# Remotion dependencies
cd remotion && npm install && cd ..
```

### Basic Workflow

```bash
# 1. Create a new project
python -m src.cli create my-video

# 2. Add source documents to projects/my-video/input/

# 3. Run the full pipeline
python -m src.cli generate my-video

# 4. Preview in Remotion Studio
cd remotion && npm run dev

# 5. Render final video
python -m src.cli render my-video
```

### Step-by-Step Pipeline

```bash
python -m src.cli script my-video        # Generate script from input docs
python -m src.cli narration my-video     # Generate scene narrations
python -m src.cli scenes my-video        # Generate Remotion components
python -m src.cli voiceover my-video     # Generate TTS audio
python -m src.cli storyboard my-video    # Create storyboard
python -m src.cli render my-video        # Render final video
```

### Web UI (local)

A local web app walks you through the pipeline one reviewable step at a time: create a project from a
prompt or a Markdown document, run each step, check its output, approve it, and watch the render. It
runs the same CLI commands as above, so the CLI and the UI always agree. It listens on `127.0.0.1`
only and has no login, so do not expose it to a network.

**One-time setup** (after the Installation steps above):

```powershell
# Windows PowerShell, from the repo root
.venv\Scripts\activate
pip install -e ".[ui]"                  # adds FastAPI and uvicorn
cd ui\web
npm install
npm run build                           # builds the frontend into ui\web\dist
cd ..\..

$env:PYTHONUTF8 = "1"
.venv\Scripts\python.exe -c "import sys; sys.path.insert(0,'scripts'); import _lipsync as L; print(L.find_rhubarb())"

$env:PYTHONUTF8 = "1"
python -m ui.server
```

On macOS or Linux use `source .venv/bin/activate` and `cd ui/web`.

**Run it:**

```powershell
$env:PYTHONUTF8 = "1"                   # Windows: the CLI prints non-cp1252 characters
python -m ui.server
```

Then open <http://127.0.0.1:8765>. The API docs are at <http://127.0.0.1:8765/api/docs>. The Create
New Project screen shows green or red checks for Python, Node, ffmpeg, Claude Code, edge-tts and the Remotion
dependencies; fix any red one first (LLM steps shell out to Claude Code).

**Using it:**

1. Use the menu on the left. **File → Create New Project** (also the landing page) is where you
   describe the video (or write or upload a Markdown source document), pick a style bundle (Standard,
   Markets, Promo, Launch, Lyric, Leaderbot or Demo), a length and a voice, then **Create project**.
   **Open Recent** lists your latest projects; **All** opens the Continue a project screen with every
   project and a filter. **Preferences** sets the theme, how many recent projects the menu shows, and
   the default style bundle, length and voice for new projects. The menu collapses to icons with the
   button at its bottom. The top bar has a Create / Projects switch and a single theme button that shows the
   theme you would switch to (a moon in light mode, a sun in dark mode). The choice is remembered.
   Preferences also offers "Follow my system", which tracks your OS live.
2. In the project, work down the step list on the left. Each step has Run, an optional
   Regenerate (overwrite), and Approve and continue. Steps that call an LLM, TTS or the renderer ask
   for confirmation first. Job logs stream live, and a running job can be cancelled.
3. Style bundle projects show the same nine steps. Script is skipped, narration is edited by hand
   (JSON editor in the Narration step), Scenes is scaffolded once and then edited in
   `projects/<project>/scenes/`, and Review runs `scripts/review_video.py` before Voiceover.
4. The Render step plays the finished video. Settings (title, length, voice, colors, font) are in the
   left list under Settings.

A step shows `stale` when an earlier step changed after it ran, and `failed` when the last run
exited with an error (read the log; **Problems only** filters it). Vantage shorts are listed but
marked CLI only; make them with `/vantage_make_short`.

**Frontend development** (hot reload): start the API with `python -m ui.server`, then in a second
terminal run `cd ui\web && npm run dev` and open <http://localhost:5173>. It proxies `/api` to the
server.

**Tests:**

```powershell
python -m pytest tests/ui -q            # backend: status logic, jobs, API, protection checks
cd ui\web; npm run build                # type-checks the frontend
cd ui\web; npm run e2e -- <folder>      # browser click-through; needs the server running and Edge or Chrome
```

`npm run e2e` creates a throwaway project named `e2e-click-test` under `projects/`; delete it afterwards.
Set `BROWSER_PATH` if your browser is not at the default Edge location. See
[docs/UI_SPEC.md](docs/UI_SPEC.md) for the design, the API and what is not built yet.

## CLI Reference

### Project Management

```bash
python -m src.cli list                    # List all projects
python -m src.cli info <project>          # Show project details
python -m src.cli create <project_id>     # Create new project
```

### Generation Pipeline

```bash
# Full pipeline
python -m src.cli generate <project>              # Run all steps
python -m src.cli generate <project> --force      # Regenerate everything
python -m src.cli generate <project> --mock       # Use mock LLM/TTS

# Partial runs
python -m src.cli generate <project> --from scenes    # Start from step
python -m src.cli generate <project> --to voiceover   # Stop at step
```

### Individual Steps

```bash
python -m src.cli script <project>        # Generate script
python -m src.cli narration <project>     # Generate narrations
python -m src.cli scenes <project>        # Generate scene components
python -m src.cli voiceover <project>     # Generate audio
python -m src.cli storyboard <project>    # Create storyboard
python -m src.cli render <project>        # Render video
```

### Sound Design

```bash
python -m src.cli sound <project> analyze     # Preview detected moments
python -m src.cli sound <project> generate    # Generate SFX cues
python -m src.cli music <project> generate    # Generate background music
```

See [docs/SOUND.md](docs/SOUND.md) for detailed sound design documentation.

### Refinement

```bash
python -m src.cli refine <project> --phase analyze     # Gap analysis
python -m src.cli refine <project> --phase script      # Script refinement
python -m src.cli refine <project> --phase visual-cue  # Visual spec refinement
python -m src.cli refine <project> --phase visual      # AI visual inspection
python -m src.cli refine <project> --phase sync --full  # Sync animations to voiceover
```

See [docs/REFINEMENT.md](docs/REFINEMENT.md) for the 5-phase refinement process.

### Shorts Generation

```bash
python -m src.cli short generate <project>    # Full shorts pipeline
python -m src.cli render <project> --short    # Render the short
```

See [docs/SHORTS.md](docs/SHORTS.md) for shorts workflow and timing sync.

### Quality Assurance

```bash
python -m src.cli factcheck <project>                          # Verify accuracy
python -m src.cli feedback <project> add "Make text larger"    # Process feedback
```

### Rendering Options

| Preset | Resolution | Use Case |
|--------|------------|----------|
| 4k     | 3840x2160  | YouTube/Final |
| 1440p  | 2560x1440  | High quality |
| 1080p  | 1920x1080  | Default |
| 720p   | 1280x720   | Development |
| 480p   | 854x480    | Quick preview |

```bash
python -m src.cli render <project> -r 4k          # 4K render
python -m src.cli render <project> --fast         # Faster encoding
python -m src.cli render <project> --preview      # Quick preview
python -m src.cli render <project> --concurrency 8  # Thread count
```

See [docs/CLI.md](docs/CLI.md) for complete CLI reference with all options.

## Configuration

### Project Configuration (projects/*/config.json)

```json
{
  "id": "my-video",
  "title": "My Explainer Video",
  "video": {
    "resolution": { "width": 1920, "height": 1080 },
    "fps": 30,
    "target_duration_seconds": 180
  },
  "tts": {
    "provider": "elevenlabs",
    "voice_id": "your-voice-id"
  },
  "style": {
    "background_color": "#0f0f1a",
    "primary_color": "#00d9ff"
  }
}
```

### Global Configuration (config.yaml)

```yaml
llm:
  provider: claude-code  # claude-code | mock | anthropic | openai
  model: claude-sonnet-5-5

tts:
  provider: mock  # mock | elevenlabs | edge
  voice_id: null

video:
  width: 1920
  height: 1080
  fps: 30
```

### Environment Variables

- `ANTHROPIC_API_KEY` - For Claude LLM provider
- `OPENAI_API_KEY` - For OpenAI LLM provider
- `ELEVENLABS_API_KEY` - For ElevenLabs TTS

## Development

### Remotion Studio

```bash
cd remotion
npm run dev
```

Opens at `http://localhost:3000` for previewing compositions.

### Creating Animation Components

```tsx
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

export const MyComponent: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  return <div style={{ opacity }}>{title}</div>;
};
```

### Testing

```bash
# Python tests (1192 tests)
pytest tests/ -v
pytest tests/ -v --run-slow     # Also run slow tests (network access)

# JavaScript tests (203 tests)
cd remotion && npm test
```

### Visual Style

Default theme for technical content:

| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark Slate | `#0f0f1a` |
| Compute/Data | Cyan | `#00d9ff` |
| Memory | Orange | `#ff6b35` |
| Optimization | Green | `#00ff88` |
| Problems | Red | `#ff4757` |

Typography: Inter/SF Pro for text, JetBrains Mono for code

## Documentation

- [CLI Reference](docs/CLI.md) - Complete command reference with all options
- [How To Use](docs/HowToUse.md) - Overview and map of which doc or feature to use when
- [Web UI Spec](docs/UI_SPEC.md) - Screens, API, step table and build status for the local web UI
- [Refinement System](docs/REFINEMENT.md) - 5-phase quality improvement process
- [Shorts Generation](docs/SHORTS.md) - Vertical video workflow and timing sync
- [Sound Design](docs/SOUND.md) - SFX system and AI music generation

## Dependencies

### Python
- pydantic, rich, pyyaml - Core utilities
- edge-tts - Microsoft Edge TTS
- pymupdf - PDF parsing
- transformers, torch - MusicGen AI music

### Node.js
- remotion, @remotion/renderer - Video rendering
- react - UI components
- vitest - Testing

### System
- FFmpeg - Video processing
- Node.js 22+ - Remotion runtime

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Remotion](https://remotion.dev/) - React-based video generation
- [ElevenLabs](https://elevenlabs.io/) - Text-to-Speech
- [MusicGen](https://github.com/facebookresearch/audiocraft) - AI music generation
- [FFmpeg](https://ffmpeg.org/) - Video processing
