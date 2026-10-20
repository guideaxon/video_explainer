import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { Job } from "../types";

function lineClass(line: string): string {
  if (/^(ERROR|FAIL)\b|Traceback|Error:/.test(line)) return "ln err";
  if (/^WARN/.test(line)) return "ln warn";
  if (/^PASS/.test(line)) return "ln pass";
  return "ln";
}

// Remotion and the CLI print "n/total" while rendering; show it as a bar when a line looks like that.
function progressOf(lines: string[]): number | null {
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
    const m = lines[i].match(/(\d+)\s*\/\s*(\d+)/);
    if (m && /render|frame|encod/i.test(lines[i]) && Number(m[2]) > 0) return Math.min(1, Number(m[1]) / Number(m[2]));
  }
  return null;
}

interface Props {
  project: string;
  jobId: string;
  onDone: (job: Job) => void;
  onCancel?: () => void;
}

/** Streams a job's log over SSE. Works for finished jobs too: the server replays all lines, then closes. */
export default function JobLog({ project, jobId, onDone, onCancel }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    setLines([]);
    setJob(null);
    setOnlyProblems(false);
    const es = new EventSource(api.eventsUrl(project, jobId));
    let buffer: string[] = [];
    const flush = window.setInterval(() => {
      if (buffer.length) {
        const batch = buffer;
        buffer = [];
        setLines((prev) => prev.concat(batch));
      }
    }, 150);
    es.onmessage = (e) => buffer.push(JSON.parse(e.data).line);
    es.addEventListener("done", (e) => {
      const done = JSON.parse((e as MessageEvent).data) as Job;
      es.close();
      window.clearInterval(flush);
      // Take the pending lines now: the updater below runs later, after buffer is reassigned.
      const rest = buffer;
      buffer = [];
      setLines((prev) => prev.concat(rest));
      setJob(done);
      onDone(done);
    });
    es.onerror = () => { es.close(); window.clearInterval(flush); };
    return () => { es.close(); window.clearInterval(flush); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, jobId]);

  useEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const running = !job;
  const pct = running ? progressOf(lines) : null;
  const errors = lines.filter((l) => lineClass(l) === "ln err").length;
  const warnings = lines.filter((l) => lineClass(l) === "ln warn").length;
  const shown = onlyProblems ? lines.filter((l) => lineClass(l) === "ln err" || lineClass(l) === "ln warn") : lines;

  return (
    <div className="joblog">
      <div className="joblog-head">
        <span>{running ? "Running…" : `${job.status} (exit ${job.exit_code ?? "?"})`}</span>
        {errors + warnings > 0 && (
          <label className="inline problems">
            <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
            Problems only ({errors} errors, {warnings} warnings)
          </label>
        )}
        {running && onCancel && <button className="btn small danger" onClick={onCancel}>Cancel</button>}
      </div>
      {pct !== null && <progress value={pct} max={1} aria-label="Render progress" />}
      <div
        className="joblog-body"
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {lines.length === 0 && <div className="ln muted">{running ? "Waiting for output…" : "No output."}</div>}
        {shown.map((l, i) => <div key={i} className={lineClass(l)}>{l || " "}</div>)}
      </div>
    </div>
  );
}
