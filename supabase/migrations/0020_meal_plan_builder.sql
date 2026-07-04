-- Meal-plan builder: template meals, item macro snapshots, prescribed mode, diary linkage.

create table if not exists diet_template_meals (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references diet_templates (id) on delete cascade,
  name text not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists diet_template_meals_template_idx
  on diet_template_meals (template_id, sort_order);

alter table diet_template_items
  add column if not exists meal_id uuid references diet_template_meals (id) on delete cascade,
  add column if not exists quantity numeric(10, 2) check (quantity is null or quantity > 0),
  add column if not exists unit text default 'g',
  add column if not exists calories numeric(10, 2) check (calories is null or calories >= 0),
  add column if not exists protein_g numeric(10, 2) check (protein_g is null or protein_g >= 0),
  add column if not exists carbs_g numeric(10, 2) check (carbs_g is null or carbs_g >= 0),
  add column if not exists fat_g numeric(10, 2) check (fat_g is null or fat_g >= 0);

create index if not exists diet_template_items_meal_idx
  on diet_template_items (meal_id, sort_order);

alter table client_diet_assignments
  add column if not exists mode text not null default 'prescribed'
    check (mode in ('prescribed', 'reference'));

alter table meal_log_items
  add column if not exists template_item_id uuid references diet_template_items (id) on delete set null;

create index if not exists meal_log_items_template_item_idx
  on meal_log_items (template_item_id)
  where template_item_id is not null;

alter table diet_template_meals enable row level security;

create policy "diet_template_meals read" on diet_template_meals
  for select using (can_read_diet_template(template_id));
create policy "diet_template_meals insert own" on diet_template_meals
  for insert with check (owns_diet_template(template_id));
create policy "diet_template_meals update own" on diet_template_meals
  for update using (owns_diet_template(template_id)) with check (owns_diet_template(template_id));
create policy "diet_template_meals delete own" on diet_template_meals
  for delete using (owns_diet_template(template_id));

grant select, insert, update, delete on diet_template_meals to authenticated;
