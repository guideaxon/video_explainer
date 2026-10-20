export type StepStatus =
  | "hidden" | "skipped" | "not started" | "ready" | "running" | "needs review"
  | "approved" | "done" | "stale" | "failed";

export interface Step {
  id: string;
  title: string;
  mode: "run" | "manual" | "skipped" | "hidden";
  note: string;
  gated: boolean;
  can_run: boolean;
  force_flag: string | null;
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
  channel: string;
  supported: boolean;
  resolution: string;
  fps: number | null;
  target_seconds: number | null;
  tts_provider: string | null;
  voice_id: string;
  style: { primary_color: string; secondary_color: string; background_color: string; font_family: string };
  steps: Step[];
  progress: string;
  has_video: boolean;
  final_video: string;
  last_activity: number | null;
  active_job?: Job | null;
}

export interface Chip { ok: boolean; detail: string; fix: string }
export interface Health {
  python: Chip; node: Chip; ffmpeg: Chip; claude: Chip; tts_edge: Chip; remotion: Chip;
  channels: string[];
}

export interface CreateBody {
  title: string;
  channel: string;
  prompt: string;
  source_text: string;
  target_seconds: number;
  tts_provider: string;
}
