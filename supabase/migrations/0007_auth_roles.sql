-- Auth + multi-tenant foundation.
-- Introduces profiles keyed to auth.users, coach<->client links, one-time
-- onboarding invites, and the SECURITY DEFINER helpers that RLS relies on.

-- Every authenticated user has exactly one profile. role is a plain text column
-- validated by a CHECK constraint (NOT a Postgres enum).
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('coach', 'client')),
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A coach is linked to many clients; a client may be linked to many coaches.
create table if not exists coach_clients (
  coach_id uuid not null references profiles (id) on delete cascade,
  client_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coach_id, client_id)
);

create index if not exists coach_clients_client_idx on coach_clients (client_id);

-- One-time onboarding links a coach hands to a prospective client.
create table if not exists client_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  coach_id uuid not null references profiles (id) on delete cascade,
  email text,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists client_invites_coach_idx on client_invites (coach_id);

-- Reuse set_updated_at() from 0001_init.sql.
drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated
before update on profiles
for each row
execute function set_updated_at();

-- True when the current user coaches the given client. SECURITY DEFINER so it
-- reads coach_clients without tripping that table's own RLS (avoids recursion
-- when this helper is used inside other tables' policies).
create or replace function is_coach_of(p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from coach_clients
    where coach_id = auth.uid() and client_id = p_client
  );
$$;

-- Bootstrap a profile whenever an auth user is created. Coaches self-register by
-- passing role='coach' in sign-up metadata; anything else lands as a client.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, role, name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'coach' then 'coach' else 'client' end,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function handle_new_user();

-- Atomically turn a freshly signed-up auth user into a coach's client: confirm
-- the invite is valid, ensure the client profile + coach link + settings exist,
-- and burn the token. SECURITY DEFINER so it can write the coach's link row.
create or replace function redeem_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite client_invites%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite from client_invites where token = p_token for update;
  if not found then
    raise exception 'invalid invite';
  end if;
  if v_invite.used_at is not null then
    raise exception 'invite already used';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'invite expired';
  end if;

  insert into profiles (id, role)
  values (v_uid, 'client')
  on conflict (id) do update set role = 'client';

  insert into coach_clients (coach_id, client_id)
  values (v_invite.coach_id, v_uid)
  on conflict do nothing;

  insert into client_settings (client_id)
  values (v_uid)
  on conflict (client_id) do nothing;

  update client_invites set used_at = now() where id = v_invite.id;

  return v_invite.coach_id;
end;
$$;

-- RLS.
alter table profiles enable row level security;
alter table coach_clients enable row level security;
alter table client_invites enable row level security;

create policy "profiles read self or coached" on profiles
  for select using (id = auth.uid() or is_coach_of(id));
create policy "profiles insert self" on profiles
  for insert with check (id = auth.uid());
create policy "profiles update self" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "coach_clients read own" on coach_clients
  for select using (coach_id = auth.uid() or client_id = auth.uid());
create policy "coach_clients insert own" on coach_clients
  for insert with check (coach_id = auth.uid());
create policy "coach_clients delete own" on coach_clients
  for delete using (coach_id = auth.uid());

create policy "client_invites read own" on client_invites
  for select using (coach_id = auth.uid());
create policy "client_invites insert own" on client_invites
  for insert with check (coach_id = auth.uid());
create policy "client_invites update own" on client_invites
  for update using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "client_invites delete own" on client_invites
  for delete using (coach_id = auth.uid());

-- Grants: authenticated users get CRUD, anon gets nothing on these tables.
grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on coach_clients to authenticated;
grant select, insert, update, delete on client_invites to authenticated;

grant execute on function is_coach_of(uuid) to authenticated;
grant execute on function redeem_invite(text) to authenticated;
