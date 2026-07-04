-- Custom program tracking: per-week template sessions and workout provenance.

alter table template_sessions
  add column if not exists week_number smallint check (week_number is null or week_number between 1 and 52);

alter table workout_sessions
  add column if not exists template_id uuid references program_templates (id) on delete set null,
  add column if not exists mesocycle_id uuid references mesocycles (id) on delete set null,
  add column if not exists template_week smallint;

alter table session_sets
  add column if not exists template_session_id uuid references template_sessions (id) on delete set null;

create index if not exists template_sessions_meso_week_day_idx
  on template_sessions (mesocycle_id, week_number, day_code);

create index if not exists workout_sessions_client_template_idx
  on workout_sessions (client_id, template_id, template_week, day_code);
