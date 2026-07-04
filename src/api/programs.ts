import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useClientId } from '@/lib/client/ClientContext'
import { DEFAULT_SCHEDULE } from '@/lib/assignment'
import type {
  AssignmentSchedule,
  ClientAssignment,
  Mesocycle,
  MesocycleUpdate,
  PlannedExercise,
  ProgramTemplate,
  TemplateSession,
  TemplateSessionUpdate,
} from '@/lib/types'

export type TemplateStructure = {
  template: ProgramTemplate
  mesocycles: Mesocycle[]
  sessions: TemplateSession[]
}

function requireUserId(userId: string | undefined): string {
  if (!userId) throw new Error('Not signed in')
  return userId
}

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

// Templates visible to the current coach: the read-only system templates plus
// the coach's own. RLS enforces the same set regardless of the query.
export function useProgramTemplates() {
  const { user } = useAuth()
  const coachId = user?.id
  return useQuery({
    queryKey: queryKeys.programTemplates(coachId ?? ''),
    enabled: !!coachId,
    queryFn: async (): Promise<ProgramTemplate[]> => {
      const { data, error } = await supabase
        .from('program_templates')
        .select('*')
        .order('coach_id', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useTemplateStructure(templateId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.templateStructure(templateId ?? ''),
    enabled: !!templateId,
    queryFn: async (): Promise<TemplateStructure> => {
      const [templateRes, mesoRes] = await Promise.all([
        supabase.from('program_templates').select('*').eq('id', templateId!).single(),
        supabase
          .from('mesocycles')
          .select('*')
          .eq('template_id', templateId!)
          .order('sort_order', { ascending: true }),
      ])
      if (templateRes.error) throw templateRes.error
      if (mesoRes.error) throw mesoRes.error

      const mesoIds = mesoRes.data.map((m) => m.id)
      let sessions: TemplateSession[] = []
      if (mesoIds.length > 0) {
        const { data, error } = await supabase
          .from('template_sessions')
          .select('*')
          .in('mesocycle_id', mesoIds)
          .order('day_code', { ascending: true })
          .order('sort_order', { ascending: true })
        if (error) throw error
        sessions = data
      }
      return { template: templateRes.data, mesocycles: mesoRes.data, sessions }
    },
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input: { name: string; description?: string | null }): Promise<ProgramTemplate> => {
      const owner = requireUserId(coachId)
      const { data, error } = await supabase
        .from('program_templates')
        .insert({ coach_id: owner, name: input.name, description: input.description ?? null })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.programTemplates(requireUserId(coachId)) })
    },
  })
}

// Deep-clone a template (system or owned) into a fresh coach-owned template so it
// can be freely edited. Copies every mesocycle and its session rows, preserving
// order and remapping mesocycle references.
export function useDuplicateTemplate() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input: { sourceId: string; name?: string }): Promise<ProgramTemplate> => {
      const owner = requireUserId(coachId)
      const [srcTemplate, srcMesos] = await Promise.all([
        supabase.from('program_templates').select('*').eq('id', input.sourceId).single(),
        supabase
          .from('mesocycles')
          .select('*')
          .eq('template_id', input.sourceId)
          .order('sort_order', { ascending: true }),
      ])
      if (srcTemplate.error) throw srcTemplate.error
      if (srcMesos.error) throw srcMesos.error

      const { data: created, error: createError } = await supabase
        .from('program_templates')
        .insert({
          coach_id: owner,
          name: input.name?.trim() || `${srcTemplate.data.name} (copy)`,
          description: srcTemplate.data.description,
        })
        .select('*')
        .single()
      if (createError) throw createError

      const mesoIds = srcMesos.data.map((m) => m.id)
      const srcSessions =
        mesoIds.length > 0
          ? await supabase.from('template_sessions').select('*').in('mesocycle_id', mesoIds)
          : { data: [] as TemplateSession[], error: null }
      if (srcSessions.error) throw srcSessions.error

      const idMap = new Map<string, string>()
      for (const meso of srcMesos.data) {
        const { data: newMeso, error } = await supabase
          .from('mesocycles')
          .insert({
            template_id: created.id,
            name: meso.name,
            focus: meso.focus,
            weeks: meso.weeks,
            sort_order: meso.sort_order,
          })
          .select('id')
          .single()
        if (error) throw error
        idMap.set(meso.id, newMeso.id)
      }

      const rows = srcSessions.data
        .map((s) => {
          const newMesoId = idMap.get(s.mesocycle_id)
          if (!newMesoId) return null
          return {
            mesocycle_id: newMesoId,
            day_code: s.day_code,
            day_label: s.day_label,
            exercise: s.exercise,
            prescription: s.prescription,
            target_rpe: s.target_rpe,
            rest: s.rest,
            sort_order: s.sort_order,
            week_number: s.week_number,
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
      if (rows.length > 0) {
        const { error } = await supabase.from('template_sessions').insert(rows)
        if (error) throw error
      }
      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.programTemplates(requireUserId(coachId)) })
    },
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      description?: string | null
    }): Promise<ProgramTemplate> => {
      const { id, ...patch } = input
      const { data, error } = await supabase
        .from('program_templates')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (template) => {
      qc.invalidateQueries({ queryKey: queryKeys.programTemplates(requireUserId(coachId)) })
      qc.invalidateQueries({ queryKey: queryKeys.templateStructure(template.id) })
    },
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('program_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.programTemplates(requireUserId(coachId)) })
    },
  })
}

