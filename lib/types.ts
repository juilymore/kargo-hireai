export type RoleRequested = "PM" | "SPM" | "BOTH";
export type RoleScored = "PM" | "SPM";
export type CandidateStatus = "NEW" | "APPROVED" | "REJECTED" | "HOLD" | "HIRED";
export type Tier = "STRONG SHORTLIST" | "SHORTLIST" | "HOLD" | "DECLINE-ELIGIBLE";
export type Verdict = "APPROVE" | "REJECT" | "REVIEW";
export type ActionType = "APPROVE" | "REJECT" | "HOLD";
export type EmailType = "APPROVE_INVITE" | "REJECT_NOTICE";
export type EmailStatus = "DRAFTED" | "SENT" | "FAILED";
export type InterviewStatus = "NOT_SCHEDULED" | "SCHEDULED" | "DONE";

export interface Candidate {
  id: string;
  srno: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  resume_file_path: string | null;
  resume_public_url: string | null;
  extracted_text: string | null;
  extraction_error: string | null;
  role_requested: RoleRequested;
  role_recommended: string | null;
  date_added: string;
  status: CandidateStatus;
  status_updated_at: string;
}

export interface ScoringResult {
  id: string;
  candidate_id: string;
  role_scored: RoleScored;
  jd_score: number | null;
  arjun_score: number | null;
  total_score: number | null;
  tier: Tier | null;
  jd_notes: string | null;
  arjun_notes: string | null;
  risk_notes: string | null;
  verdict: Verdict | null;
  confidence: string | null;
  flags: string[];
  closest_past_hire: string | null;
  why_ranked_here: string | null;
  probe_questions: string[];
  decline_reason_if_any: string | null;
  needs_manual_review: boolean;
  raw_llm_response: unknown;
  created_at: string;
}

export interface ActionLogEntry {
  id: string;
  candidate_id: string;
  action: ActionType;
  comment: string;
  created_at: string;
  created_by: string | null;
}

export interface EmailLogEntry {
  id: string;
  candidate_id: string;
  email_type: EmailType;
  subject: string;
  body: string;
  status: EmailStatus;
  resend_message_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Interview {
  id: string;
  candidate_id: string;
  interview_status: InterviewStatus;
  interview_notes: string | null;
  updated_at: string;
}

export interface Hire {
  id: string;
  candidate_id: string;
  role_hired_for: RoleScored;
  hired_at: string;
}

// Structured JSON contract Gemini must return per Section 4 of the build spec.
export interface GeminiScoringResponse {
  name: string;
  email: string;
  phone: string;
  role_scored: RoleScored;
  jd_score: number;
  arjun_score: number;
  total_score: number;
  tier: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  flags: string[];
  jd_summary: string;
  arjun_summary: string;
  risk_summary: string;
  verdict: Verdict;
  closest_past_hire: string;
  why_ranked_here: string;
  probe_questions: string[];
  decline_reason_if_any: string;
}

export interface CandidateWithDetails extends Candidate {
  scoring_results: ScoringResult[];
  actions_log: ActionLogEntry[];
  emails_log: EmailLogEntry[];
  interview: Interview | null;
  hire: Hire | null;
}
