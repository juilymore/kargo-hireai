"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  Mail,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { CandidateWithDetails, InterviewStatus, RoleScored } from "@/lib/types";
import ScoringDetail from "./ScoringDetail";
import ScoreGlance from "./ScoreGlance";

function defaultRoleHiredFor(candidate: CandidateWithDetails): RoleScored {
  if (candidate.role_recommended?.startsWith("SPM")) return "SPM";
  if (candidate.role_recommended?.startsWith("PM")) return "PM";
  return candidate.scoring_results[0]?.role_scored ?? "PM";
}

const INTERVIEW_STYLE: Record<InterviewStatus, { border: string; badge: string; icon: typeof Calendar; label: string }> = {
  NOT_SCHEDULED: {
    border: "border-l-neutral-600",
    badge: "bg-neutral-800 text-neutral-400",
    icon: Calendar,
    label: "Not Scheduled",
  },
  SCHEDULED: {
    border: "border-l-blue-500",
    badge: "bg-blue-500/10 text-blue-300 border border-blue-800/40",
    icon: CalendarClock,
    label: "Interview Scheduled",
  },
  DONE: {
    border: "border-l-green-500",
    badge: "bg-green-500/10 text-green-300 border border-green-800/40",
    icon: CalendarCheck,
    label: "Interview Done",
  },
};

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
  const style = INTERVIEW_STYLE[status];
  const StatusIcon = style.icon;

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
    <div
      className={`rounded-lg border border-neutral-800 border-l-4 ${style.border} bg-neutral-900 p-4 space-y-2`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-neutral-500">#{candidate.srno}</span>
            <h3 className="font-semibold text-neutral-100">{candidate.name || "Unnamed candidate"}</h3>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {style.label}
            </span>
          </div>
          <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
            Added {new Date(candidate.date_added).toLocaleDateString()} ·
            <Mail className="w-3 h-3" />
            {emailSent ? "Email sent" : "Email not sent"}
          </p>
        </div>
        {candidate.resume_public_url && (
          <a
            href={candidate.resume_public_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-neutral-800 text-indigo-300 hover:bg-neutral-700 hover:text-indigo-200 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Resume
          </a>
        )}
      </div>

      <ScoreGlance results={candidate.scoring_results} />

      {brief && <p className="text-sm text-neutral-300">{brief}</p>}

      {probes.length > 0 && (
        <ul className="text-sm list-disc list-inside text-neutral-400">
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
            className="ml-1 rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1 text-sm font-normal"
          >
            <option value="NOT_SCHEDULED">Not Scheduled</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="DONE">Done</option>
          </select>
        </label>

        <select
          value={roleHiredFor}
          onChange={(e) => setRoleHiredFor(e.target.value as RoleScored)}
          className="rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1 text-sm"
        >
          <option value="PM">PM</option>
          <option value="SPM">SPM</option>
        </select>

        <button
          onClick={handleConvertClick}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40"
        >
          <CheckCircle2 className="w-4 h-4" />
          Convert to Hired
        </button>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-200"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? "Hide full summary" : "View full summary"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => updateInterview({ interview_notes: notes })}
        placeholder="Interview notes (autosaves on blur)…"
        rows={2}
        className="w-full rounded-md border border-neutral-700 bg-neutral-800 text-neutral-100 placeholder-neutral-500 px-2 py-1.5 text-sm"
      />

      {expanded && <ScoringDetail results={candidate.scoring_results} />}
    </div>
  );
}
