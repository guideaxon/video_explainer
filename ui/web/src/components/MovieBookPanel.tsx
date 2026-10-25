import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { MovieBookOverview, MovieBookPlan, MovieBookShot, Project, RunOpts, Step } from "../types";

interface Props {
  project: Project;
  step: Step;
  busy: boolean;
  run: (opts?: RunOpts) => Promise<void>;
  skipAsr: boolean;
  setSkipAsr: (v: boolean) => void;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const pct = (x: number | null | undefined) => (x === null || x === undefined ? "–" : `${Math.round(x * 100)}%`);

/** The MovieBook step panels: story plan editor, keyframe review, clip review, voice anchors and voice-check results. */
export default function MovieBookPanel({ project, step, busy, run, skipAsr, setSkipAsr }: Props) {
  const [data, setData] = useState<MovieBookOverview | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setData(await api.moviebook(project.id)); setError(""); }
    catch (e) { setError(msg(e)); }
  }, [project.id]);

  // Reload when the step's output changes or a job finishes (busy goes false).
  useEffect(() => { void load(); }, [load, step.output_time, busy]);

  if (error) return <div className="banner error" role="alert">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;
  if (!data.plan) return <p className="muted">There is no plan yet. Run this step to scaffold the sample story, then edit it here.</p>;

  const rerun = async (shot: MovieBookShot, kind: "keyframe" | "clip") => {
    try {
      await api.rerollMovieBook(project.id, shot.id, kind);
      await run({ only: shot.id, force: true });
    } catch (e) { setError(msg(e)); }
  };

  return (
    <div className="mb">
      {data.problems.length > 0 && <div className="banner error">Plan problems: {data.problems.join("; ")}</div>}
      {step.id === "narration" && <PlanEditor project={project.id} plan={data.plan} onSaved={load} />}
      {step.id === "review" && <KeyframeGrid project={project.id} shots={data.shots} busy={busy} run={run} rerun={rerun} />}
      {step.id === "voiceover" && <ClipGrid project={project.id} shots={data.shots} busy={busy} run={run} rerun={rerun} />}
      {step.id === "storyboard" && <VoicePanel project={project.id} data={data} busy={busy} onChanged={load} skipAsr={skipAsr} setSkipAsr={setSkipAsr} />}
    </div>
  );
}

