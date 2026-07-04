import { Navigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import { useSessionByWeekDay } from '@/api/sessions'
import { SessionTracker } from '@/features/session/SessionTracker'
import { TOTAL_WEEKS } from '@/lib/program'
import type { DayCode } from '@/lib/types'

function parseDay(value: string | undefined): DayCode | null {
  return value === 'A' || value === 'B' || value === 'C' ? value : null
}

export function LiveSessionPage() {
  const params = useParams()
  const week = Number(params.week)
  const day = parseDay(params.day)

  const validWeek = Number.isFinite(week) && week >= 1 && week <= TOTAL_WEEKS
  const session = useSessionByWeekDay(validWeek ? week : undefined, day ?? undefined)

  if (!validWeek || !day) {
    return <ErrorState message="That session does not exist." />
  }
  if (session.isLoading) return <LoadingState />
  if (session.isError) return <ErrorState />

  // The live tracker is only reachable once a session exists; otherwise send
  // the user to the template preview to explicitly start the workout.
  if (!session.data) {
    return <Navigate to={`/start/${week}/${day}`} replace />
  }

  return <SessionTracker session={session.data} />
}
