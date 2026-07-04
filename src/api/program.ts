import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import type {
  Block,
  DayCode,
  ExerciseLibraryItem,
  GlobalRule,
  Prescription,
  ProgramWeek,
  ProgressionRule,
  WeeklyCalendarDay,
} from '@/lib/types'

export function useBlocks() {
  return useQuery({
    queryKey: queryKeys.blocks,
    queryFn: async (): Promise<Block[]> => {
      const { data, error } = await supabase.from('blocks').select('*').order('id')
      if (error) throw error
      return data
    },
  })
}

export function useBlock(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.block(id ?? 0),
    enabled: id !== undefined,
    queryFn: async (): Promise<Block | null> => {
      const { data, error } = await supabase.from('blocks').select('*').eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useProgramWeeks() {
  return useQuery({
    queryKey: queryKeys.programWeeks,
    queryFn: async (): Promise<ProgramWeek[]> => {
      const { data, error } = await supabase
        .from('program_weeks')
        .select('*')
        .order('week_number')
      if (error) throw error
      return data
    },
  })
}

export function useWeek(weekNumber: number | undefined) {
  return useQuery({
    queryKey: queryKeys.week(weekNumber ?? 0),
    enabled: weekNumber !== undefined,
    queryFn: async (): Promise<ProgramWeek | null> => {
      const { data, error } = await supabase
        .from('program_weeks')
        .select('*')
        .eq('week_number', weekNumber!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useWeekPrescriptions(weekNumber: number | undefined) {
  return useQuery({
    queryKey: queryKeys.weekPrescriptions(weekNumber ?? 0),
    enabled: weekNumber !== undefined,
    queryFn: async (): Promise<Prescription[]> => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('week_number', weekNumber!)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useDayPrescriptions(weekNumber: number | undefined, dayCode: DayCode | undefined) {
  return useQuery({
    queryKey: queryKeys.dayPrescriptions(weekNumber ?? 0, dayCode ?? 'A'),
    enabled: weekNumber !== undefined && dayCode !== undefined,
    queryFn: async (): Promise<Prescription[]> => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('week_number', weekNumber!)
        .eq('day_code', dayCode!)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useExerciseLibrary(blockId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.exerciseLibrary(blockId ?? 0),
    enabled: blockId !== undefined,
    queryFn: async (): Promise<ExerciseLibraryItem[]> => {
      const { data, error } = await supabase
        .from('exercise_library')
        .select('*')
        .eq('block_id', blockId!)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useProgressionRules(blockId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.progressionRules(blockId ?? 0),
    enabled: blockId !== undefined,
    queryFn: async (): Promise<ProgressionRule[]> => {
      const { data, error } = await supabase
        .from('progression_rules')
        .select('*')
        .eq('block_id', blockId!)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useGlobalRules() {
  return useQuery({
    queryKey: queryKeys.globalRules,
    queryFn: async (): Promise<GlobalRule[]> => {
      const { data, error } = await supabase.from('global_rules').select('*').order('priority')
      if (error) throw error
      return data
    },
  })
}

export function useWeeklyCalendar() {
  return useQuery({
    queryKey: queryKeys.weeklyCalendar,
    queryFn: async (): Promise<WeeklyCalendarDay[]> => {
      const { data, error } = await supabase
        .from('weekly_calendar')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}
