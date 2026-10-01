import Link from "next/link";
import type { CandidateWithDetails } from "@/lib/types";
import ScoreGlance from "./ScoreGlance";

export default function DashboardCandidateRow({ candidate }: { candidate: CandidateWithDetails }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-100 truncate">
          {candidate.name || "Unnamed candidate"}
        </p>
        <p className="text-xs text-neutral-500">
          Added {new Date(candidate.date_added).toLocaleDateString()}
        </p>
      </div>
      <ScoreGlance results={candidate.scoring_results} />
      {candidate.resume_public_url && (
        <Link
          href={candidate.resume_public_url}
          target="_blank"
          className="shrink-0 text-xs font-medium px-2 py-1 rounded-md bg-neutral-800 text-indigo-300 hover:bg-neutral-700 transition-colors"
        >
          Resume
        </Link>
      )}
    </div>
  );
}
