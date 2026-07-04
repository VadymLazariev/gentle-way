-- Fix program_templates INSERT…RETURNING for coach-owned rows.
-- The SECURITY DEFINER can_read_template() helper in the sole SELECT policy
-- prevented PostgREST from returning freshly inserted coach templates (duplicate,
-- create, assign flows all use .insert().select()). Split read access into
-- plain inline policies so coach_id = auth.uid() is evaluated directly.

drop policy if exists "program_templates read" on program_templates;

create policy "program_templates read system" on program_templates
  for select using (coach_id is null);

create policy "program_templates read own" on program_templates
  for select using (coach_id = auth.uid());

create policy "program_templates read assigned" on program_templates
  for select using (
    exists (
      select 1 from client_assignments ca
      where ca.template_id = id
        and (ca.client_id = auth.uid() or is_coach_of(ca.client_id))
    )
  );