export function useCreateMesocycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      templateId: string
      name: string
      focus?: string | null
      weeks: number
      sortOrder: number
    }): Promise<Mesocycle> => {
      const { data, error } = await supabase
        .from('mesocycles')
        .insert({
          template_id: input.templateId,
          name: input.name,
          focus: input.focus ?? null,
          weeks: input.weeks,
          sort_order: input.sortOrder,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (meso) => {
      qc.invalidateQueries({ queryKey: queryKeys.templateStructure(meso.template_id) })
    },
  })
}

export function useUpdateMesocycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      focus?: string | null
      weeks?: number
      sortOrder?: number
    }): Promise<Mesocycle> => {
      const patch: MesocycleUpdate = {}
      if (input.name !== undefined) patch.name = input.name
      if (input.focus !== undefined) patch.focus = input.focus
      if (input.weeks !== undefined) patch.weeks = input.weeks
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder
      const { data, error } = await supabase
        .from('mesocycles')
        .update(patch)
        .eq('id', input.id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (meso) => {
      qc.invalidateQueries({ queryKey: queryKeys.templateStructure(meso.template_id) })
    },
  })
}

export function useDeleteMesocycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; templateId: string }): Promise<string> => {
      const { error } = await supabase.from('mesocycles').delete().eq('id', input.id)
      if (error) throw error
      return input.templateId
    },
    onSuccess: (templateId) => {
      qc.invalidateQueries({ queryKey: queryKeys.templateStructure(templateId) })
    },
  })
}

export function useAddTemplateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      templateId: string
      mesocycleId: string
      dayCode: string
      dayLabel?: string | null
      exercise: string
      prescription?: string | null
      targetRpe?: string | null
      rest?: string | null
      sortOrder: number
      weekNumber?: number | null
    }): Promise<TemplateSession> => {
      const { data, error } = await supabase
        .from('template_sessions')
        .insert({
          mesocycle_id: input.mesocycleId,
          day_code: input.dayCode,
          day_label: input.dayLabel ?? null,
          exercise: input.exercise,
          prescription: input.prescription ?? null,
          target_rpe: input.targetRpe ?? null,
          rest: input.rest ?? null,
          sort_order: input.sortOrder,
          week_number: input.weekNumber ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_row, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.templateStructure(variables.templateId) })
    },
  })
}

