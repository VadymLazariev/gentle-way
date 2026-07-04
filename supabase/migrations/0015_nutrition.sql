-- Phase 3: nutrition targets, food catalog, meal logging.

create table if not exists nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  calories integer not null check (calories > 0),
  protein_g numeric(8, 2) not null check (protein_g >= 0),
  carbs_g numeric(8, 2) not null check (carbs_g >= 0),
  fat_g numeric(8, 2) not null check (fat_g >= 0),
  water_ml integer check (water_ml is null or water_ml >= 0),
  effective_from date not null default current_date,
  set_by uuid references profiles (id) on delete set null,
  auto_calculated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_targets_client_idx
  on nutrition_targets (client_id, effective_from desc);

create table if not exists food_items (
  id uuid primary key default gen_random_uuid(),
  owner_client_id uuid references profiles (id) on delete cascade,
  barcode text,
  off_product_id text,
  name text not null,
  brand text,
  source text not null check (source in ('off', 'custom', 'coach')),
  calories_per_100g numeric(10, 2),
  protein_per_100g numeric(10, 2),
  carbs_per_100g numeric(10, 2),
  fat_per_100g numeric(10, 2),
  serving_size_g numeric(10, 2),
  serving_description text,
  calories_per_serving numeric(10, 2),
  protein_per_serving numeric(10, 2),
  carbs_per_serving numeric(10, 2),
  fat_per_serving numeric(10, 2),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_items_off_product_unique unique (off_product_id),
  constraint food_items_barcode_unique unique (barcode)
);

create index if not exists food_items_owner_idx on food_items (owner_client_id, is_favorite);
create index if not exists food_items_name_idx on food_items (lower(name));

create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_logs_client_day_idx
  on meal_logs (client_id, logged_at desc);

create table if not exists meal_log_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references meal_logs (id) on delete cascade,
  food_item_id uuid not null references food_items (id) on delete restrict,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit text not null default 'g',
  calories numeric(10, 2) not null default 0,
  protein_g numeric(10, 2) not null default 0,
  carbs_g numeric(10, 2) not null default 0,
  fat_g numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists meal_log_items_meal_idx on meal_log_items (meal_log_id);

drop trigger if exists trg_nutrition_targets_updated on nutrition_targets;
create trigger trg_nutrition_targets_updated
before update on nutrition_targets
for each row execute function set_updated_at();

drop trigger if exists trg_food_items_updated on food_items;
create trigger trg_food_items_updated
before update on food_items
for each row execute function set_updated_at();

drop trigger if exists trg_meal_logs_updated on meal_logs;
create trigger trg_meal_logs_updated
before update on meal_logs
for each row execute function set_updated_at();

alter table nutrition_targets enable row level security;
alter table food_items enable row level security;
alter table meal_logs enable row level security;
alter table meal_log_items enable row level security;

create policy "nutrition_targets access" on nutrition_targets
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "food_items read" on food_items
  for select
  using (
    source = 'off'
    or owner_client_id = auth.uid()
    or (owner_client_id is not null and is_coach_of(owner_client_id))
  );

create policy "food_items insert" on food_items
  for insert
  with check (
    (source = 'off' and owner_client_id is null)
    or (source in ('custom', 'coach') and (owner_client_id = auth.uid() or is_coach_of(owner_client_id)))
  );

create policy "food_items update" on food_items
  for update
  using (
    owner_client_id = auth.uid()
    or (owner_client_id is not null and is_coach_of(owner_client_id))
  )
  with check (
    owner_client_id = auth.uid()
    or (owner_client_id is not null and is_coach_of(owner_client_id))
  );

create policy "food_items delete" on food_items
  for delete
  using (
    owner_client_id = auth.uid()
    or (owner_client_id is not null and is_coach_of(owner_client_id))
  );

create policy "meal_logs access" on meal_logs
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

create policy "meal_log_items access" on meal_log_items
  for all
  using (
    exists (
      select 1 from meal_logs ml
      where ml.id = meal_log_items.meal_log_id
        and (ml.client_id = auth.uid() or is_coach_of(ml.client_id))
    )
  )
  with check (
    exists (
      select 1 from meal_logs ml
      where ml.id = meal_log_items.meal_log_id
        and (ml.client_id = auth.uid() or is_coach_of(ml.client_id))
    )
  );

grant insert, update, delete on nutrition_targets to authenticated;
grant insert, update, delete on food_items to authenticated;
grant insert, update, delete on meal_logs to authenticated;
grant insert, update, delete on meal_log_items to authenticated;
