"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoleRequested, RoleScored } from "@/lib/types";

type FileStatus =
  | "pending"
  | "uploading"
  | "scoring"
  | "done"
  | "error";

interface QueuedFile {
  file: File;
  role: RoleRequested;
  status: FileStatus;
  message?: string;
}

export default function UploadForm() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const additions: QueuedFile[] = Array.from(fileList).map((file) => ({
      file,
      role: "BOTH",
      status: "pending",
    }));
    setQueue((prev) => [...prev, ...additions]);
  }

  function updateRole(index: number, role: RoleRequested) {
    setQueue((prev) => prev.map((q, i) => (i === index ? { ...q, role } : q)));
  }

  function removeFile(index: number) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStatus(index: number, status: FileStatus, message?: string) {
    setQueue((prev) => prev.map((q, i) => (i === index ? { ...q, status, message } : q)));
  }

  async function submitAll() {
    setSubmitting(true);
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === "done") continue;
      try {
        updateStatus(i, "uploading");
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("role_requested", item.role);
        const uploadRes = await fetch("/api/upload-cv", { method: "POST", body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          updateStatus(i, "error", uploadJson.error ?? "Upload failed");
          continue;
        }
        const candidate = uploadJson.candidate;
        if (candidate.extraction_error) {
          updateStatus(i, "error", `Parsing failed: ${candidate.extraction_error}`);
          continue;
        }

        const rolesToScore: RoleScored[] =
          item.role === "BOTH" ? ["PM", "SPM"] : [item.role as RoleScored];

        updateStatus(i, "scoring");
        for (const role of rolesToScore) {
          const scoreRes = await fetch("/api/score-candidate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidate_id: candidate.id, role_scored: role }),
          });
          const scoreJson = await scoreRes.json();
          if (!scoreRes.ok) {
            updateStatus(i, "error", scoreJson.error ?? `Scoring failed for ${role}`);
            continue;
          }
        }
        updateStatus(i, "done");
      } catch (err) {
        updateStatus(i, "error", err instanceof Error ? err.message : "Unknown error");
      }
    }
    setSubmitting(false);
  }

  const allDone = queue.length > 0 && queue.every((q) => q.status === "done" || q.status === "error");

  return (
    <div className="space-y-4">
      <label className="block border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center cursor-pointer hover:border-neutral-600">
        <input
          type="file"
          accept=".pdf,.docx"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
          disabled={submitting}
        />
        <span className="text-sm text-neutral-400">
          Click to choose files, or drag and drop PDF/DOCX here
        </span>
      </label>

      <div title="Coming soon">
        <label className="block text-xs font-medium text-neutral-500 mb-1">
          Google Drive link (coming soon)
        </label>
        <input
          type="text"
          disabled
          placeholder="Drive folder or file link"
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-600 cursor-not-allowed"
        />
      </div>

      {queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((item, i) => (
            <li
              key={`${item.file.name}-${i}`}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="flex-1 truncate text-sm text-neutral-200">{item.file.name}</span>
                <select
                  value={item.role}
                  onChange={(e) => updateRole(i, e.target.value as RoleRequested)}
                  disabled={submitting || item.status !== "pending"}
                  className="rounded border border-neutral-700 bg-neutral-800 text-neutral-100 text-sm px-2 py-1"
                >
                  <option value="BOTH">Both</option>
                  <option value="PM">PM</option>
                  <option value="SPM">SPM</option>
                </select>
                <StatusBadge status={item.status} message={item.message} />
                {item.status === "pending" && (
                  <button
                    onClick={() => removeFile(i)}
                    className="text-neutral-500 hover:text-neutral-200 text-sm"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
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
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40"
        >
          {submitting ? "Processing…" : "Upload & Score"}
        </button>
        {allDone && (
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-md border border-neutral-700 text-neutral-200 text-sm font-medium hover:bg-neutral-800"
          >
            Go to Queue
          </button>
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
  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full ${styles[status]}`}
      title={message}
    >
      {labels[status]}
    </span>
  );
}
