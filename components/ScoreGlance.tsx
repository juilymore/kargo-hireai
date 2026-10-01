import type { ScoringResult } from "@/lib/types";
import { TIER_DOT_COLOR } from "@/lib/score-colors";

// Compact, color-coded "glance" view of a candidate's score(s) — meant to
// sit at the top of a card/row so the tier is readable without expanding
// anything. The full breakdown (ScoringDetail) stays available on expand.
export default function ScoreGlance({ results }: { results: ScoringResult[] }) {
  if (results.length === 0) {
    return <span className="text-xs text-neutral-500">Not yet scored</span>;
  }

  return (
    <div className="flex items-center gap-3">
      {results.map((r) => (
        <div key={r.id} className="flex items-center gap-1.5">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              r.needs_manual_review ? "bg-red-400" : TIER_DOT_COLOR[r.tier ?? ""] ?? "bg-neutral-500"
            }`}
          />
          <span className="text-sm font-semibold text-neutral-100">
            {r.role_scored} {r.total_score ?? "—"}
          </span>
          {!r.needs_manual_review && r.tier && (
            <span className="text-xs text-neutral-500">({r.tier})</span>
          )}
        </div>
      ))}
    </div>
  );
}
