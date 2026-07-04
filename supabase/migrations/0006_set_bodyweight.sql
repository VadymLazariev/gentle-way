-- Bodyweight sets for the live tracker.
-- Additive migration: reuses the set_updated_at() trigger already attached to
-- session_sets in 0002, and the permissive RLS/grants from 0002.
--
-- A bodyweight set is reps-based (no external load required). weight_kg, when
-- present on a bodyweight set, represents added load (e.g. a dip belt).

alter table session_sets
  add column if not exists is_bodyweight boolean not null default false;
