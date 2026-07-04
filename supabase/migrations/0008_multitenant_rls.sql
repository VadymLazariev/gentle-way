-- Multi-tenant scoping: every user-data table gains an owning client_id, the
-- app_settings singleton becomes per-client client_settings, and all
-- permissive `using (true)` policies are replaced with client-owner + coach
-- access. Child tables inherit scope through their parent FK.
--
-- db:reset wipes data, so this is a clean cut with no backfill: client_id is
-- added NOT NULL with a default of auth.uid(), so a client's own inserts are
-- attributed automatically while a coach can pass an explicit client_id.

-- Owning client on the top-level user-data tables.
alter table workout_sessions
  add column if not exists client_id uuid not null default auth.uid()
    references profiles (id) on delete cascade;
alter table judo_sessions
  add column if not exists client_id uuid not null default auth.uid()
    references profiles (id) on delete cascade;
alter table injuries
  add column if not exists client_id uuid not null default auth.uid()
    references profiles (id) on delete cascade;
alter table session_checkins
  add column if not exists client_id uuid not null default auth.uid()
    references profiles (id) on delete cascade;
alter table session_logs
  add column if not exists client_id uuid not null default auth.uid()
    references profiles (id) on delete cascade;

create index if not exists workout_sessions_client_idx on workout_sessions (client_id);
create index if not exists judo_sessions_client_idx on judo_sessions (client_id);
create index if not exists injuries_client_idx on injuries (client_id);
create index if not exists session_checkins_client_idx on session_checkins (client_id);
create index if not exists session_logs_client_idx on session_logs (client_id);

-- Replace the app_settings singleton with per-client settings.
drop table if exists app_settings;

create table if not exists client_settings (
  client_id uuid primary key references profiles (id) on delete cascade,
  program_start_date date not null default current_date,
  current_week smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_client_settings_updated on client_settings;
create trigger trg_client_settings_updated
before update on client_settings
for each row
execute function set_updated_at();

-- Drop every permissive policy from the single-user era.
drop policy if exists "read session_logs" on session_logs;
drop policy if exists "insert session_logs" on session_logs;
drop policy if exists "update session_logs" on session_logs;
drop policy if exists "delete session_logs" on session_logs;

drop policy if exists "read workout_sessions" on workout_sessions;
drop policy if exists "insert workout_sessions" on workout_sessions;
drop policy if exists "update workout_sessions" on workout_sessions;
drop policy if exists "delete workout_sessions" on workout_sessions;

drop policy if exists "read session_sets" on session_sets;
drop policy if exists "insert session_sets" on session_sets;
drop policy if exists "update session_sets" on session_sets;
drop policy if exists "delete session_sets" on session_sets;

drop policy if exists "read judo_sessions" on judo_sessions;
drop policy if exists "insert judo_sessions" on judo_sessions;
drop policy if exists "update judo_sessions" on judo_sessions;
drop policy if exists "delete judo_sessions" on judo_sessions;

drop policy if exists "read injuries" on injuries;
drop policy if exists "insert injuries" on injuries;
drop policy if exists "update injuries" on injuries;
drop policy if exists "delete injuries" on injuries;

drop policy if exists "read session_checkins" on session_checkins;
drop policy if exists "insert session_checkins" on session_checkins;
drop policy if exists "update session_checkins" on session_checkins;
drop policy if exists "delete session_checkins" on session_checkins;

drop policy if exists "read checkin_injuries" on checkin_injuries;
drop policy if exists "insert checkin_injuries" on checkin_injuries;
drop policy if exists "update checkin_injuries" on checkin_injuries;
drop policy if exists "delete checkin_injuries" on checkin_injuries;

drop policy if exists "read session_adjustments" on session_adjustments;
drop policy if exists "insert session_adjustments" on session_adjustments;
drop policy if exists "update session_adjustments" on session_adjustments;
drop policy if exists "delete session_adjustments" on session_adjustments;

-- Client-owned tables: the client owns their rows, a coach may read and write
-- rows for any client they are linked to.
create policy "workout_sessions access" on workout_sessions
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "judo_sessions access" on judo_sessions
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "injuries access" on injuries
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "session_checkins access" on session_checkins
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "session_logs access" on session_logs
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "client_settings access" on client_settings
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

-- Child tables inherit scope from their parent's owning client.
create policy "session_sets access" on session_sets
  for all
  using (
    exists (
      select 1 from workout_sessions ws
      where ws.id = session_sets.session_id
        and (ws.client_id = auth.uid() or is_coach_of(ws.client_id))
    )
  )
  with check (
    exists (
      select 1 from workout_sessions ws
      where ws.id = session_sets.session_id
        and (ws.client_id = auth.uid() or is_coach_of(ws.client_id))
    )
  );

create policy "session_adjustments access" on session_adjustments
  for all
  using (
    exists (
      select 1 from workout_sessions ws
      where ws.id = session_adjustments.session_id
        and (ws.client_id = auth.uid() or is_coach_of(ws.client_id))
    )
  )
  with check (
    exists (
      select 1 from workout_sessions ws
      where ws.id = session_adjustments.session_id
        and (ws.client_id = auth.uid() or is_coach_of(ws.client_id))
    )
  );

create policy "checkin_injuries access" on checkin_injuries
  for all
  using (
    exists (
      select 1 from session_checkins sc
      where sc.id = checkin_injuries.checkin_id
        and (sc.client_id = auth.uid() or is_coach_of(sc.client_id))
    )
  )
  with check (
    exists (
      select 1 from session_checkins sc
      where sc.id = checkin_injuries.checkin_id
        and (sc.client_id = auth.uid() or is_coach_of(sc.client_id))
    )
  );

alter table client_settings enable row level security;

-- Grants. Reference/program tables stay readable by authenticated users only;
-- anon loses all table access now that the app is behind auth.
revoke all on all tables in schema public from anon;

grant select on all tables in schema public to authenticated;
grant insert, update, delete on workout_sessions to authenticated;
grant insert, update, delete on session_sets to authenticated;
grant insert, update, delete on judo_sessions to authenticated;
grant insert, update, delete on injuries to authenticated;
grant insert, update, delete on session_checkins to authenticated;
grant insert, update, delete on checkin_injuries to authenticated;
grant insert, update, delete on session_adjustments to authenticated;
grant insert, update, delete on session_logs to authenticated;
grant insert, update, delete on client_settings to authenticated;
