-- HireAI schema
-- No RLS in v1 (trusted internal tool, no auth yet), but every table below
-- uses clean FKs and no denormalized PII duplication so RLS + auth can be
-- bolted on later without a migration rewrite.

create extension if not exists "pgcrypto";

-- ── ENUMS ──────────────────────────────────────────────────────────────────

create type role_requested_enum as enum ('PM', 'SPM', 'BOTH');
create type role_scored_enum as enum ('PM', 'SPM');
create type candidate_status_enum as enum ('NEW', 'APPROVED', 'REJECTED', 'HOLD', 'HIRED');
create type tier_enum as enum ('STRONG SHORTLIST', 'SHORTLIST', 'HOLD', 'DECLINE-ELIGIBLE');
create type verdict_enum as enum ('APPROVE', 'REJECT', 'REVIEW');
create type action_enum as enum ('APPROVE', 'REJECT', 'HOLD');
create type email_type_enum as enum ('APPROVE_INVITE', 'REJECT_NOTICE');
create type email_status_enum as enum ('DRAFTED', 'SENT', 'FAILED');
create type interview_status_enum as enum ('NOT_SCHEDULED', 'SCHEDULED', 'DONE');

-- ── CANDIDATES ─────────────────────────────────────────────────────────────

create table candidates (
  id uuid primary key default gen_random_uuid(),
  srno serial not null,
  name text,
  email text,
  phone text,
  resume_file_path text,
  resume_public_url text,
  extracted_text text,
  extraction_error text,
  role_requested role_requested_enum not null default 'BOTH',
  role_recommended text,
  date_added timestamptz not null default now(),
  status candidate_status_enum not null default 'NEW',
  status_updated_at timestamptz not null default now()
);

create index candidates_status_idx on candidates (status);
create index candidates_date_added_idx on candidates (date_added desc);

-- ── SCORING RESULTS ──────────────────────────────────────────────────────
-- One row per (candidate, role scored). A BOTH candidate gets a PM row and
-- an SPM row. Scores are never merged/averaged across roles (guardrail #7).
-- Idempotent scoring (guardrail #5): re-scoring appends a new row rather
-- than overwriting; the latest row per (candidate_id, role_scored) is the
-- one shown by default, history stays queryable.

create table scoring_results (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  role_scored role_scored_enum not null,
  jd_score numeric,
  arjun_score numeric,
  total_score numeric,
  tier tier_enum,
  jd_notes text,
  arjun_notes text,
  risk_notes text,
  verdict verdict_enum,
  confidence text,
  flags jsonb not null default '[]'::jsonb,
  closest_past_hire text,
  why_ranked_here text,
  probe_questions jsonb not null default '[]'::jsonb,
  decline_reason_if_any text,
  needs_manual_review boolean not null default false,
  raw_llm_response jsonb,
  created_at timestamptz not null default now()
);

create index scoring_results_candidate_idx on scoring_results (candidate_id, role_scored, created_at desc);

-- ── ACTIONS LOG ──────────────────────────────────────────────────────────
-- Append-only audit trail. Never updated or deleted.

create table actions_log (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  action action_enum not null,
  comment text not null check (char_length(trim(comment)) > 0),
  created_at timestamptz not null default now(),
  created_by text
);

create index actions_log_candidate_idx on actions_log (candidate_id, created_at desc);

-- ── EMAILS LOG ───────────────────────────────────────────────────────────

create table emails_log (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  email_type email_type_enum not null,
  subject text not null,
  body text not null,
  status email_status_enum not null default 'DRAFTED',
  resend_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index emails_log_candidate_idx on emails_log (candidate_id, created_at desc);

-- ── INTERVIEWS ───────────────────────────────────────────────────────────

create table interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references candidates(id) on delete cascade,
  interview_status interview_status_enum not null default 'NOT_SCHEDULED',
  interview_notes text,
  updated_at timestamptz not null default now()
);

-- ── HIRES ────────────────────────────────────────────────────────────────

create table hires (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references candidates(id) on delete cascade,
  role_hired_for role_scored_enum not null,
  hired_at timestamptz not null default now()
);

-- ── STORAGE ──────────────────────────────────────────────────────────────
-- Create the bucket for uploaded CV files. Public read is convenient for the
-- "resume link" column in v1 (no auth); switch to signed URLs when auth
-- lands.

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;
