"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CandidateWithDetails } from "@/lib/types";
import { formatDate } from "@/lib/format-date";
import EmailPreviewModal from "./EmailPreviewModal";
import ScoringDetail from "./ScoringDetail";
import ScoreGlance from "./ScoreGlance";

export default function RejectedRow({ candidate }: { candidate: CandidateWithDetails }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState(false);

  const latestEmail = candidate.emails_log[0];
  const emailSent = latestEmail?.status === "SENT";
  const emailFailed = latestEmail?.status === "FAILED";
  const latestComment = candidate.actions_log.find((a) => a.action === "REJECT")?.comment;

  return (
    <>
      <tr className="border-b border-neutral-800">
        <td className="py-2 pr-3 text-xs text-neutral-500">#{candidate.srno}</td>
        <td className="py-2 pr-3 font-medium text-neutral-100">{candidate.name || "Unnamed"}</td>
        <td className="py-2 pr-3">
          <ScoreGlance results={candidate.scoring_results} />
        </td>
        <td className="py-2 pr-3">
          {candidate.resume_public_url && (
            <a href={candidate.resume_public_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
              Resume
            </a>
          )}
        </td>
        <td className="py-2 pr-3 text-neutral-500">
          {formatDate(candidate.date_added)}
        </td>
        <td className="py-2 pr-3">
          {emailSent ? (
            <span className="text-green-400">Sent</span>
          ) : emailFailed ? (
            <span className="text-red-400">Failed</span>
          ) : (
            <span className="text-neutral-500">Not sent</span>
          )}
        </td>
        <td className="py-2 pr-3 max-w-xs truncate text-neutral-300" title={latestComment}>
          {latestComment}
        </td>
        <td className="py-2 pr-3 whitespace-nowrap">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs font-medium px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors mr-2"
          >
            {expanded ? "Hide" : "View"}
          </button>
          {emailFailed && (
            <button
              onClick={() => setModal(true)}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-red-500/10 text-red-300 border border-red-800/40 hover:bg-red-500/20 transition-colors"
            >
              Resend
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="animate-fade-in">
          <td colSpan={8} className="pb-3">
            <ScoringDetail results={candidate.scoring_results} />
          </td>
        </tr>
      )}
      {modal && (
        <EmailPreviewModal
          candidateId={candidate.id}
          candidateName={candidate.name || "there"}
          candidateEmail={candidate.email}
          emailType="REJECT_NOTICE"
          schedulingLink=""
          factualDetail={candidate.scoring_results[0]?.one_factual_detail ?? null}
          onClose={() => {
            setModal(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
