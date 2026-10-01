-- Run this once in the Supabase SQL Editor. Adds the editable rubric-weight
-- table used by the new /rubrics page. Safe to run even if some of it
-- already exists (uses IF NOT EXISTS / ON CONFLICT).

create table if not exists rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,              -- e.g. 'A1', 'B9'
  section text not null check (section in ('JD', 'ARJUN')),
  label text not null,                    -- short name, e.g. "Relevant experience & years"
  description text not null default '',   -- editable descriptive text shown under the label
  points numeric not null,                -- editable weight, "points out of 100"
  sort_order int not null,
  updated_at timestamptz not null default now()
);

-- Seed from Part 6 (SCORING QUICK TABLE) of the rubric. JD rows sum to 40,
-- ARJUN rows B1-B8 sum to 60, B9 is a deduction bucket (max -10), not part
-- of that sum.
insert into rubric_criteria (code, section, label, description, points, sort_order) values
  ('A1', 'JD', 'Relevant experience & years', 'Right years, right product type, ownership of a product area end to end.', 10, 1),
  ('A2', 'JD', 'Depth of projects', 'Full chain: problem -> decision -> build -> outcome -> learning, including hard trade-offs.', 8, 2),
  ('A3', 'JD', 'Evidence quality', 'Best metric tier that appears repeatedly: outcomes and peer-relative proof beat activity counts.', 8, 3),
  ('A4', 'JD', 'Role-specific JD must-haves', 'Shipped in short cycles, killed/stopped something, built structure where none existed, discovery with users.', 6, 4),
  ('A5', 'JD', 'Kargo problem-space match', 'Built or owned product in Kargo''s actual pillars/surfaces (shipment tracking, documentation, carrier systems).', 4, 5),
  ('A6', 'JD', 'Education', 'Relevant degree or equivalent professional path. Prestige moves this by at most 1 point.', 2, 6),
  ('A7', 'JD', 'Certifications', 'Domain practitioner certifications count most; generic PM/marketing certs count least.', 2, 7),
  ('B1', 'ARJUN', 'Ops immersion & crossover', 'Hands-on inside freight/CHA/port/3PL ops, then crossed to the software or tech-adoption side.', 14, 8),
  ('B2', 'ARJUN', 'Unprompted builder, voluntary adoption', 'Built something nobody asked for that others adopted without a mandate, and it outlived the moment.', 13, 9),
  ('B3', 'ARJUN', 'Ownership without a safety net', 'No layer above/between them, handled a live crisis personally, scope bigger than title.', 10, 10),
  ('B4', 'ARJUN', 'Decision evidence & honesty about failure', 'Named a call made against stated demand or a stakeholder, with the reason and what changed after.', 8, 11),
  ('B5', 'ARJUN', 'Field-to-system translation & customer-protective instinct', 'Closed a gap between what operators do and what the system assumes; bullets benefit the end user.', 5, 12),
  ('B6', 'ARJUN', 'Resourcefulness under constraint', 'Absorbed volume or scope with no added headcount/budget through process redesign.', 4, 13),
  ('B7', 'ARJUN', 'Unstructured-environment fit', 'Early-stage, small company, or explicitly built the first version of something in an org.', 3, 14),
  ('B8', 'ARJUN', 'Operator voice & third-party proof', 'Plain conviction statements plus validation from others (award, promotion, quoted feedback). Tiebreaker-grade.', 3, 15),
  ('B9', 'ARJUN', 'Anti-signals (deductions)', 'Credential stacking without depth, process-only achievements, zero failure/kill/loss across 4+ years, etc. Max -10.', -10, 16)
on conflict (code) do nothing;
