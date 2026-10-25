export type StepStatus =
  | "hidden" | "skipped" | "not started" | "ready" | "running" | "needs review"
  | "approved" | "done" | "stale" | "failed";

export interface Step {
  id: string;
  title: string;
  mode: "run" | "manual" | "skipped" | "hidden";
  note: string;
  gated: boolean;
  optional: boolean;
  can_run: boolean;
  force_flag: string | null;
  commands: { label: string; text: string }[];
  output_time: number | null;
  status: StepStatus;
}

export interface Job {
  id: string;
  project: string;
  step: string;
  argv: string[];
  status: "running" | "succeeded" | "failed" | "cancelled" | "interrupted";
  started: number;
  finished: number | null;
  exit_code: number | null;
}

export interface Project {
  id: string;
  title: string;
  style_bundle: string;
  supported: boolean;
  resolution: string;
  fps: number | null;
  target_seconds: number | null;
  tts_provider: string | null;
  voice_id: string;
  style: { primary_color: string; secondary_color: string; background_color: string; font_family: string };
  steps: Step[];
  sound: { palette: string; override: string; palettes: string[] };
  progress: string;
  has_video: boolean;
  final_video: string;
  html_output: string; // film.html (papercut), figure.html (isofigure) or empty
  last_activity: number | null;
  active_job?: Job | null;
}

export interface Chip { ok: boolean; detail: string; fix: string; optional?: boolean }
export interface Health {
  python: Chip; node: Chip; ffmpeg: Chip; claude: Chip; tts_edge: Chip; remotion: Chip; earshot: Chip;
  style_bundles: string[];
}

export type SoundEngine = "auto" | "builtin" | "earshot";

export interface SoundEntry {
  engine: "earshot" | "builtin";
  bank?: string;
  seconds: number;
  warnings: string[];
  fallback_reason?: string;
}
export interface SoundManifest { engine: SoundEngine; palette: string; generated: number; earshot: string; sounds: Record<string, SoundEntry> }
export interface SoundInfo { manifest: SoundManifest | null; audit: [string, string][] }

export interface CreateBody {
  title: string;
  style_bundle: string;
  prompt: string;
  source_text: string;
  target_seconds: number;
  tts_provider: string;
}

export interface MovieBookShotQc {
  speaker?: string | null;
  issues: string[];
  f0_hz?: number | null;
  anchor_hz?: number | null;
  deviation?: number | null;
  cer?: number;
  heard?: string;
}
export interface MovieBookShot {
  id: string; title: string; speaker: string | null; line: string; visual: string; cast: string[];
  seed: number | null; clip_seed: number | null;
  keyframe: string | null; keyframe_time: number | null; clip: string | null; clip_time: number | null;
  qc: MovieBookShotQc | null;
}
export interface MovieBookCast { key: string; name: string; gender: string; description: string; anchor_hz: number | null; tolerance: number }
export interface MovieBookPlan {
  cast: Record<string, { name: string; gender: string; identity: string; voice: { description: string; anchor_hz: number | null; tolerance: number } }>;
  shots: { title: string; visual: string; keyframe_prompt?: string; speaker?: string; line?: string; cast?: string[]; seed?: number; clip_seed?: number }[];
  [key: string]: unknown;
}
export interface MovieBookOverview {
  plan: MovieBookPlan | null;
  problems: string[];
  shots: MovieBookShot[];
  cast: MovieBookCast[];
  qc: { passed: boolean | null; asr_checked: boolean | null; stale: boolean; speaker_f0_hz: Record<string, { median: number; min: number; max: number }> } | null;
}
export interface RunOpts { force?: boolean; preview?: boolean; only?: string }
