"use client";

import { useRef, useState } from "react";
import type { RoleRequested, RoleScored } from "@/lib/types";

type FileStatus =
  | "pending"
  | "uploading"
  | "scoring"
  | "done"
  | "error";

type QueueSource = { type: "file"; file: File } | { type: "link"; url: string };

interface QueuedItem {
  source: QueueSource;
  role: RoleRequested;
  status: FileStatus;
  message?: string;
  progress: number;
}

function displayName(source: QueueSource): string {
  return source.type === "file" ? source.file.name : source.url;
}

// Caps per phase — progress animates toward the cap for that phase and
// jumps to 100 on completion. We don't have real server-side progress
// events, so this is a deliberate approximation, not a lie about exact
// completion percentage.
const PHASE_CAP: Record<FileStatus, number> = {
  pending: 0,
  uploading: 35,
  scoring: 95,
  done: 100,
  error: 100,
};

export default function UploadForm() {
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState("");
  const progressTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const additions: QueuedItem[] = Array.from(fileList).map((file) => ({
      source: { type: "file", file },
      role: "BOTH",
      status: "pending",
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...additions]);
  }

  function addDriveLink() {
    const url = driveLinkInput.trim();
    if (!url) return;
    setQueue((prev) => [
      ...prev,
      { source: { type: "link", url }, role: "BOTH", status: "pending", progress: 0 },
    ]);
    setDriveLinkInput("");
  }

  function updateRole(index: number, role: RoleRequested) {
    setQueue((prev) => prev.map((q, i) => (i === index ? { ...q, role } : q)));
  }

  function removeFile(index: number) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStatus(index: number, status: FileStatus, message?: string) {
    const existingTimer = progressTimers.current.get(index);
    if (existingTimer) clearInterval(existingTimer);

    if (status === "done" || status === "error") {
      setQueue((prev) => prev.map((q, i) => (i === index ? { ...q, status, message, progress: 100 } : q)));
      return;
    }

    setQueue((prev) => prev.map((q, i) => (i === index ? { ...q, status, message } : q)));
    const cap = PHASE_CAP[status];
    const timer = setInterval(() => {
      setQueue((prev) =>
        prev.map((q, i) =>
          i === index && q.progress < cap ? { ...q, progress: Math.min(q.progress + 2, cap) } : q
        )
      );
    }, 120);
    progressTimers.current.set(index, timer);
  }

  // fetch's res.json() throws an unhelpful "Unexpected end of JSON input"
  // when the server crashed/timed out and returned an empty or non-JSON
  // body. Reading as text first lets us surface the actual HTTP status and
  // response body instead, so failures are diagnosable from the UI.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function parseJsonResponse(res: Response): Promise<any> {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `Server returned an invalid response (HTTP ${res.status}): ${text.slice(0, 200) || "(empty body)"}`
      );
    }
  }

  // Best-effort cleanup: if this fails too, the candidate is just left for
  // manual cleanup rather than compounding the original error for the user.
  async function deleteCandidate(candidateId: string) {
    try {
      await fetch(`/api/candidate/${candidateId}`, { method: "DELETE" });
    } catch {
      // ignore
    }
  }

  async function processItem(i: number) {
    const item = queue[i];
    if (item.status === "done") return;
    try {
      updateStatus(i, "uploading");

      let uploadRes: Response;
      if (item.source.type === "file") {
        const formData = new FormData();
        formData.append("file", item.source.file);
        formData.append("role_requested", item.role);
        uploadRes = await fetch("/api/upload-cv", { method: "POST", body: formData });
      } else {
        uploadRes = await fetch("/api/upload-cv-from-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drive_url: item.source.url, role_requested: item.role }),
        });
      }

      const uploadJson = await parseJsonResponse(uploadRes);
      if (!uploadRes.ok) {
        updateStatus(i, "error", uploadJson.error ?? "Upload failed");
        return;
      }
      const candidate = uploadJson.candidate;
      if (candidate.extraction_error) {
        updateStatus(i, "error", `Parsing failed: ${candidate.extraction_error}`);
        await deleteCandidate(candidate.id);
        return;
      }

      const rolesToScore: RoleScored[] =
        item.role === "BOTH" ? ["PM", "SPM"] : [item.role as RoleScored];

      updateStatus(i, "scoring");
      // PM and SPM scoring are fully independent (guardrail #7 — never
      // merged), so for a "Both" candidate there's no reason to wait for
      // one before starting the other. Running them concurrently roughly
      // halves wall-clock time for the default case without changing
      // what either call does.
      let scoringFailed = false;
      const scoreResults = await Promise.all(
        rolesToScore.map(async (role) => {
          const scoreRes = await fetch("/api/score-candidate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidate_id: candidate.id, role_scored: role }),
          });
          const scoreJson = await parseJsonResponse(scoreRes);
          return { role, scoreRes, scoreJson };
        })
      );
      for (const { role, scoreRes, scoreJson } of scoreResults) {
        if (!scoreRes.ok) {
          // Don't fail the whole item — a BOTH candidate should still get
          // whichever role succeeded. But remember the failure so it
          // isn't overwritten with "done" below once the loop finishes.
          updateStatus(i, "error", scoreJson.error ?? `Scoring failed for ${role}`);
          scoringFailed = true;
        }
      }
      if (!scoringFailed) {
        updateStatus(i, "done");
      } else if (scoreResults.every(({ scoreRes }) => !scoreRes.ok)) {
        // Every role failed — nothing useful was saved, so don't leave an
        // unscored "Unnamed candidate" behind in the Queue.
        await deleteCandidate(candidate.id);
      }
    } catch (err) {
      updateStatus(i, "error", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function submitAll() {
    setSubmitting(true);
    // Different files are completely independent of each other, so there's
    // no reason to finish uploading+scoring one before starting the next —
    // that was adding up to N-times the real wait for a batch of N resumes,
    // the single biggest remaining chunk of "non-Gemini" time in the whole
    // flow. Each item's own status/progress is already keyed by index, so
    // this is purely a scheduling change, nothing about what happens to any
    // one file is different.
    await Promise.all(queue.map((_, i) => processItem(i)));
    setSubmitting(false);
  }

  const allDone = queue.length > 0 && queue.every((q) => q.status === "done" || q.status === "error");

  return (
    <div className="space-y-4">
      <label className="group relative flex flex-col items-center gap-2 border-2 border-dashed border-neutral-600 rounded-xl p-8 text-center cursor-pointer bg-gradient-to-b from-neutral-800/80 to-neutral-800/40 hover:border-indigo-500 hover:from-neutral-800 hover:to-neutral-800/60 hover:shadow-lg hover:shadow-indigo-900/20 transition-all duration-200">
        <input
          type="file"
          accept=".pdf,.docx"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
          disabled={submitting}
        />
        <svg
          className="w-9 h-9 text-neutral-500 group-hover:text-indigo-400 group-hover:-translate-y-0.5 transition-all duration-200"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0L7 9m5-5l5 5M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"
          />
        </svg>
        <span className="text-sm font-medium text-neutral-200">
          Click to choose files, or drag and drop PDF/DOCX here
        </span>
        <span className="text-xs text-neutral-500">You can select multiple files at once</span>
      </label>

      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">
          Or paste a Google Drive link to a single resume (PDF/DOCX, shared as &quot;Anyone with
          the link can view&quot;)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={driveLinkInput}
            onChange={(e) => setDriveLinkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDriveLink();
              }
            }}
            placeholder="https://drive.google.com/file/d/..."
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600"
          />
          <button
            onClick={addDriveLink}
            disabled={!driveLinkInput.trim()}
            className="px-3 py-2 rounded-md bg-neutral-800 text-neutral-200 text-sm font-medium hover:bg-neutral-700 transition-colors disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="flex items-center gap-3 px-3 text-xs font-medium text-neutral-500">
          <span className="flex-1">File</span>
          <span className="w-32">Score against</span>
          <span className="w-20">Status</span>
        </div>
      )}

      {queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((item, i) => (
            <li
              key={`${displayName(item.source)}-${i}`}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 transition-colors duration-200 hover:border-neutral-700"
            >
              <div className="flex items-center gap-3">
                <span className="flex-1 truncate text-sm text-neutral-200" title={displayName(item.source)}>
                  {item.source.type === "link" && (
                    <span className="text-xs text-indigo-300 mr-1">[Drive]</span>
                  )}
                  {displayName(item.source)}
                </span>
                <select
                  value={item.role}
                  onChange={(e) => updateRole(i, e.target.value as RoleRequested)}
                  disabled={submitting || item.status !== "pending"}
                  aria-label="Role to score against"
                  className="w-32 rounded border border-neutral-700 bg-neutral-800 text-neutral-100 text-sm px-2 py-1"
                >
                  <option value="BOTH">Both (PM + SPM)</option>
                  <option value="PM">PM only</option>
                  <option value="SPM">SPM only</option>
                </select>
                <StatusBadge status={item.status} message={item.message} />
                {(item.status === "pending" || item.status === "error") && (
                  <button
                    onClick={() => removeFile(i)}
                    disabled={submitting}
                    className="text-neutral-500 hover:text-neutral-200 text-sm disabled:opacity-40"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
              {(item.status === "uploading" || item.status === "scoring") && (
                <div className="mt-2 h-1 w-full rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-150 ease-linear"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.status === "error" && item.message && (
                <p className="mt-1 text-xs text-red-400">{item.message}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={submitAll}
          disabled={queue.length === 0 || submitting || allDone}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold shadow-md shadow-indigo-900/40 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100"
        >
          {submitting ? "Processing…" : "Upload & Score"}
        </button>
        {allDone && (
          // A plain <a> instead of client-side router.push: this button only
          // ever appears after a multi-step async flow, and a full navigation
          // is a more reliable way to land on the Queue than trusting the
          // router's client state at that point.
          <a
            href="/queue"
            className="px-4 py-2 rounded-md border border-neutral-700 text-neutral-200 text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Go to Queue
          </a>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, message }: { status: FileStatus; message?: string }) {
  const styles: Record<FileStatus, string> = {
    pending: "bg-neutral-800 text-neutral-400",
    uploading: "bg-blue-500/15 text-blue-300",
    scoring: "bg-amber-500/15 text-amber-300",
    done: "bg-green-500/15 text-green-300",
    error: "bg-red-500/15 text-red-300",
  };
  const labels: Record<FileStatus, string> = {
    pending: "Ready",
    uploading: "Uploading…",
    scoring: "Scoring…",
    done: "Done",
    error: "Error",
  };
  const isBusy = status === "uploading" || status === "scoring";
  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full ${styles[status]} ${isBusy ? "animate-pulse" : ""}`}
      title={message}
    >
      {labels[status]}
    </span>
  );
}
