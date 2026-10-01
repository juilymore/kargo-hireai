import "server-only";
import { supabaseAdmin } from "./supabase/server";
import type {
  Candidate,
  CandidateStatus,
  CandidateWithDetails,
  RoleScored,
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

// Shared join logic: given raw candidate rows, attach their scoring
// results, actions, emails, interview and hire records.
async function attachDetails(candidates: Candidate[]): Promise<CandidateWithDetails[]> {
  if (candidates.length === 0) return [];
  const supabase = supabaseAdmin();
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
  return attachDetails(candidates);
}

export async function getCandidatesByIds(ids: string[]): Promise<CandidateWithDetails[]> {
  if (ids.length === 0) return [];
  const supabase = supabaseAdmin();
  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("*")
    .in("id", ids)
    .order("date_added", { ascending: false });

  if (error || !candidates) return [];
  return attachDetails(candidates);
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
  const [withDetails] = await attachDetails([candidate]);
  return withDetails;
}

// ── EMAIL HISTORY ────────────────────────────────────────────────────────

export interface EmailHistoryRow {
  id: string;
  candidate_id: string;
  candidate_name: string | null;
  candidate_status: CandidateStatus;
  candidate_srno: number;
  email_type: "APPROVE_INVITE" | "REJECT_NOTICE";
  status: "DRAFTED" | "SENT" | "FAILED";
  sent_at: string | null;
  created_at: string;
}

export async function getEmailHistory(): Promise<EmailHistoryRow[]> {
  const supabase = supabaseAdmin();
  const { data: emails, error } = await supabase
    .from("emails_log")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !emails || emails.length === 0) return [];

  const candidateIds = [...new Set(emails.map((e) => e.candidate_id))];
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, status, srno")
    .in("id", candidateIds);
  const byId = new Map((candidates ?? []).map((c) => [c.id, c]));

  return emails.map((e) => {
    const candidate = byId.get(e.candidate_id);
    return {
      id: e.id,
      candidate_id: e.candidate_id,
      candidate_name: candidate?.name ?? null,
      candidate_status: (candidate?.status as CandidateStatus) ?? "NEW",
      candidate_srno: candidate?.srno ?? 0,
      email_type: e.email_type,
      status: e.status,
      sent_at: e.sent_at,
      created_at: e.created_at,
    };
  });
}

// ── DASHBOARD ────────────────────────────────────────────────────────────

export interface DashboardFilters {
  from?: string; // ISO date, inclusive
  to?: string; // ISO date, inclusive
  role: RoleScored | "BOTH";
}

export interface DashboardData {
  counts: {
    queue: number;
    approved: number;
    interviewScheduled: number;
    hired: number;
    rejected: number;
    hold: number;
    totalChecked: number;
  };
  topQueue: CandidateWithDetails[];
  topInterviewScheduled: CandidateWithDetails[];
}

function bestScoreFor(candidate: CandidateWithDetails, role: RoleScored | "BOTH"): number {
  const results = candidate.scoring_results.filter((r) => r.total_score != null);
  if (results.length === 0) return -1;
  if (role !== "BOTH") {
    return results.find((r) => r.role_scored === role)?.total_score ?? -1;
  }
  return Math.max(...results.map((r) => r.total_score as number));
}

export async function getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  const supabase = supabaseAdmin();

  // Narrow to candidates scored against the selected role, when filtered.
  let roleFilteredIds: Set<string> | null = null;
  if (filters.role !== "BOTH") {
    const { data } = await supabase
      .from("scoring_results")
      .select("candidate_id")
      .eq("role_scored", filters.role);
    roleFilteredIds = new Set((data ?? []).map((r) => r.candidate_id));
    if (roleFilteredIds.size === 0) {
      return {
        counts: {
          queue: 0,
          approved: 0,
          interviewScheduled: 0,
          hired: 0,
          rejected: 0,
          hold: 0,
          totalChecked: 0,
        },
        topQueue: [],
        topInterviewScheduled: [],
      };
    }
  }

  let query = supabase.from("candidates").select("*");
  if (filters.from) query = query.gte("date_added", filters.from);
  if (filters.to) query = query.lte("date_added", `${filters.to}T23:59:59.999Z`);

  const { data: rawCandidates, error } = await query;
  if (error || !rawCandidates) {
    return {
      counts: { queue: 0, approved: 0, interviewScheduled: 0, hired: 0, rejected: 0, hold: 0, totalChecked: 0 },
      topQueue: [],
      topInterviewScheduled: [],
    };
  }

  const filtered = roleFilteredIds
    ? rawCandidates.filter((c) => roleFilteredIds!.has(c.id))
    : rawCandidates;

  const withDetails = await attachDetails(filtered);

  const queueCandidates = withDetails.filter((c) => c.status === "NEW");
  const approvedCandidates = withDetails.filter((c) => c.status === "APPROVED");
  const interviewScheduledCandidates = approvedCandidates.filter(
    (c) => c.interview?.interview_status === "SCHEDULED"
  );

  const counts = {
    queue: queueCandidates.length,
    approved: approvedCandidates.length,
    interviewScheduled: interviewScheduledCandidates.length,
    hired: withDetails.filter((c) => c.status === "HIRED").length,
    rejected: withDetails.filter((c) => c.status === "REJECTED").length,
    hold: withDetails.filter((c) => c.status === "HOLD").length,
    totalChecked: withDetails.length,
  };

  const topQueue = [...queueCandidates]
    .sort((a, b) => bestScoreFor(b, filters.role) - bestScoreFor(a, filters.role))
    .slice(0, 3);

  const topInterviewScheduled = [...interviewScheduledCandidates]
    .sort(
      (a, b) =>
        new Date(b.interview?.updated_at ?? 0).getTime() -
        new Date(a.interview?.updated_at ?? 0).getTime()
    )
    .slice(0, 3);

  return { counts, topQueue, topInterviewScheduled };
}
