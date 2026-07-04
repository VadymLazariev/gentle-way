-- Fix program_templates read assigned: unqualified id in the subquery bound to
-- client_assignments.id instead of program_templates.id, blocking assigned clients.

drop policy if exists "program_templates read assigned" on program_templates;

create policy "program_templates read assigned" on program_templates
  for select using (
    exists (
      select 1 from client_assignments ca
      where ca.template_id = program_templates.id
        and (ca.client_id = auth.uid() or is_coach_of(ca.client_id))
    )
  );
