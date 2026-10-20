import type { CreateBody, Health, Job, Project } from "./types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public jobId?: string) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let detail = res.statusText;
    let jobId: string | undefined;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      jobId = body.job_id;
    } catch { /* keep statusText */ }
    throw new ApiError(detail, res.status, jobId);
  }
  return res.json() as Promise<T>;
}

const post = (body?: unknown): RequestInit => ({ method: "POST", body: body ? JSON.stringify(body) : undefined });
const put = (body: unknown): RequestInit => ({ method: "PUT", body: JSON.stringify(body) });

export const api = {
  health: () => call<Health>("/health"),
  projects: () => call<Project[]>("/projects"),
  project: (id: string) => call<Project>(`/projects/${id}`),
  create: (body: CreateBody) => call<Project>("/projects", post(body)),
  saveSettings: (id: string, body: Record<string, unknown>) => call<Project>(`/projects/${id}/settings`, put(body)),
  source: (id: string) => call<{ path: string; text: string }>(`/projects/${id}/source`),
  saveSource: (id: string, text: string) => call<{ path: string }>(`/projects/${id}/source`, put({ text })),
  doc: (id: string, kind: "script" | "narration") => call<unknown>(`/projects/${id}/doc/${kind}`),
  saveDoc: (id: string, kind: "script" | "narration", content: unknown) =>
    call<{ path: string }>(`/projects/${id}/doc/${kind}`, put({ content })),
  jobs: (id: string) => call<Job[]>(`/projects/${id}/jobs`),
  job: (id: string, jobId: string) => call<Job & { log: string[] }>(`/projects/${id}/jobs/${jobId}?tail=400`),
  run: (id: string, step: string, opts: { force?: boolean; provider?: string; preview?: boolean } = {}) =>
    call<Job>(`/projects/${id}/steps/${step}/run`, post(opts)),
  approve: (id: string, step: string) => call<{ approved: string }>(`/projects/${id}/steps/${step}/approve`, post()),
  cancel: (id: string, jobId: string) => call<{ cancelled: string }>(`/projects/${id}/jobs/${jobId}/cancel`, post()),
  fileUrl: (id: string, path: string) => `/api/projects/${id}/files/${path}`,
  eventsUrl: (id: string, jobId: string) => `/api/projects/${id}/jobs/${jobId}/events`,
};
