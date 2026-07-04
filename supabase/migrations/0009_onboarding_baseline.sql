-- Onboarding baseline: capture a client's starting stats at sign-up and let the
-- public onboarding page pre-validate an invite token before the account exists.

-- Baseline profile attributes collected once during onboarding. These are stable
-- per-person facts; ongoing body-measurement tracking is a later phase.
alter table profiles
  add column if not exists sex text check (sex in ('male', 'female', 'other')),
  add column if not exists date_of_birth date,
  add column if not exists height_cm numeric(5, 1),
  add column if not exists starting_weight_kg numeric(5, 1);

-- Read-only invite check for the onboarding page. The client_invites RLS only
-- lets the owning coach read rows, so an anonymous visitor cannot select the
-- invite directly; this SECURITY DEFINER helper exposes just the status the UI
-- needs. redeem_invite() remains the authoritative gate at redemption time.
create or replace function invite_status(p_token text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select case
        when used_at is not null then 'used'
        when expires_at is not null and expires_at < now() then 'expired'
        else 'valid'
      end
      from client_invites
      where token = p_token
    ),
    'invalid'
  );
$$;

grant execute on function invite_status(text) to anon, authenticated;
