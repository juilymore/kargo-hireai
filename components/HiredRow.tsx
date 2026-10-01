"use client";

import { useState } from "react";
import type { CandidateWithDetails } from "@/lib/types";
import { formatDate } from "@/lib/format-date";
import ScoringDetail from "./ScoringDetail";
import ScoreGlance from "./ScoreGlance";

export default function HiredRow({ candidate }: { candidate: CandidateWithDetails }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-neutral-800 align-top">
        <td className="py-2 pr-3 text-xs text-neutral-500">#{candidate.srno}</td>
        <td className="py-2 pr-3 font-medium text-neutral-100">{candidate.name || "Unnamed"}</td>
        <td className="py-2 pr-3">
          <ScoreGlance results={candidate.scoring_results} />
        </td>
        <td className="py-2 pr-3 text-neutral-300">{candidate.hire?.role_hired_for}</td>
        <td className="py-2 pr-3 text-neutral-500">
          {formatDate(candidate.date_added)}
        </td>
        <td className="py-2 pr-3 text-neutral-500">
          {candidate.hire ? formatDate(candidate.hire.hired_at) : "—"}
        </td>
        <td className="py-2 pr-3">
          <button onClick={() => setExpanded((e) => !e)} className="text-neutral-500 hover:text-neutral-200">
            {expanded ? "Hide history" : "Full history"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="pb-4 space-y-3">
            <ScoringDetail results={candidate.scoring_results} />
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">Actions log</p>
              <ul className="text-sm space-y-1">
                {candidate.actions_log.map((a) => (
                  <li key={a.id} className="text-neutral-400">
                    <span className="font-medium text-neutral-200">{a.action}</span> — {a.comment}{" "}
                    <span className="text-xs text-neutral-500">
                      ({formatDate(a.created_at)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {candidate.interview?.interview_notes && (
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Interview notes</p>
                <p className="text-sm text-neutral-300">{candidate.interview.interview_notes}</p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
