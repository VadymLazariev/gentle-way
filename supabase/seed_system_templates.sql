-- Derive the read-only "system" program template from the existing 52-week
-- reference program (blocks / program_weeks / prescriptions). Runs after
-- seed.sql (see supabase/config.toml [db.seed] sql_paths) because the reference
-- data it reads is loaded by seeds, not by migrations. Idempotent: it no-ops if
-- a system template already exists. Reference data is only read, never changed.

do $$
declare
  v_template_id uuid;
  v_meso_id uuid;
  b record;
  v_week smallint;
begin
  if exists (select 1 from program_templates where coach_id is null) then
    return;
  end if;

  insert into program_templates (coach_id, name, description)
  values (
    null,
    'Judo S&C — 52-Week Program',
    'The full annual periodized strength & conditioning plan, organized into five training blocks. Duplicate it to tailor a client''s program.'
  )
  returning id into v_template_id;

  for b in select * from blocks order by id loop
    insert into mesocycles (template_id, name, focus, weeks, sort_order)
    values (
      v_template_id,
      b.title,
      b.primary_goal,
      greatest(1, least(52, (select count(*) from program_weeks where block_id = b.id))),
      b.id
    )
    returning id into v_meso_id;

    -- Representative session structure = the block's first programmed week.
    select min(week_number) into v_week from program_weeks where block_id = b.id;
    if v_week is null then
      continue;
    end if;

    insert into template_sessions
      (mesocycle_id, day_code, day_label, exercise, prescription, target_rpe, rest, sort_order)
    select
      v_meso_id, p.day_code, p.day_label, p.exercise, p.prescription, p.target_rpe, p.rest, p.sort_order
    from prescriptions p
    where p.week_number = v_week
    order by p.day_code, p.sort_order;
  end loop;
end $$;
