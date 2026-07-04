-- Phase 5: goals, supplements, supplement logs.

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  created_by uuid references profiles (id) on delete set null,
  goal_type text not null
    check (goal_type in ('weight', 'lift', 'measurement', 'attendance')),
  title text not null,
  target_value numeric(10, 2),
  target_unit text,
  exercise_name text,
  measurement_field text,
  direction text check (direction is null or direction in ('increase', 'decrease', 'reach')),
  target_count integer check (target_count is null or target_count > 0),
  period text check (period is null or period in ('week', 'month', 'total')),
  deadline date,
  status text not null default 'active'
    check (status in ('active', 'achieved', 'abandoned')),
  achieved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_client_idx on goals (client_id, status, created_at desc);

create table if not exists supplements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  created_by uuid references profiles (id) on delete set null,
  name text not null,
  dosage text,
  frequency text,
  schedule_days smallint[] not null default array[0, 1, 2, 3, 4, 5, 6],
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplements_client_idx on supplements (client_id, is_active);

create table if not exists supplement_logs (
  id uuid primary key default gen_random_uuid(),
  supplement_id uuid not null references supplements (id) on delete cascade,
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  logged_on date not null default current_date,
  taken boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (supplement_id, logged_on)
);

create index if not exists supplement_logs_client_idx
  on supplement_logs (client_id, logged_on desc);

drop trigger if exists trg_goals_updated on goals;
create trigger trg_goals_updated
before update on goals
for each row execute function set_updated_at();

drop trigger if exists trg_supplements_updated on supplements;
create trigger trg_supplements_updated
before update on supplements
for each row execute function set_updated_at();

alter table goals enable row level security;
alter table supplements enable row level security;
alter table supplement_logs enable row level security;

create policy "goals access" on goals
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "supplements access" on supplements
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "supplement_logs access" on supplement_logs
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

grant insert, update, delete on goals to authenticated;
grant insert, update, delete on supplements to authenticated;
grant insert, update, delete on supplement_logs to authenticated;
