-- Phase 4: diet templates, client assignments, nutrition target sources.

alter table profiles
  add column if not exists activity_level text
    check (activity_level is null or activity_level in (
      'sedentary', 'light', 'moderate', 'active', 'very_active'
    ));

create table if not exists diet_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references profiles (id) on delete cascade,
  name text not null,
  description text,
  target_calories integer not null check (target_calories > 0),
  protein_g numeric(8, 2) not null check (protein_g >= 0),
  carbs_g numeric(8, 2) not null check (carbs_g >= 0),
  fat_g numeric(8, 2) not null check (fat_g >= 0),
  water_ml integer check (water_ml is null or water_ml >= 0),
  notes text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diet_templates_coach_idx on diet_templates (coach_id);

create table if not exists diet_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references diet_templates (id) on delete cascade,
  meal_type text check (meal_type is null or meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_item_id uuid references food_items (id) on delete set null,
  label text,
  sort_order smallint not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists diet_template_items_template_idx
  on diet_template_items (template_id, sort_order);

create table if not exists client_diet_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  template_id uuid not null references diet_templates (id) on delete cascade,
  coach_id uuid not null references profiles (id) on delete cascade,
  start_date date not null default current_date,
  active boolean not null default true,
  override_calories integer check (override_calories is null or override_calories > 0),
  override_protein_g numeric(8, 2) check (override_protein_g is null or override_protein_g >= 0),
  override_carbs_g numeric(8, 2) check (override_carbs_g is null or override_carbs_g >= 0),
  override_fat_g numeric(8, 2) check (override_fat_g is null or override_fat_g >= 0),
  override_water_ml integer check (override_water_ml is null or override_water_ml >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_diet_assignments_client_idx
  on client_diet_assignments (client_id);
create unique index if not exists client_diet_assignments_one_active_idx
  on client_diet_assignments (client_id) where active;

alter table nutrition_targets
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'calculated', 'template')),
  add column if not exists template_id uuid references diet_templates (id) on delete set null;

drop trigger if exists trg_diet_templates_updated on diet_templates;
create trigger trg_diet_templates_updated
before update on diet_templates
for each row execute function set_updated_at();

drop trigger if exists trg_client_diet_assignments_updated on client_diet_assignments;
create trigger trg_client_diet_assignments_updated
before update on client_diet_assignments
for each row execute function set_updated_at();

create or replace function can_read_diet_template(p_template uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from diet_templates t
    where t.id = p_template
      and (
        t.coach_id is null
        or t.coach_id = auth.uid()
        or exists (
          select 1 from client_diet_assignments cda
          where cda.template_id = t.id
            and (cda.client_id = auth.uid() or is_coach_of(cda.client_id))
        )
      )
  );
$$;

create or replace function owns_diet_template(p_template uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from diet_templates
    where id = p_template and coach_id = auth.uid()
  );
$$;

alter table diet_templates enable row level security;
alter table diet_template_items enable row level security;
alter table client_diet_assignments enable row level security;

create policy "diet_templates read" on diet_templates
  for select using (can_read_diet_template(id));
create policy "diet_templates insert own" on diet_templates
  for insert with check (coach_id = auth.uid());
create policy "diet_templates update own" on diet_templates
  for update using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "diet_templates delete own" on diet_templates
  for delete using (coach_id = auth.uid());

create policy "diet_template_items read" on diet_template_items
  for select using (can_read_diet_template(template_id));
create policy "diet_template_items insert own" on diet_template_items
  for insert with check (owns_diet_template(template_id));
create policy "diet_template_items update own" on diet_template_items
  for update using (owns_diet_template(template_id)) with check (owns_diet_template(template_id));
create policy "diet_template_items delete own" on diet_template_items
  for delete using (owns_diet_template(template_id));

create policy "client_diet_assignments read" on client_diet_assignments
  for select using (client_id = auth.uid() or is_coach_of(client_id));
create policy "client_diet_assignments insert coach" on client_diet_assignments
  for insert with check (is_coach_of(client_id) and coach_id = auth.uid());
create policy "client_diet_assignments update coach" on client_diet_assignments
  for update using (is_coach_of(client_id)) with check (is_coach_of(client_id));
create policy "client_diet_assignments delete coach" on client_diet_assignments
  for delete using (is_coach_of(client_id));

grant insert, update, delete on diet_templates to authenticated;
grant insert, update, delete on diet_template_items to authenticated;
grant insert, update, delete on client_diet_assignments to authenticated;
