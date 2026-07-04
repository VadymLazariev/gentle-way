-- Expose invite status + optional pre-fill email for the public onboarding page.
create or replace function invite_details(p_token text)
returns json
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select json_build_object(
        'status', case
          when used_at is not null then 'used'
          when expires_at is not null and expires_at < now() then 'expired'
          else 'valid'
        end,
        'email', email
      )
      from client_invites
      where token = p_token
    ),
    json_build_object('status', 'invalid', 'email', null)
  );
$$;

grant execute on function invite_details(text) to anon, authenticated;
