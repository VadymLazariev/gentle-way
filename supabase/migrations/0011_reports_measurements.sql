-- Phase 4: extended check-ins, body measurements, weekly reports, progress photo stub.
-- Phase 5 (goals, supplements, analytics) starts at migration 0012.

-- Extend pre-workout check-ins with wellbeing scales (1–5, same as sleep/soreness/fatigue).
alter table session_checkins
  add column if not exists mood smallint check (mood is null or mood between 1 and 5),
  add column if not exists stress smallint check (stress is null or stress between 1 and 5),
  add column if not exists recovery smallint check (recovery is null or recovery between 1 and 5),
  add column if not exists overall_feeling smallint
    check (overall_feeling is null or overall_feeling between 1 and 5);

-- Time-series body measurements per client. Baseline height/weight on profiles is separate.
create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  measured_at date not null default current_date,
  neck_cm numeric(5, 1),
  shoulder_cm numeric(5, 1),
  bicep_left_cm numeric(5, 1),
  bicep_right_cm numeric(5, 1),
  chest_cm numeric(5, 1),
  abdomen_cm numeric(5, 1),
  waist_cm numeric(5, 1),
  hip_cm numeric(5, 1),
  thigh_left_cm numeric(5, 1),
  thigh_right_cm numeric(5, 1),
  weight_kg numeric(5, 1),
  height_cm numeric(5, 1),
  custom_fields jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists body_measurements_client_idx
  on body_measurements (client_id, measured_at desc);

-- End-of-week client report with coach review workflow.
create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'reviewed')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references profiles (id) on delete set null,
  coach_notes text,
  weight_kg numeric(5, 1),
  mood smallint check (mood is null or mood between 1 and 5),
  recovery smallint check (recovery is null or recovery between 1 and 5),
  overall_feeling smallint check (overall_feeling is null or overall_feeling between 1 and 5),
  stress smallint check (stress is null or stress between 1 and 5),
  client_notes text,
  measurements_snapshot jsonb,
  weight_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, week_start)
);

create index if not exists weekly_reports_client_idx
  on weekly_reports (client_id, week_start desc);

-- Progress photo metadata (storage bucket + UI deferred to a later phase).
create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  taken_at date not null default current_date,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists progress_photos_client_idx
  on progress_photos (client_id, taken_at desc);

drop trigger if exists trg_body_measurements_updated on body_measurements;
create trigger trg_body_measurements_updated
before update on body_measurements
for each row execute function set_updated_at();

drop trigger if exists trg_weekly_reports_updated on weekly_reports;
create trigger trg_weekly_reports_updated
before update on weekly_reports
for each row execute function set_updated_at();

alter table body_measurements enable row level security;
alter table weekly_reports enable row level security;
alter table progress_photos enable row level security;

create policy "body_measurements access" on body_measurements
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "weekly_reports access" on weekly_reports
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "progress_photos access" on progress_photos
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

grant insert, update, delete on body_measurements to authenticated;
grant insert, update, delete on weekly_reports to authenticated;
grant insert, update, delete on progress_photos to authenticated;
