import type { ScoringResult } from "@/lib/types";
import { TIER_STYLES, VERDICT_STYLES, FALLBACK_STYLE } from "@/lib/score-colors";

export default function ScoringDetail({ results }: { results: ScoringResult[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-neutral-400">Not yet scored.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {results.map((r) => (
        <div key={r.id} className="rounded-md border border-neutral-800 bg-neutral-950/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-neutral-100">{r.role_scored}</span>
            {r.needs_manual_review ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-300">
                AI parsing failed — review manually
              </span>
            ) : (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIER_STYLES[r.tier ?? ""] ?? FALLBACK_STYLE}`}
              >
                {r.tier ?? "—"}
              </span>
            )}
          </div>

          {!r.needs_manual_review && (
            <>
              <div className="flex gap-3 text-sm text-neutral-300">
                <span>
                  JD <b className="text-neutral-100">{r.jd_score}</b>/40
                </span>
                <span>
                  Arjun <b className="text-neutral-100">{r.arjun_score}</b>/60
                </span>
                <span>
                  Total <b className="text-neutral-100">{r.total_score}</b>/100
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${VERDICT_STYLES[r.verdict ?? ""] ?? FALLBACK_STYLE}`}
                >
                  {r.verdict ?? "—"}
                </span>
              </div>

              {r.confidence && (
                <p className="text-xs text-neutral-500">Confidence: {r.confidence}</p>
              )}

              {r.flags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {r.flags.map((f, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}

              <Detail label="What matches the JD" text={r.jd_notes} />
              <Detail label="What matches Arjun's instinct pattern" text={r.arjun_notes} />
              <Detail label="What feels off / okay-okay" text={r.risk_notes} />
              <Detail label="Closest past hire" text={r.closest_past_hire} />
              <Detail label="Why ranked here" text={r.why_ranked_here} />

              {r.probe_questions?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-0.5">
                    Probe questions
                  </p>
                  <ul className="text-sm list-disc list-inside space-y-0.5">
                    {r.probe_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {r.decline_reason_if_any && (
                <Detail label="If declined — factual reason" text={r.decline_reason_if_any} />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Detail({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 mb-0.5">{label}</p>
      <p className="text-sm text-neutral-300">{text}</p>
    </div>
  );
}
