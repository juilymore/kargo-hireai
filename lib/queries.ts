import "server-only";
import { supabaseAdmin } from "./supabase/server";
import type {
  CandidateStatus,
  CandidateWithDetails,
  ScoringResult,
} from "./types";

// one_factual_detail isn't its own DB column — it rides inside the stored
// raw_llm_response JSON, so pull it out here rather than making every UI
// component parse that blob itself.
function withFactualDetail(result: ScoringResult): ScoringResult {
  const raw = result.raw_llm_response as Record<string, unknown> | null;
  const detail = raw && typeof raw.one_factual_detail === "string" ? raw.one_factual_detail : null;
  return { ...result, one_factual_detail: detail };
}

// Keeps only the latest scoring_results row per role_scored (idempotent
// scoring, guardrail #5 — history stays in the table, just not shown here).
function latestPerRole(results: ScoringResult[]): ScoringResult[] {
  const byRole = new Map<string, ScoringResult>();
  for (const r of results) {
    const existing = byRole.get(r.role_scored);
    if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
      byRole.set(r.role_scored, r);
    }
  }
  return Array.from(byRole.values()).map(withFactualDetail);
}

export async function getCandidatesByStatus(
  status: CandidateStatus
): Promise<CandidateWithDetails[]> {
  const supabase = supabaseAdmin();

  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("status", status)
    .order("date_added", { ascending: false });

  if (error || !candidates) return [];
  if (candidates.length === 0) return [];

  const ids = candidates.map((c) => c.id);

  const [scoringRes, actionsRes, emailsRes, interviewsRes, hiresRes] = await Promise.all([
    supabase.from("scoring_results").select("*").in("candidate_id", ids).order("created_at", { ascending: false }),
    supabase.from("actions_log").select("*").in("candidate_id", ids).order("created_at", { ascending: false }),
    supabase.from("emails_log").select("*").in("candidate_id", ids).order("created_at", { ascending: false }),
    supabase.from("interviews").select("*").in("candidate_id", ids),
    supabase.from("hires").select("*").in("candidate_id", ids),
  ]);

  const byCandidate = <T extends { candidate_id: string }>(rows: T[] | null): Map<string, T[]> => {
    const map = new Map<string, T[]>();
    for (const row of rows ?? []) {
      const list = map.get(row.candidate_id) ?? [];
      list.push(row);
      map.set(row.candidate_id, list);
    }
    return map;
  };

  const scoringByCandidate = byCandidate(scoringRes.data as ScoringResult[] | null);
  const actionsByCandidate = byCandidate(actionsRes.data);
  const emailsByCandidate = byCandidate(emailsRes.data);
  const interviewByCandidate = new Map((interviewsRes.data ?? []).map((i) => [i.candidate_id, i]));
  const hireByCandidate = new Map((hiresRes.data ?? []).map((h) => [h.candidate_id, h]));

  return candidates.map((c) => ({
    ...c,
    scoring_results: latestPerRole(scoringByCandidate.get(c.id) ?? []),
    actions_log: actionsByCandidate.get(c.id) ?? [],
    emails_log: emailsByCandidate.get(c.id) ?? [],
    interview: interviewByCandidate.get(c.id) ?? null,
    hire: hireByCandidate.get(c.id) ?? null,
  }));
}

export async function getStatusCounts(): Promise<Record<CandidateStatus, number>> {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("candidates").select("status");
  const counts: Record<CandidateStatus, number> = {
    NEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    HOLD: 0,
    HIRED: 0,
  };
  for (const row of data ?? []) {
    counts[row.status as CandidateStatus] += 1;
  }
  return counts;
}

export async function getCandidateWithDetails(
  candidateId: string
): Promise<CandidateWithDetails | null> {
  const supabase = supabaseAdmin();
  const { data: candidate, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (error || !candidate) return null;

  const [scoringRes, actionsRes, emailsRes, interviewRes, hireRes] = await Promise.all([
    supabase
      .from("scoring_results")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false }),
    supabase
      .from("actions_log")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false }),
    supabase
      .from("emails_log")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false }),
    supabase.from("interviews").select("*").eq("candidate_id", candidateId).maybeSingle(),
    supabase.from("hires").select("*").eq("candidate_id", candidateId).maybeSingle(),
  ]);

  return {
    ...candidate,
    scoring_results: latestPerRole((scoringRes.data as ScoringResult[]) ?? []),
    actions_log: actionsRes.data ?? [],
    emails_log: emailsRes.data ?? [],
    interview: interviewRes.data ?? null,
    hire: hireRes.data ?? null,
  };
}
