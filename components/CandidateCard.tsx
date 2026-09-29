"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionType, CandidateWithDetails } from "@/lib/types";
import ScoringDetail from "./ScoringDetail";
import EmailPreviewModal from "./EmailPreviewModal";

const VERDICT_STYLES: Record<string, string> = {
  APPROVE: "bg-green-500/15 text-green-300",
  REJECT: "bg-red-500/15 text-red-300",
  REVIEW: "bg-amber-500/15 text-amber-300",
};

export default function CandidateCard({
  candidate,
  schedulingLink,
  allowActions = true,
}: {
  candidate: CandidateWithDetails;
  schedulingLink: string;
  allowActions?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState<ActionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"APPROVE_INVITE" | "REJECT_NOTICE" | null>(null);

  const overallVerdict = candidate.scoring_results.find((r) => r.verdict)?.verdict;

  async function handleAction(action: ActionType) {
    setError(null);
    if (!comment.trim()) {
      setError("A comment is required before you can Approve, Reject or Hold.");
      return;
    }
    setSubmitting(action);
    const res = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: candidate.id,
        action,
        comment,
        created_by: "Arjun",
      }),
    });
    const json = await res.json();
    setSubmitting(null);
    if (!res.ok) {
      setError(json.error ?? "Action failed");
      return;
    }
    setComment("");
    if (action === "APPROVE") setModal("APPROVE_INVITE");
    else if (action === "REJECT") setModal("REJECT_NOTICE");
    else router.refresh();
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-neutral-500">#{candidate.srno}</span>
            <h3 className="font-semibold text-neutral-100">{candidate.name || "Unnamed candidate"}</h3>
            {overallVerdict && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${VERDICT_STYLES[overallVerdict]}`}
              >
                HireAI: {overallVerdict}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Added {new Date(candidate.date_added).toLocaleDateString()} · Requested{" "}
            {candidate.role_requested}
            {candidate.role_recommended ? ` · Recommended ${candidate.role_recommended}` : ""}
          </p>
        </div>
        {candidate.resume_public_url && (
          <a
            href={candidate.resume_public_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-indigo-400 hover:underline whitespace-nowrap"
          >
            View resume
          </a>
        )}
      </div>

      <div className="mt-3 flex gap-4 text-sm text-neutral-300">
        {candidate.scoring_results.map((r) => (
          <span key={r.id}>
            {r.role_scored}: <b className="text-neutral-100">{r.total_score ?? "—"}</b>/100
            {r.tier ? ` (${r.tier})` : ""}
          </span>
        ))}
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-2 text-sm text-neutral-500 hover:text-neutral-200"
      >
        {expanded ? "Hide details ▲" : "Show details ▼"}
      </button>

      {expanded && (
        <div className="mt-3">
          <ScoringDetail results={candidate.scoring_results} />
        </div>
      )}

      {candidate.actions_log.length > 0 && (
        <div className="mt-3 text-xs text-neutral-500">
          Last note: “{candidate.actions_log[0].comment}”
        </div>
      )}

      {allowActions && (
        <div className="mt-3 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comment (required before Approve / Reject / Hold)…"
            rows={2}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 text-neutral-100 placeholder-neutral-500 px-2 py-1.5 text-sm"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => handleAction("APPROVE")}
              disabled={submitting !== null}
              className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm font-semibold disabled:opacity-40"
            >
              {submitting === "APPROVE" ? "…" : "Approve"}
            </button>
            <button
              onClick={() => handleAction("REJECT")}
              disabled={submitting !== null}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-semibold disabled:opacity-40"
            >
              {submitting === "REJECT" ? "…" : "Reject"}
            </button>
            <button
              onClick={() => handleAction("HOLD")}
              disabled={submitting !== null}
              className="px-3 py-1.5 rounded-md bg-amber-500 text-white text-sm font-semibold disabled:opacity-40"
            >
              {submitting === "HOLD" ? "…" : "Hold"}
            </button>
          </div>
        </div>
      )}

      {modal && (
        <EmailPreviewModal
          candidateId={candidate.id}
          candidateName={candidate.name || "there"}
          candidateEmail={candidate.email}
          emailType={modal}
          schedulingLink={schedulingLink}
          onClose={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
