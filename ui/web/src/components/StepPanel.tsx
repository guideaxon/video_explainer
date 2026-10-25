import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { loadPrefs } from "../prefs";
import type { Project, RunOpts, SoundEngine, Step } from "../types";
import CopyButton from "./CopyButton";
import DocEditor from "./DocEditor";
import JobLog from "./JobLog";
import MovieBookPanel from "./MovieBookPanel";
import SoundPanel from "./SoundPanel";

const COSTLY: Record<string, string> = {
  voiceover: "This generates the voiceover with your TTS provider and can take a few minutes.",
  render: "Rendering can take a long time and uses a lot of CPU.",
  script: "This calls Claude Code and uses tokens.",
  narration: "This calls Claude Code and uses tokens.",
  scenes: "This calls Claude Code once per scene and uses tokens.",
};

// MovieBook reuses the step ids for its own steps and runs everything locally: no tokens, no TTS provider.
const MOVIEBOOK_COSTLY: Record<string, string> = {
  review: "This runs Qwen-Image in your local ComfyUI (about a minute per keyframe) and keeps the GPU busy.",
  voiceover: "Each clip takes 2 to 4 minutes on the GPU. Plug the laptop in and keep it awake.",
  storyboard: "This checks every clip's pitch and runs Whisper on the dialogue, then builds the storyboard.",
  render: "Rendering can take a long time and uses a lot of CPU.",
};
const MOVIEBOOK_PANEL_STEPS = ["narration", "review", "voiceover", "storyboard"];

const HELP: Record<string, string> = {
  stale: "An earlier step changed after this was generated. Re-run it, or accept it if the change does not affect this step.",
  failed: "The last run failed. Read the log below, fix the cause and run it again.",
  "needs review": "Check the output, then approve it to continue.",
};

interface Props {
  project: Project;
  step: Step;
  refresh: () => Promise<void>;
}

export default function StepPanel({ project, step, refresh }: Props) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState(project.tts_provider ?? "edge");
  const [engine, setEngine] = useState<SoundEngine>(() => loadPrefs().soundEngine); // the Sound step's engine, seeded from Preferences
  const movie = project.style_bundle === "moviebook";
  const [skipAsr, setSkipAsr] = useState(false);
  const busy = project.steps.some((s) => s.status === "running");
  const hasOutput = step.output_time !== null;

  // Attach to the newest job of this step (or the running one) when the step changes.
  useEffect(() => {
    setError("");
    setJobId(null);
    if (project.active_job?.step === step.id) { setJobId(project.active_job.id); return; }
    api.jobs(project.id).then((jobs) => {
      const last = jobs.find((j) => j.step === step.id);
      if (last) setJobId(last.id);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, step.id]);

  async function run(opts: RunOpts = {}) {
    const warning = (movie ? MOVIEBOOK_COSTLY : COSTLY)[step.id];
    if (warning && !opts.only && !window.confirm(`${warning}\n\nContinue?`)) return;
    setError("");
    try {
      const job = await api.run(project.id, step.id, {
        ...opts,
        provider: step.id === "voiceover" && !movie ? provider : undefined,
        skip_asr: movie && step.id === "storyboard" && skipAsr ? true : undefined,
        sound_engine: step.id === "sound" ? engine : undefined,
      });
      setJobId(job.id);
      await refresh();
    } catch (e) {
      if (e instanceof ApiError && e.jobId) setJobId(e.jobId);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function approve() {
    setError("");
    try { await api.approve(project.id, step.id); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  async function cancel() {
    if (!jobId) return;
    try { await api.cancel(project.id, jobId); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    await refresh();
  }

  const canApprove = step.gated && step.status === "needs review";
  const runLabel = hasOutput ? "Re-run" : "Run";
  const showVideo = step.id === "render" && project.has_video && hasOutput;
  const showFilm = step.id === "render" && project.html_output !== "" && hasOutput;

  return (
    <section className="panel" aria-labelledby="step-title">
      <div className="panel-head">
        <h2 id="step-title">{step.title}</h2>
        <span className={`status s-${step.status.replace(" ", "-")}`}>{step.status}</span>
      </div>
      {step.note && <p className="muted">{step.note}</p>}
      {HELP[step.status] && <p className={step.status === "failed" ? "banner error" : "banner"}>{HELP[step.status]}</p>}
      {!project.supported && <p className="banner error">This style bundle is run from the CLI, not this UI.</p>}

      <div className="actions">
        {step.can_run && project.supported && (
          <>
            {step.id === "voiceover" && !movie && (
              <label className="inline">Voice
                <select value={provider} onChange={(e) => setProvider(e.target.value)} disabled={busy}>
                  <option value="edge">Edge</option><option value="elevenlabs">ElevenLabs</option><option value="mock">Mock</option>
                </select>
              </label>
            )}
            {step.id === "sound" && (
              <label className="inline">Engine
                <select value={engine} onChange={(e) => setEngine(e.target.value as SoundEngine)} disabled={busy}>
                  <option value="builtin">Built-in</option><option value="earshot">Earshot (opt in)</option><option value="auto">Automatic</option>
                </select>
              </label>
            )}
            <button className="btn primary" onClick={() => run()} disabled={busy}>{runLabel}</button>
            {hasOutput && step.force_flag && (
              <button className="btn" onClick={() => run({ force: true })} disabled={busy}
                title="Overwrite the existing output">Regenerate (overwrite)</button>
            )}
            {step.id === "render" && <button className="btn" onClick={() => run({ preview: true })} disabled={busy}>Quick preview</button>}
          </>
        )}
        {step.commands.map((c) => <CopyButton key={c.label} text={c.text} label={c.label} />)}
        {canApprove && <button className="btn good" onClick={approve}>Approve and continue</button>}
        {!step.can_run && step.mode === "manual" && !step.note && <span className="muted">Nothing to run for this project.</span>}
      </div>
      {error && <div className="banner error" role="alert">{error}</div>}

      {!(movie && step.id === "narration") && (step.id === "script" || step.id === "narration") && (
        <DocEditor project={project.id} kind={step.id} version={step.output_time} onSaved={refresh} />
      )}

      {movie && MOVIEBOOK_PANEL_STEPS.includes(step.id) && (
        <MovieBookPanel project={project} step={step} busy={busy} run={run} skipAsr={skipAsr} setSkipAsr={setSkipAsr} />
      )}

      {step.id === "sound" && <SoundPanel project={project} step={step} />}

      {showVideo && (
        <div className="video">
          <video controls preload="metadata" src={`${api.fileUrl(project.id, project.final_video)}?v=${step.output_time}`} />
          <a className="btn small" href={api.fileUrl(project.id, project.final_video)} download>Download</a>
        </div>
      )}

      {showFilm && (
        <div className="video">
          <iframe
            title="Generated HTML" sandbox="allow-scripts" className="film-frame"
            src={`${api.fileUrl(project.id, project.html_output)}?v=${step.output_time}`}
          />
          <a className="btn small" href={api.fileUrl(project.id, project.html_output)} target="_blank" rel="noreferrer">
            Open in a new tab{project.style_bundle === "papercut" ? " (click it once to start the music)" : ""}
          </a>
        </div>
      )}

      {jobId && <JobLog project={project.id} jobId={jobId} onDone={() => { void refresh(); }} onCancel={cancel} />}
    </section>
  );
}
