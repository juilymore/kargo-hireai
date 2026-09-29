"use client";

import { useState } from "react";
import type { CandidateWithDetails } from "@/lib/types";
import ScoringDetail from "./ScoringDetail";

export default function HiredRow({ candidate }: { candidate: CandidateWithDetails }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-neutral-800 align-top">
        <td className="py-2 pr-3 text-xs text-neutral-500">#{candidate.srno}</td>
        <td className="py-2 pr-3 font-medium text-neutral-100">{candidate.name || "Unnamed"}</td>
        <td className="py-2 pr-3 text-neutral-300">{candidate.hire?.role_hired_for}</td>
        <td className="py-2 pr-3 text-neutral-500">
          {new Date(candidate.date_added).toLocaleDateString()}
        </td>
        <td className="py-2 pr-3 text-neutral-500">
          {candidate.hire ? new Date(candidate.hire.hired_at).toLocaleDateString() : "—"}
        </td>
        <td className="py-2 pr-3">
          <button onClick={() => setExpanded((e) => !e)} className="text-neutral-500 hover:text-neutral-200">
            {expanded ? "Hide history" : "Full history"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="pb-4 space-y-3">
            <ScoringDetail results={candidate.scoring_results} />
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">Actions log</p>
              <ul className="text-sm space-y-1">
                {candidate.actions_log.map((a) => (
                  <li key={a.id} className="text-neutral-400">
                    <span className="font-medium text-neutral-200">{a.action}</span> — {a.comment}{" "}
                    <span className="text-xs text-neutral-500">
                      ({new Date(a.created_at).toLocaleDateString()})
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
