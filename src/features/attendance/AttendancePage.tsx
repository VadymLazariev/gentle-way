import { PageHeader } from '@/components/PageHeader'
import { LoadingState, ErrorState } from '@/components/ui/Feedback'
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar'
import { useSessionHistory } from '@/api/sessions'
import { useJudoSessions } from '@/api/judo'

export function AttendancePage() {
  const history = useSessionHistory(365)
  const judo = useJudoSessions(365)

  if (history.isLoading || judo.isLoading) return <LoadingState />
  if (history.isError || judo.isError) return <ErrorState />

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Training and judo sessions" />
      <AttendanceCalendar workouts={history.data ?? []} judo={judo.data ?? []} />
    </div>
  )
}
