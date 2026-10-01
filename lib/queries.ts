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

// Fetches a candidate plus its scoring/actions/emails/interview/hire rows
// in a single PostgREST request (nested resource embedding), instead of
// one query for the candidate followed by 5 more for its related tables.
// interviews/hires are aliased to the singular keys CandidateWithDetails
// expects — PostgREST embeds them as a single object (not an array)
// because candidate_id is UNIQUE on both tables.
const CANDIDATE_WITH_DETAILS_SELECT =
  "*, scoring_results(*), actions_log(*), emails_log(*), interview:interviews(*), hire:hires(*)";

function byCreatedAtDesc(a: { created_at: string }, b: { created_at: string }): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function shapeCandidate(row: Record<string, unknown>): CandidateWithDetails {
  const { scoring_results, actions_log, emails_log, interview, hire, ...candidate } = row;
  return {
    ...(candidate as unknown as Candidate),
    scoring_results: latestPerRole((scoring_results as ScoringResult[] | null) ?? []),
    actions_log: ((actions_log as CandidateWithDetails["actions_log"]) ?? [])
      .slice()
      .sort(byCreatedAtDesc),
    emails_log: ((emails_log as CandidateWithDetails["emails_log"]) ?? [])
      .slice()
      .sort(byCreatedAtDesc),
    interview: (interview as CandidateWithDetails["interview"]) ?? null,
    hire: (hire as CandidateWithDetails["hire"]) ?? null,
  };
}

export async function getCandidatesByStatus(
  status: CandidateStatus
): Promise<CandidateWithDetails[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("candidates")
    .select(CANDIDATE_WITH_DETAILS_SELECT)
    .eq("status", status)
    .order("date_added", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => shapeCandidate(row as Record<string, unknown>));
}

export async function getCandidatesByIds(ids: string[]): Promise<CandidateWithDetails[]> {
  if (ids.length === 0) return [];
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("candidates")
    .select(CANDIDATE_WITH_DETAILS_SELECT)
    .in("id", ids)
    .order("date_added", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => shapeCandidate(row as Record<string, unknown>));
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
  const { data, error } = await supabase
    .from("candidates")
    .select(CANDIDATE_WITH_DETAILS_SELECT)
    .eq("id", candidateId)
    .single();

  if (error || !data) return null;
  return shapeCandidate(data as Record<string, unknown>);
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

// ── ACTIVITY LOG ─────────────────────────────────────────────────────────

export interface ActivityLogRow {
  id: string;
  candidate_id: string;
  candidate_name: string | null;
  candidate_status: CandidateStatus;
  candidate_srno: number;
  action: "APPROVE" | "REJECT" | "HOLD";
  comment: string;
  created_by: string | null;
  created_at: string;
}

export async function getActivityLog(): Promise<ActivityLogRow[]> {
  const supabase = supabaseAdmin();
  const { data: actions, error } = await supabase
    .from("actions_log")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !actions || actions.length === 0) return [];

  const candidateIds = [...new Set(actions.map((a) => a.candidate_id))];
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, status, srno")
    .in("id", candidateIds);
  const byId = new Map((candidates ?? []).map((c) => [c.id, c]));

  return actions.map((a) => {
    const candidate = byId.get(a.candidate_id);
    return {
      id: a.id,
      candidate_id: a.candidate_id,
      candidate_name: candidate?.name ?? null,
      candidate_status: (candidate?.status as CandidateStatus) ?? "NEW",
      candidate_srno: candidate?.srno ?? 0,
      action: a.action,
      comment: a.comment,
      created_by: a.created_by,
      created_at: a.created_at,
    };
  });
}

// ── WEEKLY SUMMARY ───────────────────────────────────────────────────────

export interface WeekSummary {
  rangeLabel: string;
  totalDecisions: number;
  approved: number;
  rejected: number;
  held: number;
  candidatesAdded: number;
  sentence: string;
}

async function summarizeWeek(fromIso: string, toIsoExclusive: string, label: string): Promise<WeekSummary> {
  const supabase = supabaseAdmin();
  const [{ data: actions }, { data: candidates }] = await Promise.all([
    supabase
      .from("actions_log")
      .select("action")
      .gte("created_at", fromIso)
      .lt("created_at", toIsoExclusive),
    supabase
      .from("candidates")
      .select("id")
      .gte("date_added", fromIso)
      .lt("date_added", toIsoExclusive),
  ]);

  const approved = (actions ?? []).filter((a) => a.action === "APPROVE").length;
  const rejected = (actions ?? []).filter((a) => a.action === "REJECT").length;
  const held = (actions ?? []).filter((a) => a.action === "HOLD").length;
  const totalDecisions = approved + rejected + held;
  const candidatesAdded = (candidates ?? []).length;

  let sentence: string;
  if (totalDecisions === 0 && candidatesAdded === 0) {
    sentence = `No activity recorded for ${label.toLowerCase()}.`;
  } else {
    const parts: string[] = [];
    if (candidatesAdded > 0) {
      parts.push(`${candidatesAdded} new candidate${candidatesAdded === 1 ? "" : "s"} added`);
    }
    if (totalDecisions > 0) {
      const decisionParts: string[] = [];
      if (approved > 0) decisionParts.push(`${approved} approved`);
      if (rejected > 0) decisionParts.push(`${rejected} rejected`);
      if (held > 0) decisionParts.push(`${held} held`);
      parts.push(`${totalDecisions} decision${totalDecisions === 1 ? "" : "s"} made (${decisionParts.join(", ")})`);
    } else {
      parts.push("no decisions made yet");
    }
    sentence = `${parts.join(" · ")}.`;
  }

  return { rangeLabel: label, totalDecisions, approved, rejected, held, candidatesAdded, sentence };
}

export async function getWeeklySummaries(): Promise<{ thisWeek: WeekSummary; lastWeek: WeekSummary }> {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(thisMonday.getDate() - diffToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  const [thisWeek, lastWeek] = await Promise.all([
    summarizeWeek(thisMonday.toISOString(), nextMonday.toISOString(), "This week"),
    summarizeWeek(lastMonday.toISOString(), thisMonday.toISOString(), "Last week"),
  ]);

  return { thisWeek, lastWeek };
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

  let query = supabase.from("candidates").select(CANDIDATE_WITH_DETAILS_SELECT);
  if (filters.from) query = query.gte("date_added", filters.from);
  if (filters.to) query = query.lte("date_added", `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error || !data) {
    return {
      counts: { queue: 0, approved: 0, interviewScheduled: 0, hired: 0, rejected: 0, hold: 0, totalChecked: 0 },
      topQueue: [],
      topInterviewScheduled: [],
    };
  }

  const allDetails = data.map((row) => shapeCandidate(row as Record<string, unknown>));
  // Narrow to candidates scored against the selected role, when filtered —
  // done in JS now that scoring_results already rode along on the same
  // request, instead of a separate query to pre-compute candidate ids.
  const withDetails =
    filters.role === "BOTH"
      ? allDetails
      : allDetails.filter((c) => c.scoring_results.some((r) => r.role_scored === filters.role));

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
