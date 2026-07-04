-- Phase 4: cheat meal reporting, photo storage, pending nutrition adjustments.

alter table nutrition_targets drop constraint if exists nutrition_targets_source_check;
alter table nutrition_targets add constraint nutrition_targets_source_check
  check (source in ('manual', 'calculated', 'template', 'cheat_meal'));

create table if not exists cheat_meals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  name text not null,
  amount_grams numeric(10, 2) check (amount_grams is null or amount_grams > 0),
  storage_path text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles (id) on delete set null,
  coach_notes text,
  estimated_calories numeric(10, 2),
  adjustment jsonb,
  applied_target_id uuid references nutrition_targets (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cheat_meals_client_idx
  on cheat_meals (client_id, submitted_at desc);

create index if not exists cheat_meals_pending_idx
  on cheat_meals (status, submitted_at desc)
  where status = 'pending';

drop trigger if exists trg_cheat_meals_updated on cheat_meals;
create trigger trg_cheat_meals_updated
before update on cheat_meals
for each row execute function set_updated_at();

alter table cheat_meals enable row level security;

create policy "cheat_meals access" on cheat_meals
  for all
  using (client_id = auth.uid() or is_coach_of(client_id))
  with check (client_id = auth.uid() or is_coach_of(client_id));

grant insert, update, delete on cheat_meals to authenticated;

-- Private storage bucket for cheat meal photos: {client_id}/{cheat_meal_id}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cheat-meal-photos',
  'cheat-meal-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "cheat_meal_photos insert own" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'cheat-meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cheat_meal_photos select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'cheat-meal-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_coach_of(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "cheat_meal_photos update own" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'cheat-meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'cheat-meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cheat_meal_photos delete own" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'cheat-meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
