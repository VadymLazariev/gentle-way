-- Idempotent E2E users for Playwright (coach@test.dev / client@test.dev, password123).
do $$
declare
  v_coach_id uuid := '11111111-1111-1111-1111-111111111111';
  v_client_id uuid := '22222222-2222-2222-2222-222222222222';
begin
  delete from auth.identities
  where user_id in (v_coach_id, v_client_id);
  delete from auth.users
  where id in (v_coach_id, v_client_id);

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values
    (
      v_coach_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'coach@test.dev',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"coach","name":"Coach Test"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      v_client_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'client@test.dev',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"client","name":"Client Cara"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values
    (
      v_coach_id,
      v_coach_id,
      jsonb_build_object('sub', v_coach_id::text, 'email', 'coach@test.dev'),
      'email',
      v_coach_id::text,
      now(),
      now(),
      now()
    ),
    (
      v_client_id,
      v_client_id,
      jsonb_build_object('sub', v_client_id::text, 'email', 'client@test.dev'),
      'email',
      v_client_id::text,
      now(),
      now(),
      now()
    );

  insert into profiles (id, role, name, sex, date_of_birth, height_cm, starting_weight_kg, activity_level)
  values
    (v_coach_id, 'coach', 'Coach Test', null, null, null, null, null),
    (v_client_id, 'client', 'Client Cara', 'female', '1995-06-15', 165, 68, 'moderate')
  on conflict (id) do update set
    role = excluded.role,
    name = excluded.name,
    sex = excluded.sex,
    date_of_birth = excluded.date_of_birth,
    height_cm = excluded.height_cm,
    starting_weight_kg = excluded.starting_weight_kg,
    activity_level = excluded.activity_level;

  insert into coach_clients (coach_id, client_id)
  values (v_coach_id, v_client_id)
  on conflict do nothing;

  insert into client_settings (client_id, program_start_date)
  values (v_client_id, (current_date - interval '14 days')::date)
  on conflict (client_id) do nothing;
end $$;
