-- Judo S&C 52-Week Program schema
-- Single-user local app: reference tables are read-only, session_logs/app_settings are writable.

-- Reference: training blocks (1..5)
create table if not exists blocks (
  id smallint primary key,
  title text not null,
  weeks_label text not null,
  primary_goal text,
  day_a text,
  day_b text,
  day_c text,
  hard_sets_range text
);

-- Reference: per-week programming summary (weeks 1..52)
create table if not exists program_weeks (
  week_number smallint primary key,
  block_id smallint not null references blocks (id) on delete cascade,
  focus text,
  day_a_main text,
  day_b_main text,
  day_c_focus text,
  hard_sets smallint,
  main_rpe numeric(3, 1)
);

create index if not exists program_weeks_block_idx on program_weeks (block_id);

-- Reference: full training prescriptions per week/day/exercise
create table if not exists prescriptions (
  id bigint generated always as identity primary key,
  block_id smallint not null references blocks (id) on delete cascade,
  week_number smallint not null references program_weeks (week_number) on delete cascade,
  day_code text not null,
  day_label text not null,
  exercise text not null,
  prescription text,
  target_rpe text,
  rest text,
  transfer text,
  sort_order smallint not null
);

create index if not exists prescriptions_lookup_idx
  on prescriptions (week_number, day_code, sort_order);

-- Reference: per-block exercise library
create table if not exists exercise_library (
  id bigint generated always as identity primary key,
  block_id smallint not null references blocks (id) on delete cascade,
  day_code text not null,
  day_label text not null,
  exercise text not null,
  default_prescription text,
  rpe text,
  rest text,
  transfer text,
  sort_order smallint not null
);

create index if not exists exercise_library_block_idx on exercise_library (block_id);

-- Reference: per-block progression rules
create table if not exists progression_rules (
  id bigint generated always as identity primary key,
  block_id smallint not null references blocks (id) on delete cascade,
  rule text not null,
  implementation text,
  sort_order smallint not null
);

-- Reference: annual global rules
create table if not exists global_rules (
  id bigint generated always as identity primary key,
  priority smallint,
  rule text not null,
  implementation text
);

-- Reference: weekly calendar rhythm
create table if not exists weekly_calendar (
  id bigint generated always as identity primary key,
  sort_order smallint not null,
  day text not null,
  training text,
  session text,
  intensity_rule text,
  notes text
);

-- User data: logged sets
create table if not exists session_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null default current_date,
  week_number smallint references program_weeks (week_number) on delete set null,
  day_code text,
  exercise text not null,
  prescription_id bigint references prescriptions (id) on delete set null,
  load_kg numeric(6, 2),
  reps_done text,
  actual_rpe numeric(3, 1),
  session_quality text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_logs_week_day_idx on session_logs (week_number, day_code);
create index if not exists session_logs_exercise_idx on session_logs (exercise);
create index if not exists session_logs_date_idx on session_logs (log_date);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_session_logs_updated on session_logs;
create trigger trg_session_logs_updated
before update on session_logs
for each row
execute function set_updated_at();

-- User data: singleton app settings (program anchor date)
create table if not exists app_settings (
  id smallint primary key default 1,
  program_start_date date not null default current_date,
  current_week smallint,
  constraint app_settings_singleton check (id = 1)
);

insert into app_settings (id, program_start_date)
values (1, current_date)
on conflict (id) do nothing;

-- Row Level Security. Local single-user app: reference data is world-readable,
-- user tables are fully accessible to the anon key. Do NOT expose this DB publicly.
alter table blocks enable row level security;
alter table program_weeks enable row level security;
alter table prescriptions enable row level security;
alter table exercise_library enable row level security;
alter table progression_rules enable row level security;
alter table global_rules enable row level security;
alter table weekly_calendar enable row level security;
alter table session_logs enable row level security;
alter table app_settings enable row level security;

create policy "read blocks" on blocks for select using (true);
create policy "read program_weeks" on program_weeks for select using (true);
create policy "read prescriptions" on prescriptions for select using (true);
create policy "read exercise_library" on exercise_library for select using (true);
create policy "read progression_rules" on progression_rules for select using (true);
create policy "read global_rules" on global_rules for select using (true);
create policy "read weekly_calendar" on weekly_calendar for select using (true);

create policy "read session_logs" on session_logs for select using (true);
create policy "insert session_logs" on session_logs for insert with check (true);
create policy "update session_logs" on session_logs for update using (true) with check (true);
create policy "delete session_logs" on session_logs for delete using (true);

create policy "read app_settings" on app_settings for select using (true);
create policy "update app_settings" on app_settings for update using (true) with check (true);
create policy "insert app_settings" on app_settings for insert with check (true);

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on session_logs to anon, authenticated;
grant insert, update, delete on app_settings to anon, authenticated;
