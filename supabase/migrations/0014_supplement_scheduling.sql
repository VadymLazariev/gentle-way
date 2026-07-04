-- Phase 2: structured supplement scheduling, per-dose logging, push subscriptions.

alter table supplements
  add column if not exists dosage_amount numeric(10, 2),
  add column if not exists dosage_unit text,
  add column if not exists schedule_times time[] not null default array['08:00:00'::time];

comment on column supplements.dosage_amount is 'Structured dosage quantity';
comment on column supplements.dosage_unit is 'Structured dosage unit (mg, g, ml, etc.)';
comment on column supplements.schedule_times is 'Daily dose times; one reminder per slot';

-- Backfill structured dosage from legacy text when it looks like "5g" or "500 mg".
update supplements
set
  dosage_amount = (regexp_match(dosage, '^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)$'))[1]::numeric,
  dosage_unit = lower((regexp_match(dosage, '^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)$'))[2])
where dosage is not null
  and dosage_amount is null
  and dosage ~ '^[0-9]+(?:\.[0-9]+)?\s*[a-zA-Z]+$';

alter table supplement_logs
  add column if not exists taken_slots smallint[] not null default '{}';

comment on column supplement_logs.taken_slots is 'Indices into supplements.schedule_times taken on logged_on';

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (client_id, endpoint)
);

create index if not exists push_subscriptions_client_idx on push_subscriptions (client_id);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions access" on push_subscriptions
  for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

grant insert, update, delete on push_subscriptions to authenticated;