export function useUpdateTemplateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      templateId: string
      exercise?: string
      prescription?: string | null
      targetRpe?: string | null
      rest?: string | null
      dayCode?: string
      sortOrder?: number
      weekNumber?: number | null
    }): Promise<TemplateSession> => {
      const patch: TemplateSessionUpdate = {}
      if (input.exercise !== undefined) patch.exercise = input.exercise
      if (input.prescription !== undefined) patch.prescription = input.prescription
      if (input.targetRpe !== undefined) patch.target_rpe = input.targetRpe
      if (input.rest !== undefined) patch.rest = input.rest
      if (input.dayCode !== undefined) patch.day_code = input.dayCode
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder
      if (input.weekNumber !== undefined) patch.week_number = input.weekNumber
      const { data, error } = await supabase
        .from('template_sessions')
        .update(patch)
        .eq('id', input.id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_row, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.templateStructure(variables.templateId) })
    },
  })
}

export function useDeleteTemplateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; templateId: string }): Promise<string> => {
      const { error } = await supabase.from('template_sessions').delete().eq('id', input.id)
      if (error) throw error
      return input.templateId
    },
    onSuccess: (templateId) => {
      qc.invalidateQueries({ queryKey: queryKeys.templateStructure(templateId) })
    },
  })
}

function mapTemplateSessionToPlanned(row: TemplateSession): PlannedExercise {
  return {
    exercise: row.exercise,
    prescription: row.prescription,
    target_rpe: row.target_rpe,
    rest: row.rest,
    source: { kind: 'template', templateSessionId: row.id },
  }
}

export function useAssignedDayExercises(
  mesocycleId: string | undefined,
  weekInMeso: number | undefined,
  dayCode: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.assignedDayExercises(
      mesocycleId ?? '',
      weekInMeso ?? 0,
      dayCode ?? '',
    ),
    enabled: !!mesocycleId && weekInMeso !== undefined && !!dayCode,
    queryFn: async (): Promise<PlannedExercise[]> => {
      const { data, error } = await supabase
        .from('template_sessions')
        .select('*')
        .eq('mesocycle_id', mesocycleId!)
        .eq('day_code', dayCode!)
        .or(`week_number.is.null,week_number.eq.${weekInMeso}`)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data.map(mapTemplateSessionToPlanned)
    },
  })
}

// Coach-only: assign a template (optionally pinned to one mesocycle) to a client.
// Deactivates any existing active assignment first so a client always has at most
// one active program.
export function useAssignTemplate() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input: {
      clientId: string
      templateId: string
      mesocycleId?: string | null
      startDate: string
      schedule?: AssignmentSchedule
    }): Promise<ClientAssignment> => {
      const owner = requireUserId(coachId)
      const { error: deactivateError } = await supabase
        .from('client_assignments')
        .update({ active: false })
        .eq('client_id', input.clientId)
        .eq('active', true)
      if (deactivateError) throw deactivateError

      const { data, error } = await supabase
        .from('client_assignments')
        .insert({
          client_id: input.clientId,
          template_id: input.templateId,
          mesocycle_id: input.mesocycleId ?? null,
          start_date: input.startDate,
          schedule: input.schedule ?? DEFAULT_SCHEDULE,
          active: true,
          assigned_by: owner,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (assignment) => {
      qc.invalidateQueries({ queryKey: queryKeys.clientAssignments(assignment.client_id) })
      qc.invalidateQueries({ queryKey: queryKeys.activeAssignment(assignment.client_id) })
    },
  })
}

export function useClientAssignments(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clientAssignments(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<ClientAssignment[]> => {
      const { data, error } = await supabase
        .from('client_assignments')
        .select('*')
        .eq('client_id', clientId!)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

// The active assignment for whichever client the app is currently scoped to
// (the signed-in client, or the client a coach is viewing).
export function useActiveAssignment() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.activeAssignment(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<ClientAssignment | null> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('client_assignments')
        .select('*')
        .eq('client_id', owner)
        .eq('active', true)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useDeactivateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; clientId: string }): Promise<void> => {
      const { error } = await supabase
        .from('client_assignments')
        .update({ active: false })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: (_void, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.clientAssignments(variables.clientId) })
      qc.invalidateQueries({ queryKey: queryKeys.activeAssignment(variables.clientId) })
    },
  })
}
