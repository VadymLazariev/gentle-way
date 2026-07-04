-- Judo sessions, injuries, pre-workout check-ins, and applied adjustments.
-- Additive migration: existing tables are untouched.

-- Judo mat sessions (randori tracking).
create table if not exists judo_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null default current_date,
  week_number smallint references program_weeks (week_number) on delete set null,
  duration_minutes integer not null default 90,
  standing_randori_rounds integer not null default 0,
  ground_randori_rounds integer not null default 0,
  intensity_rpe numeric(3, 1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists judo_sessions_date_idx on judo_sessions (session_date);

-- Tracked injuries. body_area / severity / status are plain text columns
-- validated by CHECK constraints (NOT Postgres enums).
create table if not exists injuries (
  id uuid primary key default gen_random_uuid(),
  body_area text not null
    check (body_area in (
      'shoulder', 'elbow', 'wrist_grip', 'fingers', 'neck',
      'lower_back', 'hip_groin', 'knee', 'ankle', 'other'
    )),
  severity text not null default 'mild'
    check (severity in ('mild', 'moderate', 'severe')),
  status text not null default 'active'
    check (status in ('active', 'improving', 'resolved')),
  noted_at date not null default current_date,
  resolved_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists injuries_status_idx on injuries (status);

-- Pre-workout readiness check-ins.
create table if not exists session_checkins (
  id uuid primary key default gen_random_uuid(),
  sleep_quality smallint check (sleep_quality is null or sleep_quality between 1 and 5),
  soreness smallint check (soreness is null or soreness between 1 and 5),
  fatigue smallint check (fatigue is null or fatigue between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

-- Snapshot of injuries reported at a given check-in.
create table if not exists checkin_injuries (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references session_checkins (id) on delete cascade,
  injury_id uuid not null references injuries (id) on delete cascade,
  severity_at_time text not null
    check (severity_at_time in ('mild', 'moderate', 'severe'))
);

create index if not exists checkin_injuries_checkin_idx on checkin_injuries (checkin_id);

-- Program adjustments applied to a workout as a result of a check-in.
create table if not exists session_adjustments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions (id) on delete cascade,
  prescription_id bigint references prescriptions (id) on delete set null,
  exercise text not null,
  action text not null check (action in ('cap_rpe', 'swap', 'skip')),
  substitute_exercise text,
  rpe_cap numeric(3, 1),
  reason text
);

create index if not exists session_adjustments_session_idx on session_adjustments (session_id);

-- Link a workout back to the check-in that produced it.
alter table workout_sessions
  add column if not exists checkin_id uuid references session_checkins (id) on delete set null;

-- Reuse set_updated_at() from 0001_init.sql.
drop trigger if exists trg_judo_sessions_updated on judo_sessions;
create trigger trg_judo_sessions_updated
before update on judo_sessions
for each row
execute function set_updated_at();

drop trigger if exists trg_injuries_updated on injuries;
create trigger trg_injuries_updated
before update on injuries
for each row
execute function set_updated_at();

-- RLS: local single-user app, fully accessible to the anon key.
alter table judo_sessions enable row level security;
alter table injuries enable row level security;
alter table session_checkins enable row level security;
alter table checkin_injuries enable row level security;
alter table session_adjustments enable row level security;

create policy "read judo_sessions" on judo_sessions for select using (true);
create policy "insert judo_sessions" on judo_sessions for insert with check (true);
create policy "update judo_sessions" on judo_sessions for update using (true) with check (true);
create policy "delete judo_sessions" on judo_sessions for delete using (true);

create policy "read injuries" on injuries for select using (true);
create policy "insert injuries" on injuries for insert with check (true);
create policy "update injuries" on injuries for update using (true) with check (true);
create policy "delete injuries" on injuries for delete using (true);

create policy "read session_checkins" on session_checkins for select using (true);
create policy "insert session_checkins" on session_checkins for insert with check (true);
create policy "update session_checkins" on session_checkins for update using (true) with check (true);
create policy "delete session_checkins" on session_checkins for delete using (true);

create policy "read checkin_injuries" on checkin_injuries for select using (true);
create policy "insert checkin_injuries" on checkin_injuries for insert with check (true);
create policy "update checkin_injuries" on checkin_injuries for update using (true) with check (true);
create policy "delete checkin_injuries" on checkin_injuries for delete using (true);

create policy "read session_adjustments" on session_adjustments for select using (true);
create policy "insert session_adjustments" on session_adjustments for insert with check (true);
create policy "update session_adjustments" on session_adjustments for update using (true) with check (true);
create policy "delete session_adjustments" on session_adjustments for delete using (true);

grant select, insert, update, delete on judo_sessions to anon, authenticated;
grant select, insert, update, delete on injuries to anon, authenticated;
grant select, insert, update, delete on session_checkins to anon, authenticated;
grant select, insert, update, delete on checkin_injuries to anon, authenticated;
grant select, insert, update, delete on session_adjustments to anon, authenticated;
