import { AlertTriangle } from "lucide-react";
import type { ScoringResult } from "@/lib/types";
import { TIER_DOT_COLOR, TIER_STYLES, FALLBACK_STYLE, tierLabel } from "@/lib/score-colors";

// Compact, color-coded "glance" view of a candidate's score(s) — meant to
// sit at the top of a card/row so the tier is readable without expanding
// anything. The full breakdown (ScoringDetail) stays available on expand.
export default function ScoreGlance({ results }: { results: ScoringResult[] }) {
  if (results.length === 0) {
    return <span className="text-xs text-neutral-500">Not yet scored</span>;
  }

  // A single scored role gets its own wider bar instead of a small
  // left-aligned badge with dead space next to it — same information,
  // more legible at a glance.
  if (results.length === 1) {
    const r = results[0];
    return (
      <div
        className={`flex items-center justify-between gap-3 w-full px-3 py-1.5 rounded-lg ${
          r.needs_manual_review ? FALLBACK_STYLE : (TIER_STYLES[r.tier ?? ""] ?? FALLBACK_STYLE)
        }`}
      >
        <span className="text-sm font-semibold">
          {r.role_scored} — {r.total_score ?? "—"}/100
        </span>
        <div className="flex items-center gap-2">
          <LowConfidenceNote confidence={r.confidence} />
          {!r.needs_manual_review && r.tier && <span className="text-xs">{tierLabel(r.tier)}</span>}
        </div>
      </div>
    );
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
            <span className="text-xs text-neutral-500">({tierLabel(r.tier)})</span>
          )}
          <LowConfidenceNote confidence={r.confidence} />
        </div>
      ))}
    </div>
  );
}

// Explains the otherwise-confusing case where a very low score still gets
// a soft verdict: the rubric's Asymmetric Error Policy (Part 7.5) refuses
// to recommend REJECT when its own read of the CV is unreliable — a bad
// score on shaky data gets held for manual review, not auto-declined.
function LowConfidenceNote({ confidence }: { confidence: string | null }) {
  if (confidence !== "LOW") return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-amber-300"
      title="The AI isn't confident in this read of the CV (e.g. date inconsistencies) — a bad score here is held for your review rather than auto-rejected, since the score itself may be unreliable."
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      Low confidence
    </span>
  );
}
