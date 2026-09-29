"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CandidateWithDetails } from "@/lib/types";
import EmailPreviewModal from "./EmailPreviewModal";
import ScoringDetail from "./ScoringDetail";

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
          {candidate.resume_public_url && (
            <a href={candidate.resume_public_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
              Resume
            </a>
          )}
        </td>
        <td className="py-2 pr-3 text-neutral-500">
          {new Date(candidate.date_added).toLocaleDateString()}
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
          <button onClick={() => setExpanded((e) => !e)} className="text-neutral-500 hover:text-neutral-200 mr-3">
            {expanded ? "Hide" : "View"}
          </button>
          {emailFailed && (
            <button onClick={() => setModal(true)} className="text-red-400 hover:underline">
              Resend
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="pb-3">
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
          onClose={() => {
            setModal(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
