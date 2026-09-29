"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionType, CandidateWithDetails } from "@/lib/types";
import ScoringDetail from "./ScoringDetail";
import EmailPreviewModal from "./EmailPreviewModal";

const VERDICT_STYLES: Record<string, string> = {
  APPROVE: "bg-green-500/10 text-green-300 border border-green-800/40",
  REJECT: "bg-red-500/10 text-red-300 border border-red-800/40",
  REVIEW: "bg-amber-500/10 text-amber-300 border border-amber-800/40",
};

export default function CandidateCard({
  candidate,
  schedulingLink,
  defaultTestEmail = "",
  allowActions = true,
}: {
  candidate: CandidateWithDetails;
  schedulingLink: string;
  defaultTestEmail?: string;
  allowActions?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState<ActionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"APPROVE_INVITE" | "REJECT_NOTICE" | null>(null);

  const primaryResult = candidate.scoring_results[0];
  const overallVerdict = candidate.scoring_results.find((r) => r.verdict)?.verdict;
  const needsReview = candidate.scoring_results.some((r) => r.needs_manual_review);

  async function handleAction(action: ActionType) {
    setError(null);
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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-shadow duration-200 hover:shadow-lg hover:shadow-black/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-neutral-500">#{candidate.srno}</span>
            <h3 className="font-semibold text-neutral-100">{candidate.name || "Unnamed candidate"}</h3>
            {needsReview ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-800/40">
                AI parsing failed — review manually
              </span>
            ) : overallVerdict ? (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${VERDICT_STYLES[overallVerdict]}`}
                title="This is the AI's suggested action, not a decision — only Arjun's Approve/Reject/Hold below is final."
              >
                AI recommends: {overallVerdict}
              </span>
            ) : null}
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
            className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-md bg-neutral-800 text-indigo-300 hover:bg-neutral-700 hover:text-indigo-200 transition-colors whitespace-nowrap"
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

      {primaryResult?.why_ranked_here && (
        <p className="mt-2 text-sm text-neutral-400 italic">{primaryResult.why_ranked_here}</p>
      )}

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-2 text-xs font-medium px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
      >
        {expanded ? "Hide details ▲" : "Show details ▼"}
      </button>

      {expanded && (
        <div className="mt-3 animate-fade-in">
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
          <p className="text-xs font-medium text-neutral-500">Your decision (Arjun)</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comment (optional) — add context for later reference…"
            rows={2}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 text-neutral-100 placeholder-neutral-500 px-2 py-1.5 text-sm"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => handleAction("APPROVE")}
              disabled={submitting !== null}
              className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm font-semibold shadow-md shadow-green-900/30 hover:bg-green-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100"
            >
              {submitting === "APPROVE" ? "…" : "Approve"}
            </button>
            <button
              onClick={() => handleAction("REJECT")}
              disabled={submitting !== null}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-semibold shadow-md shadow-red-900/30 hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100"
            >
              {submitting === "REJECT" ? "…" : "Reject"}
            </button>
            <button
              onClick={() => handleAction("HOLD")}
              disabled={submitting !== null}
              className="px-3 py-1.5 rounded-md bg-amber-500 text-white text-sm font-semibold shadow-md shadow-amber-900/30 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100"
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
          defaultTestEmail={defaultTestEmail}
          emailType={modal}
          schedulingLink={schedulingLink}
          factualDetail={primaryResult?.one_factual_detail ?? null}
          roleScored={primaryResult?.role_scored ?? null}
          onClose={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
