-- Hybrid program authoring + assignment.
-- Coaches (and the system) own reusable program templates made of ordered
-- mesocycles (phases), each holding per-day session structure that reuses the
-- prescriptions shape. A client_assignments row binds a template (or a single
-- mesocycle) to a client with a start date and a weekday->day schedule, which
-- feeds the client's Today/calendar. The existing global program tables are
-- untouched and remain readable; system templates are derived from them in a
-- separate seed step (see supabase/seed_system_templates.sql) because reference
-- data is only present after seeds run, not during migrations.

-- A reusable program. coach_id null => system template (readable by everyone,
-- editable by no one via the API); coach_id set => that coach's own template.
create table if not exists program_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references profiles (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists program_templates_coach_idx on program_templates (coach_id);

-- An ordered training phase/block within a template. weeks is the phase length
-- used to place a client on the right phase from their assignment start date.
create table if not exists mesocycles (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references program_templates (id) on delete cascade,
  name text not null,
  focus text,
  weeks smallint not null default 4 check (weeks between 1 and 52),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mesocycles_template_idx on mesocycles (template_id, sort_order);

-- One exercise line of a per-day session inside a mesocycle. A "session" is the
-- set of rows sharing (mesocycle_id, day_code), mirroring how prescriptions are
-- grouped by (week_number, day_code).
create table if not exists template_sessions (
  id uuid primary key default gen_random_uuid(),
  mesocycle_id uuid not null references mesocycles (id) on delete cascade,
  day_code text not null,
  day_label text,
  exercise text not null,
  prescription text,
  target_rpe text,
  rest text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists template_sessions_meso_idx
  on template_sessions (mesocycle_id, day_code, sort_order);

-- Binds a template (optionally narrowed to one mesocycle) to a client. schedule
-- maps a JS weekday number (0=Sun..6=Sat, as text keys) to a day_code in the
-- template, e.g. {"1":"A","2":"C","4":"B"}. At most one active assignment per
-- client is enforced below.
create table if not exists client_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  template_id uuid not null references program_templates (id) on delete cascade,
  mesocycle_id uuid references mesocycles (id) on delete set null,
  start_date date not null default current_date,
  schedule jsonb not null default '{"1":"A","2":"C","4":"B"}'::jsonb,
  active boolean not null default true,
  assigned_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_assignments_client_idx on client_assignments (client_id);
create index if not exists client_assignments_template_idx on client_assignments (template_id);
create unique index if not exists client_assignments_one_active_idx
  on client_assignments (client_id) where active;

-- updated_at triggers reuse set_updated_at() from 0001_init.sql.
drop trigger if exists trg_program_templates_updated on program_templates;
create trigger trg_program_templates_updated
before update on program_templates
for each row execute function set_updated_at();

drop trigger if exists trg_mesocycles_updated on mesocycles;
create trigger trg_mesocycles_updated
before update on mesocycles
for each row execute function set_updated_at();

drop trigger if exists trg_template_sessions_updated on template_sessions;
create trigger trg_template_sessions_updated
before update on template_sessions
for each row execute function set_updated_at();

drop trigger if exists trg_client_assignments_updated on client_assignments;
create trigger trg_client_assignments_updated
before update on client_assignments
for each row execute function set_updated_at();

-- SECURITY DEFINER helpers keep template RLS simple and avoid nested-policy
-- evaluation on the referenced tables.

-- True when the current user may read a template: it is a system template, they
-- own it, or they are the assigned client (or that client's coach) of an
-- assignment pointing at it.
create or replace function can_read_template(p_template uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from program_templates t
    where t.id = p_template
      and (
        t.coach_id is null
        or t.coach_id = auth.uid()
        or exists (
          select 1 from client_assignments ca
          where ca.template_id = t.id
            and (ca.client_id = auth.uid() or is_coach_of(ca.client_id))
        )
      )
  );
$$;

-- True when the current user owns (and may therefore edit) the template.
create or replace function owns_template(p_template uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from program_templates
    where id = p_template and coach_id = auth.uid()
  );
$$;

-- The owning template of a mesocycle, used to scope mesocycle-child policies.
create or replace function template_of_mesocycle(p_meso uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select template_id from mesocycles where id = p_meso;
$$;

-- RLS.
alter table program_templates enable row level security;
alter table mesocycles enable row level security;
alter table template_sessions enable row level security;
alter table client_assignments enable row level security;

-- Templates: read if visible; only the owning coach may create/edit/delete.
create policy "program_templates read" on program_templates
  for select using (can_read_template(id));
create policy "program_templates insert own" on program_templates
  for insert with check (coach_id = auth.uid());
create policy "program_templates update own" on program_templates
  for update using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "program_templates delete own" on program_templates
  for delete using (coach_id = auth.uid());

-- Mesocycles: inherit template visibility; writes require template ownership.
create policy "mesocycles read" on mesocycles
  for select using (can_read_template(template_id));
create policy "mesocycles insert own" on mesocycles
  for insert with check (owns_template(template_id));
create policy "mesocycles update own" on mesocycles
  for update using (owns_template(template_id)) with check (owns_template(template_id));
create policy "mesocycles delete own" on mesocycles
  for delete using (owns_template(template_id));

-- Template sessions: scoped through the parent mesocycle's template.
create policy "template_sessions read" on template_sessions
  for select using (can_read_template(template_of_mesocycle(mesocycle_id)));
create policy "template_sessions insert own" on template_sessions
  for insert with check (owns_template(template_of_mesocycle(mesocycle_id)));
create policy "template_sessions update own" on template_sessions
  for update using (owns_template(template_of_mesocycle(mesocycle_id)))
  with check (owns_template(template_of_mesocycle(mesocycle_id)));
create policy "template_sessions delete own" on template_sessions
  for delete using (owns_template(template_of_mesocycle(mesocycle_id)));

-- Assignments: the client reads their own, a coach reads/writes for linked
-- clients. Clients never write their own assignments.
create policy "client_assignments read" on client_assignments
  for select using (client_id = auth.uid() or is_coach_of(client_id));
create policy "client_assignments insert coach" on client_assignments
  for insert with check (is_coach_of(client_id));
create policy "client_assignments update coach" on client_assignments
  for update using (is_coach_of(client_id)) with check (is_coach_of(client_id));
create policy "client_assignments delete coach" on client_assignments
  for delete using (is_coach_of(client_id));

-- Grants: authenticated users get CRUD; anon has nothing (app is behind auth).
grant select, insert, update, delete on program_templates to authenticated;
grant select, insert, update, delete on mesocycles to authenticated;
grant select, insert, update, delete on template_sessions to authenticated;
grant select, insert, update, delete on client_assignments to authenticated;

grant execute on function can_read_template(uuid) to authenticated;
grant execute on function owns_template(uuid) to authenticated;
grant execute on function template_of_mesocycle(uuid) to authenticated;