function PlanEditor({ project, plan, onSaved }: { project: string; plan: MovieBookPlan; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState<MovieBookPlan>(() => structuredClone(plan));
  const [raw, setRaw] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { setDraft(structuredClone(plan)); }, [plan]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(plan);

  const setShot = (i: number, key: "line" | "visual" | "keyframe_prompt", value: string) =>
    setDraft((d) => ({ ...d, shots: d.shots.map((s, j) => (j === i ? { ...s, [key]: value } : s)) }));
  const setCast = (k: string, patch: Record<string, string>, voice = false) =>
    setDraft((d) => ({ ...d, cast: { ...d.cast, [k]: voice ? { ...d.cast[k], voice: { ...d.cast[k].voice, ...patch } } : { ...d.cast[k], ...patch } } }));

  async function save() {
    let toSave = draft;
    if (raw !== null) {
      try { toSave = JSON.parse(raw) as MovieBookPlan; } catch (e) { setError(`Not valid JSON: ${msg(e)}`); return; }
    }
    try { await api.saveMovieBookPlan(project, toSave); setError(""); setRaw(null); setNote("Saved. Re-run Scenes, and re-generate any shot whose text changed."); await onSaved(); }
    catch (e) { setError(msg(e)); }
  }

  return (
    <div className="mb-plan">
      <h3>Cast</h3>
      {Object.entries(draft.cast).map(([k, c]) => (
        <div className="mb-card" key={k}>
          <strong>{c.name}</strong> <span className="badge">{c.gender}</span>
          <label>Identity (copied word for word into every shot this character is in)
            <textarea rows={2} value={c.identity} onChange={(e) => setCast(k, { identity: e.target.value })} />
          </label>
          <label>Voice (repeated in every caption of this character's shots)
            <input value={c.voice.description} onChange={(e) => setCast(k, { description: e.target.value }, true)} />
          </label>
        </div>
      ))}
      <h3>Shots</h3>
      {draft.shots.map((s, i) => (
        <div className="mb-card" key={s.title}>
          <strong>{i + 1}. {s.title}</strong> {s.speaker && <span className="badge">{draft.cast[s.speaker]?.name ?? s.speaker}</span>}
          <label>Spoken line
            <input value={s.line ?? ""} onChange={(e) => setShot(i, "line", e.target.value)} />
          </label>
          <label>What happens
            <textarea rows={2} value={s.visual} onChange={(e) => setShot(i, "visual", e.target.value)} />
          </label>
          <label>Keyframe prompt
            <textarea rows={2} value={s.keyframe_prompt ?? ""} onChange={(e) => setShot(i, "keyframe_prompt", e.target.value)} />
          </label>
        </div>
      ))}
      <button className="linkish" onClick={() => setRaw(raw === null ? JSON.stringify(draft, null, 2) : null)} aria-expanded={raw !== null}>
        {raw !== null ? "▾" : "▸"} Advanced: edit plan.json (models, sizes, seeds, speakers, H3 settings)
      </button>
      {raw !== null && <textarea className="mono" rows={18} value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} />}
      {error && <div className="banner error" role="alert">{error}</div>}
      {note && !dirty && !error && <div className="banner">{note}</div>}
      <div className="actions">
        <button className="btn" onClick={save} disabled={!dirty && raw === null}>Save plan</button>
        {dirty && <span className="muted small">Unsaved changes. Saving makes the later steps stale.</span>}
      </div>
    </div>
  );
}

interface GridProps {
  project: string;
  shots: MovieBookShot[];
  busy: boolean;
  run: (opts?: RunOpts) => Promise<void>;
  rerun: (shot: MovieBookShot, kind: "keyframe" | "clip") => Promise<void>;
}

function KeyframeGrid({ project, shots, busy, run, rerun }: GridProps) {
  return (
    <div className="mb-grid">
      {shots.map((s) => (
        <figure className="mb-card" key={s.id}>
          {s.keyframe
            ? <img src={`${api.fileUrl(project, s.keyframe)}?v=${s.keyframe_time}`} alt={`Keyframe of ${s.title}`} loading="lazy" />
            : <div className="mb-empty">No keyframe yet</div>}
          <figcaption>
            <strong>{s.title}</strong>
            {s.line && <span className="muted small"> “{s.line}”</span>}
            <div className="actions">
              {s.keyframe
                ? <button className="btn small" disabled={busy} onClick={() => rerun(s, "keyframe")} title="Next seed, then regenerate this keyframe">Re-roll</button>
                : <button className="btn small" disabled={busy} onClick={() => run({ only: s.id })}>Generate</button>}
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function ClipGrid({ project, shots, busy, run, rerun }: GridProps) {
  return (
    <div className="mb-grid">
      {shots.map((s) => (
        <figure className="mb-card" key={s.id}>
          {s.clip
            ? <video controls preload="metadata" src={`${api.fileUrl(project, s.clip)}?v=${s.clip_time}`} poster={s.keyframe ? api.fileUrl(project, s.keyframe) : undefined} />
            : s.keyframe
              ? <img src={api.fileUrl(project, s.keyframe)} alt={`Keyframe of ${s.title}`} className="dim" loading="lazy" />
              : <div className="mb-empty">Needs a keyframe first</div>}
          <figcaption>
            <strong>{s.title}</strong>
            {s.line && <span className="muted small"> “{s.line}”</span>}
            {s.qc && s.qc.issues.length > 0 && <div className="mb-issue small">Voice check: {s.qc.issues.join("; ")}</div>}
            <div className="actions">
              {s.clip
                ? <button className="btn small" disabled={busy} onClick={() => rerun(s, "clip")} title="Next clip seed, then regenerate this clip">Re-roll</button>
                : <button className="btn small" disabled={busy || !s.keyframe} onClick={() => run({ only: s.id })}>Generate</button>}
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function VoicePanel({ project, data, busy, onChanged, skipAsr, setSkipAsr }: {
  project: string; data: MovieBookOverview; busy: boolean; onChanged: () => Promise<void>; skipAsr: boolean; setSkipAsr: (v: boolean) => void;
}) {
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [info, setInfo] = useState("");

  async function anchor(character: string, shot: string) {
    try { const r = await api.anchorMovieBook(project, character, shot); setInfo(r.result); setError(""); await onChanged(); }
    catch (e) { setError(msg(e)); }
  }

  const qc = data.qc;
  return (
    <div className="mb-voice">
      {!qc && <div className="banner">The voice check has not run yet. Set an anchor for each speaking character below, then run this step.</div>}
      {qc && qc.stale && <div className="banner error">A clip is newer than the last voice check. Run this step again.</div>}
      {qc && !qc.stale && qc.passed && <div className="banner">Voice check passed{qc.asr_checked ? "" : " (Whisper skipped: the dialogue was NOT checked)"}.</div>}
      {qc && !qc.stale && qc.passed === false && <div className="banner error">Voice check failed. Re-roll the shots marked below, then run this step again. Nothing is hidden or loosened.</div>}

      <h3>Voice anchors</h3>
      <p className="muted small">An anchor is the pitch (F0) of the voice you want for a character, measured from a clip you accepted. Each shot must stay within the tolerance of it. Pitch catches a swapped or wrong-gender voice and big timbre jumps, not a quiet change of speaker.</p>
      <table className="mb-table">
        <thead><tr><th>Character</th><th>Anchor</th><th>Tolerance</th><th>Measured range</th><th>Set from clip</th></tr></thead>
        <tbody>
          {data.cast.map((c) => {
            const own = data.shots.filter((s) => s.speaker === c.key && s.clip);
            const f0 = qc?.speaker_f0_hz?.[c.key];
            const sel = picked[c.key] ?? own[0]?.id ?? "";
            return (
              <tr key={c.key}>
                <td>{c.name} <span className="badge">{c.gender}</span></td>
                <td>{c.anchor_hz === null ? <em>not set</em> : `${c.anchor_hz} Hz`}</td>
                <td>{pct(c.tolerance)}</td>
                <td>{f0 ? `${f0.min}–${f0.max} Hz (median ${f0.median})` : "–"}</td>
                <td>
                  {own.length === 0 ? <span className="muted">no clip yet</span> : (
                    <span className="row">
                      <select value={sel} onChange={(e) => setPicked({ ...picked, [c.key]: e.target.value })} disabled={busy} aria-label={`Clip to anchor ${c.name}`}>
                        {own.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                      <button className="btn small" disabled={busy || !sel} onClick={() => anchor(c.key, sel)}>Set anchor</button>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {info && <p className="muted small">{info}</p>}
      {error && <div className="banner error" role="alert">{error}</div>}

      <label className="inline">
        <input type="checkbox" checked={skipAsr} onChange={(e) => setSkipAsr(e.target.checked)} disabled={busy} style={{ width: "auto" }} />
        Skip Whisper (use only if it is not installed; the dialogue will not be checked)
      </label>

      <h3>Result per shot</h3>
      <table className="mb-table">
        <thead><tr><th>Shot</th><th>Speaker</th><th>F0</th><th>Off anchor</th><th>Script error</th><th>Result</th></tr></thead>
        <tbody>
          {data.shots.map((s) => {
            const q = s.qc;
            const bad = q && q.issues.length > 0;
            return (
              <tr key={s.id} className={bad ? "bad" : ""}>
                <td>{s.title}</td>
                <td>{s.speaker ?? "–"}</td>
                <td>{q?.f0_hz ? `${q.f0_hz} Hz` : "–"}</td>
                <td>{pct(q?.deviation)}</td>
                <td>{q?.cer === undefined ? "–" : pct(q.cer)}</td>
                <td>{!q ? "not checked" : bad ? <span className="mb-issue">{q.issues.join("; ")}</span> : "ok"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
