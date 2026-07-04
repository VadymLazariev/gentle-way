import { Navigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import { useActiveAssignment, useTemplateStructure } from '@/api/programs'
import { useSessionByWeekDay } from '@/api/sessions'
import { SessionTracker } from '@/features/session/SessionTracker'
import { totalTemplateWeeks } from '@/lib/assignment'
import { TOTAL_WEEKS } from '@/lib/program'
import type { DayCode } from '@/lib/types'

function parseDay(value: string | undefined): DayCode | null {
  return value === 'A' || value === 'B' || value === 'C' ? value : null
}

export function LiveSessionPage() {
  const params = useParams()
  const week = Number(params.week)
  const day = parseDay(params.day)

  const assignment = useActiveAssignment()
  const structure = useTemplateStructure(assignment.data?.template_id)
  const assigned = assignment.data != null

  const maxWeek =
    assigned && structure.data
      ? totalTemplateWeeks(structure.data.mesocycles)
      : TOTAL_WEEKS
  const validWeek = Number.isFinite(week) && week >= 1 && week <= maxWeek

  const session = useSessionByWeekDay(
    validWeek ? week : undefined,
    day ?? undefined,
    assigned ? assignment.data?.template_id : null,
  )

  if (!validWeek || !day) {
    return <ErrorState message="That session does not exist." />
  }
  if (session.isLoading || (assigned && structure.isLoading)) return <LoadingState />
  if (session.isError) return <ErrorState />

  if (!session.data) {
    return <Navigate to={`/start/${week}/${day}`} replace />
  }

  return <SessionTracker session={session.data} />
}
