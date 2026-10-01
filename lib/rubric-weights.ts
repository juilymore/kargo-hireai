import "server-only";
import { supabaseAdmin } from "./supabase/server";

export interface RubricCriterion {
  id: string;
  code: string;
  section: "JD" | "ARJUN";
  label: string;
  description: string;
  points: number;
  sort_order: number;
  updated_at: string;
}

export async function getRubricCriteria(): Promise<RubricCriterion[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("rubric_criteria")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data;
}

export const JD_TOTAL = 40;
export const ARJUN_TOTAL = 60;

// Builds the block appended after the verbatim rubric text in the Gemini
// system instruction. The rubric.txt file's own weight numbers stay
// unedited (guardrail #8 — the rubric source file is never modified by the
// app); if Arjun has changed weights on the /rubrics page, this override
// block takes precedence over those printed numbers.
export async function buildWeightOverrideBlock(): Promise<string> {
  const criteria = await getRubricCriteria();
  if (criteria.length === 0) return "";

  const lines = criteria.map((c) => `  ${c.code} (${c.label}): ${c.points} points`);
  return `

=== CURRENT WEIGHT OVERRIDE (set by Arjun on the Rubrics page) ===
The rubric text above prints its own weight numbers (e.g. "weight 10 (x 2.0)").
Arjun has since customized those weights. Use ONLY the point values below for
each criterion instead — ignore the printed weight/multiplier numbers above
wherever they conflict with this list. Each criterion is still scored 0-5 as
the rubric describes; convert that 0-5 score to points by multiplying by
(points below / 5), then sum all JD criteria for jd_score (out of ${JD_TOTAL})
and all ARJUN criteria (B1-B8 plus the B9 deduction, floor 0) for arjun_score
(out of ${ARJUN_TOTAL}).

${lines.join("\n")}
=== END WEIGHT OVERRIDE ===`;
}
