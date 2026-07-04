-- workout_sessions.week_number is a routing key (built-in or assigned program week).
-- It must not FK to program_weeks: custom templates exceed the 52-week plan, and
-- remote databases may not have seed data in program_weeks at all.
alter table workout_sessions
  drop constraint if exists workout_sessions_week_number_fkey;

-- block_id is optional metadata for the built-in plan; same seed gap on remote.
alter table workout_sessions
  drop constraint if exists workout_sessions_block_id_fkey;
