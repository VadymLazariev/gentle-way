-- Per-set RPE logging for live workout sets.
-- Additive migration: reuses the set_updated_at() trigger already attached to
-- session_sets in 0002, and the permissive RLS/grants from 0002.

-- RPE is free numeric entry: values below 1 and above 10 are permitted so the
-- lifter can log anything on the effort scale, guarded only to a sane 0–20 band.
alter table session_sets
  add column if not exists rpe numeric(3, 1)
    check (rpe is null or (rpe >= 0 and rpe <= 20));
