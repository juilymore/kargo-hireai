// Single source of truth for tier/verdict colors, shared by the detailed
// view (ScoringDetail) and the at-a-glance view (ScoreGlance) so they never
// drift out of sync.

export const TIER_STYLES: Record<string, string> = {
  "STRONG SHORTLIST": "bg-green-500/10 text-green-300 border border-green-800/40",
  SHORTLIST: "bg-blue-500/10 text-blue-300 border border-blue-800/40",
  HOLD: "bg-amber-500/10 text-amber-300 border border-amber-800/40",
  "DECLINE-ELIGIBLE": "bg-red-500/10 text-red-300 border border-red-800/40",
};

export const VERDICT_STYLES: Record<string, string> = {
  APPROVE: "bg-green-500/10 text-green-300 border border-green-800/40",
  REJECT: "bg-red-500/10 text-red-300 border border-red-800/40",
  REVIEW: "bg-amber-500/10 text-amber-300 border border-amber-800/40",
};

export const FALLBACK_STYLE = "bg-neutral-800 text-neutral-400 border border-neutral-700";

// Solid (non-translucent) variant for the compact score dot/ring in
// ScoreGlance, where a faint background wouldn't read well at small size.
export const TIER_DOT_COLOR: Record<string, string> = {
  "STRONG SHORTLIST": "bg-green-400",
  SHORTLIST: "bg-blue-400",
  HOLD: "bg-amber-400",
  "DECLINE-ELIGIBLE": "bg-red-400",
};
