"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CandidateWithDetails, InterviewStatus, RoleScored } from "@/lib/types";
import ScoringDetail from "./ScoringDetail";

function defaultRoleHiredFor(candidate: CandidateWithDetails): RoleScored {
  if (candidate.role_recommended?.startsWith("SPM")) return "SPM";
  if (candidate.role_recommended?.startsWith("PM")) return "PM";
  return candidate.scoring_results[0]?.role_scored ?? "PM";
}

export default function ApprovedRow({ candidate }: { candidate: CandidateWithDetails }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(candidate.interview?.interview_notes ?? "");
  const [status, setStatus] = useState<InterviewStatus>(
    candidate.interview?.interview_status ?? "NOT_SCHEDULED"
  );
  const [roleHiredFor, setRoleHiredFor] = useState<RoleScored>(defaultRoleHiredFor(candidate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailSent = candidate.emails_log.some((e) => e.status === "SENT");
  const brief = [candidate.scoring_results[0]?.jd_notes, candidate.scoring_results[0]?.arjun_notes]
    .filter(Boolean)
    .join(" ");
  const probes = candidate.scoring_results.flatMap((r) => r.probe_questions).slice(0, 3);

  async function updateInterview(update: { interview_status?: InterviewStatus; interview_notes?: string }) {
    await fetch(`/api/interview/${candidate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    router.refresh();
  }

  async function convert(override: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/convert-to-hired", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: candidate.id, role_hired_for: roleHiredFor, override }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to convert");
      return;
    }
    router.refresh();
  }

  function handleConvertClick() {
    if (status !== "DONE") {
      if (confirm("Interview isn't marked Done. Convert to Hired anyway?")) {
        convert(true);
      }
      return;
    }
    convert(false);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">#{candidate.srno}</span>
            <h3 className="font-semibold">{candidate.name || "Unnamed candidate"}</h3>
          </div>
          <p className="text-xs text-neutral-500">
            Added {new Date(candidate.date_added).toLocaleDateString()} ·{" "}
            {emailSent ? "Email sent" : "Email not sent"}
          </p>
        </div>
        {candidate.resume_public_url && (
          <a href={candidate.resume_public_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
            Resume
          </a>
        )}
      </div>

      {brief && <p className="text-sm text-neutral-700">{brief}</p>}

      {probes.length > 0 && (
        <ul className="text-sm list-disc list-inside text-neutral-600">
          {probes.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <label className="text-xs font-medium text-neutral-500">
          Interview:{" "}
          <select
            value={status}
            onChange={(e) => {
              const value = e.target.value as InterviewStatus;
              setStatus(value);
              updateInterview({ interview_status: value });
            }}
            className="ml-1 rounded border border-neutral-300 px-2 py-1 text-sm font-normal"
          >
            <option value="NOT_SCHEDULED">Not Scheduled</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="DONE">Done</option>
          </select>
        </label>

        <select
          value={roleHiredFor}
          onChange={(e) => setRoleHiredFor(e.target.value as RoleScored)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="PM">PM</option>
          <option value="SPM">SPM</option>
        </select>

        <button
          onClick={handleConvertClick}
          disabled={busy}
          className="px-3 py-1.5 rounded-md bg-neutral-900 text-white text-sm font-semibold disabled:opacity-40"
        >
          Convert to Hired
        </button>

        <button onClick={() => setExpanded((e) => !e)} className="text-sm text-neutral-500 hover:text-neutral-800">
          {expanded ? "Hide full summary ▲" : "View full summary ▼"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => updateInterview({ interview_notes: notes })}
        placeholder="Interview notes (autosaves on blur)…"
        rows={2}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />

      {expanded && <ScoringDetail results={candidate.scoring_results} />}
    </div>
  );
}
