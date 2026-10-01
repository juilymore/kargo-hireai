-- Run this once in the Supabase SQL Editor. Adds an optional structured
-- reason tag to actions_log, alongside the existing free-text comment.
-- Safe to run even if it already exists.

alter table actions_log add column if not exists reason text;
