"""Sound design module for video explainer.

This module provides intelligent SFX generation for frame-accurate sound design.

The sound design workflow is:
1. Analyze scene code for animation patterns
   - TypeScript AST analyzer (ts_analyzer) for accurate expression evaluation
   - Regex-based analyzer (scene_analyzer) as fallback
   - Kit analyzer (kit_analyzer) for style bundle scenes built from kit components
2. Apply semantic sound mapping (semantic_mapper)
3. Sync to narration word timestamps (narration_sync)
4. Optional LLM semantic analysis (llm_analyzer)
5. Aggregate and filter moments (aggregator)
6. Generate SFX cues (cue_generator)
7. Update storyboard.json (storyboard_updater)
8. Generate SFX files using SoundLibrary (built-in numpy, or the optional Earshot engine)
9. Remotion renders video with SFX at specified frames

Components:
- models: Data structures (SoundMoment, SFXCue)
- library: SFX generation with 17 focused sounds
- earshot_backend: Optional Earshot engine, palettes, manifest and audit (standard library only)
- generator: Theme-aware sound synthesis
- ts_analyzer: TypeScript AST-based animation extraction
- scene_analyzer: Regex-based TSX code pattern detection (fallback)
- kit_analyzer: Start frames of kit components in style bundle scenes
- semantic_mapper: Context-aware sound selection
- narration_sync: Word timestamp sync
- llm_analyzer: LLM semantic analysis
- aggregator: Moment deduplication and filtering
- cue_generator: Moment to cue mapping
- storyboard_updater: Storyboard modification
- sfx_orchestrator: Main pipeline orchestrator

The names below are imported on first use (PEP 562), not when the package is imported. That keeps
``from src.sound import earshot_backend`` light: the UI server needs only its palette names and
status, and must not depend on numpy and scipy (pulled in by ``generator``) importing cleanly.
"""

import importlib

# public name -> submodule that defines it
_EXPORTS = {
    # Models
    "SoundMoment": "models",
    "SFXCue": "models",
    "WordTimestamp": "models",
    "SceneAnalysisResult": "models",
    "MomentType": "models",
    "calculate_volume": "models",
    "get_sound_for_moment": "models",
    # Library
    "SoundLibrary": "library",
    "SOUND_MANIFEST": "library",
    # Generator
    "SoundGenerator": "generator",
    "SoundEvent": "generator",
    "SoundTheme": "generator",
    # TypeScript AST Analyzer
    "TypeScriptAnalyzer": "ts_analyzer",
    "analyze_scene_with_ast": "ts_analyzer",
    # Scene Analyzer (regex fallback)
    "SceneAnalyzer": "scene_analyzer",
    "analyze_scene": "scene_analyzer",
    "find_scene_files": "scene_analyzer",
    # Semantic Mapper
    "SemanticSoundMapper": "semantic_mapper",
    "map_moment_to_sound": "semantic_mapper",
    "map_moments_to_sounds": "semantic_mapper",
    # Narration Sync
    "NarrationSyncAnalyzer": "narration_sync",
    "sync_to_narration": "narration_sync",
    "analyze_narration_text": "narration_sync",
    # Aggregator
    "aggregate_moments": "aggregator",
    "get_density_report": "aggregator",
    # Cue Generator
    "CueGenerator": "cue_generator",
    "SceneSFXGenerator": "cue_generator",
    # Storyboard Updater
    "StoryboardUpdater": "storyboard_updater",
    "update_storyboard": "storyboard_updater",
    "load_storyboard": "storyboard_updater",
    # Orchestrator
    "SFXOrchestrator": "sfx_orchestrator",
    "SFXGenerationResult": "sfx_orchestrator",
    "generate_project_sfx": "sfx_orchestrator",
    "analyze_project_scenes": "sfx_orchestrator",
}

__all__ = list(_EXPORTS)


def __getattr__(name: str):
    module = _EXPORTS.get(name)
    if module is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    value = getattr(importlib.import_module(f".{module}", __name__), name)
    globals()[name] = value  # cache, so __getattr__ runs once per name
    return value


def __dir__() -> list[str]:
    return sorted([*globals(), *_EXPORTS])
