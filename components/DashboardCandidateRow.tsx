import Link from "next/link";
import { FileText } from "lucide-react";
import type { CandidateWithDetails } from "@/lib/types";
import { TAB_FOR_STATUS } from "@/lib/status-tabs";
import ScoreGlance from "./ScoreGlance";

export default function DashboardCandidateRow({ candidate }: { candidate: CandidateWithDetails }) {
  return (
    <Link
      href={TAB_FOR_STATUS[candidate.status]}
      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 hover:border-neutral-700 hover:bg-neutral-900 transition-colors duration-150"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-100 truncate">
          {candidate.name || "Unnamed candidate"}
        </p>
        <p className="text-xs text-neutral-500">
          Added {new Date(candidate.date_added).toLocaleDateString()}
        </p>
      </div>
      <div className="flex-1 max-w-xs">
        <ScoreGlance results={candidate.scoring_results} />
      </div>
      {candidate.resume_public_url && (
        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-neutral-800 text-indigo-300">
          <FileText className="w-3.5 h-3.5" />
          Resume
        </span>
      )}
    </Link>
  );
}
