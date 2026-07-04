-- Fix diet_templates INSERT…RETURNING for coach-owned rows.
-- Split read access into plain inline policies so coach_id = auth.uid() is
-- evaluated directly (mirrors 0012_program_templates_select_rls.sql).

drop policy if exists "diet_templates read" on diet_templates;

create policy "diet_templates read system" on diet_templates
  for select using (coach_id is null);

create policy "diet_templates read own" on diet_templates
  for select using (coach_id = auth.uid());

create policy "diet_templates read assigned" on diet_templates
  for select using (
    exists (
      select 1 from client_diet_assignments cda
      where cda.template_id = diet_templates.id
        and (cda.client_id = auth.uid() or is_coach_of(cda.client_id))
    )
  );

grant select on diet_templates to authenticated;
grant select on diet_template_items to authenticated;
grant select on client_diet_assignments to authenticated;
grant execute on function can_read_diet_template(uuid) to authenticated;
grant execute on function owns_diet_template(uuid) to authenticated;
