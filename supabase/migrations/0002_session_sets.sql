-- Live workout sessions and per-set logging (Strong-inspired tracker).
-- Additive migration: the existing session_logs table remains untouched.

-- One live workout: a given week/day training session.
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  week_number smallint references program_weeks (week_number) on delete set null,
  day_code text,
  block_id smallint references blocks (id) on delete set null,
  title text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_sessions_week_day_idx on workout_sessions (week_number, day_code);
create index if not exists workout_sessions_started_idx on workout_sessions (started_at);

-- Ordered sets belonging to a workout. set_type is a plain text column
-- validated by a CHECK constraint (NOT a Postgres enum).
create table if not exists session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions (id) on delete cascade,
  exercise text not null,
  prescription_id bigint references prescriptions (id) on delete set null,
  set_index integer not null,
  set_type text not null default 'normal'
    check (set_type in ('normal', 'warmup', 'drop', 'failure')),
  weight_kg numeric(6, 2),
  reps integer,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_sets_session_idx on session_sets (session_id);
create index if not exists session_sets_exercise_idx on session_sets (exercise);

-- Reuse the set_updated_at() function defined in 0001_init.sql.
drop trigger if exists trg_workout_sessions_updated on workout_sessions;
create trigger trg_workout_sessions_updated
before update on workout_sessions
for each row
execute function set_updated_at();

drop trigger if exists trg_session_sets_updated on session_sets;
create trigger trg_session_sets_updated
before update on session_sets
for each row
execute function set_updated_at();

-- RLS: local single-user app, fully accessible to the anon key.
alter table workout_sessions enable row level security;
alter table session_sets enable row level security;

create policy "read workout_sessions" on workout_sessions for select using (true);
create policy "insert workout_sessions" on workout_sessions for insert with check (true);
create policy "update workout_sessions" on workout_sessions for update using (true) with check (true);
create policy "delete workout_sessions" on workout_sessions for delete using (true);

create policy "read session_sets" on session_sets for select using (true);
create policy "insert session_sets" on session_sets for insert with check (true);
create policy "update session_sets" on session_sets for update using (true) with check (true);
create policy "delete session_sets" on session_sets for delete using (true);

-- Grants: the blanket grant in 0001 only covered tables that existed then.
grant select, insert, update, delete on workout_sessions to anon, authenticated;
grant select, insert, update, delete on session_sets to anon, authenticated;
