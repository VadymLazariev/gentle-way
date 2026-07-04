import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { NotebookPen, Plus, Swords, Timer, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { useDeleteSession, useSessionHistory } from '@/api/sessions'
import type { SessionHistoryEntry } from '@/api/sessions'
import { useJudoSessions } from '@/api/judo'
import { JudoLogModal } from '@/features/judo/JudoLogModal'
import { formatDuration } from '@/lib/prescription'
import { DAY_META } from '@/lib/program'
import type { DayCode, JudoSession } from '@/lib/types'

type WorkoutRow = { kind: 'workout'; date: string; entry: SessionHistoryEntry }
type JudoRow = { kind: 'judo'; date: string; entry: JudoSession }
type LogRow = WorkoutRow | JudoRow

function sessionStats(entry: SessionHistoryEntry) {
  const completed = entry.sets.filter((s) => s.completed)
  const volume = completed.reduce((t, s) => t + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
  const exercises = new Set(entry.sets.map((s) => s.exercise)).size
  return { setCount: completed.length, volume: Math.round(volume * 100) / 100, exercises }
}

export function LogbookPage() {
  const sessions = useSessionHistory(200)
  const judo = useJudoSessions(200)
  const navigate = useNavigate()
  const [editing, setEditing] = useState<JudoSession | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<SessionHistoryEntry | null>(null)
  const deleteSession = useDeleteSession()

  const onConfirmDelete = async () => {
    if (!deleting) return
    await deleteSession.mutateAsync(deleting.id)
    setDeleting(null)
  }

  const grouped = useMemo(() => {
    const rows: LogRow[] = []
    for (const entry of sessions.data ?? []) {
      rows.push({ kind: 'workout', date: format(parseISO(entry.started_at), 'yyyy-MM-dd'), entry })
    }
    for (const entry of judo.data ?? []) {
      rows.push({ kind: 'judo', date: entry.session_date, entry })
    }
    const map = new Map<string, LogRow[]>()
    for (const row of rows) {
      const list = map.get(row.date) ?? []
      list.push(row)
      map.set(row.date, list)
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [sessions.data, judo.data])

  if (sessions.isLoading || judo.isLoading) return <LoadingState />
  if (sessions.isError || judo.isError) return <ErrorState />

  return (
    <div>
      <PageHeader
        title="Logbook"
        subtitle="Your logged workouts and judo sessions"
        action={
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Judo
          </Button>
        }
      />

      {grouped.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description="Start a session from Today or any week, or log a judo session to build your history."
          icon={<NotebookPen className="h-7 w-7" />}
          action={
            <Link to="/" className="text-sm font-medium text-[var(--color-primary)]">
              Go to Today
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([date, rows]) => (
            <div key={date}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[var(--color-fg)]">
                  {format(parseISO(date), 'EEEE, MMM d, yyyy')}
                </h2>
                <Badge variant="default">{rows.length}</Badge>
              </div>
              <div className="flex flex-col gap-3">
                {rows.map((row) =>
                  row.kind === 'workout' ? (
                    <WorkoutCard
                      key={`w-${row.entry.id}`}
                      entry={row.entry}
                      onOpen={() =>
                        navigate(
                          row.entry.finished_at != null
                            ? `/summary/${row.entry.id}`
                            : `/session/${row.entry.week_number ?? 1}/${(row.entry.day_code as DayCode | null) ?? 'A'}`,
                        )
                      }
                      onDelete={() => setDeleting(row.entry)}
                    />
                  ) : (
                    <JudoCard
                      key={`j-${row.entry.id}`}
                      entry={row.entry}
                      onOpen={() => setEditing(row.entry)}
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <JudoLogModal open={creating} onClose={() => setCreating(false)} />
      <JudoLogModal open={editing != null} onClose={() => setEditing(null)} session={editing} />

      <Modal
        open={deleting != null}
        onClose={() => setDeleting(null)}
        title="Delete workout?"
        description="This permanently removes the workout and all its sets."
      >
        <div className="flex flex-col gap-2.5">
          <Button
            size="lg"
            variant="danger"
            className="w-full"
            onClick={() => void onConfirmDelete()}
            disabled={deleteSession.isPending}
          >
            Delete workout
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={() => setDeleting(null)}
            disabled={deleteSession.isPending}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function WorkoutCard({
  entry,
  onOpen,
  onDelete,
}: {
  entry: SessionHistoryEntry
  onOpen: () => void
  onDelete?: () => void
}) {
  const stats = sessionStats(entry)
  const dayCode = (entry.day_code as DayCode | null) ?? 'A'
  return (
    <Card
      className="cursor-pointer transition-colors hover:border-[var(--color-primary)]"
      onClick={onOpen}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--color-fg)]">
              {entry.title ?? `Week ${entry.week_number ?? '—'}`}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {entry.week_number != null ? (
                <Badge variant="outline">Wk {entry.week_number}</Badge>
              ) : null}
              <Badge variant="primary">{DAY_META[dayCode]?.label ?? dayCode}</Badge>
              {entry.finished_at == null ? <Badge variant="accent">In progress</Badge> : null}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {entry.duration_seconds != null ? (
              <Badge variant="outline">
                <Timer className="h-3 w-3" /> {formatDuration(entry.duration_seconds)}
              </Badge>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                aria-label="Delete workout"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-muted)]">
          <span>{stats.exercises} exercises</span>
          <span>·</span>
          <span>{stats.setCount} sets</span>
          {stats.volume > 0 ? (
            <>
              <span>·</span>
              <span className="font-medium text-[var(--color-fg)]">{stats.volume} kg volume</span>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function JudoCard({ entry, onOpen }: { entry: JudoSession; onOpen: () => void }) {
  return (
    <Card
      className="cursor-pointer border-l-2 border-l-[var(--color-accent)] transition-colors hover:border-[var(--color-accent)]"
      onClick={onOpen}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-semibold text-[var(--color-fg)]">
              <Swords className="h-4 w-4 text-[var(--color-accent)]" /> Judo session
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="accent">{entry.duration_minutes} min</Badge>
              {entry.week_number != null ? (
                <Badge variant="outline">Wk {entry.week_number}</Badge>
              ) : null}
              {entry.intensity_rpe != null ? (
                <Badge variant="outline">RPE {entry.intensity_rpe}</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-muted)]">
          <span>{entry.standing_randori_rounds} standing rounds</span>
          <span>·</span>
          <span>{entry.ground_randori_rounds} ground rounds</span>
        </div>
        {entry.notes ? (
          <p className="mt-2 text-xs italic text-[var(--color-muted)]">{entry.notes}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
