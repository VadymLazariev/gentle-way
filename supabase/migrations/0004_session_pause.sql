-- Pause/resume support for live workout sessions.
-- Additive migration: reuses the set_updated_at() trigger already attached to
-- workout_sessions in 0002, and the permissive RLS/grants from 0002.

alter table workout_sessions
  add column if not exists paused_at timestamptz,
  add column if not exists paused_seconds integer not null default 0;
