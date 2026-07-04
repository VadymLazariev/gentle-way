import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingState, ErrorState } from '@/components/ui/Feedback'
import { useClientSettings } from '@/api/settings'
import { useBlocks, useGlobalRules, useProgramWeeks, useWeeklyCalendar } from '@/api/program'
import { computeCurrentWeek, isDeloadWeek } from '@/lib/program'
import { cn } from '@/lib/utils'
import type { ProgramWeek } from '@/lib/types'

export function ProgramPage() {
  const blocks = useBlocks()
  const weeks = useProgramWeeks()
  const settings = useClientSettings()
  const rules = useGlobalRules()
  const calendar = useWeeklyCalendar()

  if (blocks.isLoading || weeks.isLoading) return <LoadingState />
  if (blocks.isError || weeks.isError || !blocks.data || !weeks.data) return <ErrorState />

  const currentWeek = settings.data
    ? settings.data.current_week ?? computeCurrentWeek(settings.data.program_start_date)
    : 0

  const weeksByBlock = new Map<number, ProgramWeek[]>()
  for (const w of weeks.data) {
    const list = weeksByBlock.get(w.block_id) ?? []
    list.push(w)
    weeksByBlock.set(w.block_id, list)
  }

  return (
    <div>
      <PageHeader title="Program" subtitle="52-week annual Judo S&C system" />

      {calendar.data && calendar.data.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[var(--color-primary)]" />
              Weekly rhythm
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {calendar.data.map((d) => (
              <div key={d.id} className="rounded-xl bg-[var(--color-surface-2)] p-3">
                <p className="text-xs font-semibold text-[var(--color-fg)]">{d.day}</p>
                <p className="mt-1 text-[11px] leading-snug text-[var(--color-muted)]">{d.session}</p>
                <Badge
                  variant={d.training === 'Judo' ? 'accent' : d.training === 'S&C' ? 'primary' : 'default'}
                  className="mt-2"
                >
                  {d.training}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-5">
        {blocks.data.map((block) => {
          const blockWeeks = weeksByBlock.get(block.id) ?? []
          return (
            <Card key={block.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="primary">Block {block.id}</Badge>
                  <Badge variant="outline">Weeks {block.weeks_label}</Badge>
                  {block.hard_sets_range ? (
                    <Badge variant="outline">{block.hard_sets_range} hard sets</Badge>
                  ) : null}
                </div>
                <CardTitle className="mt-2 text-lg">{blockTitle(block.title)}</CardTitle>
                {block.primary_goal ? (
                  <p className="text-sm text-[var(--color-muted)]">{block.primary_goal}</p>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
                  {blockWeeks.map((w) => {
                    const isCurrent = w.week_number === currentWeek
                    const deload = isDeloadWeek(w.focus)
                    return (
                      <Link
                        key={w.week_number}
                        to={`/program/week/${w.week_number}`}
                        title={w.focus ?? undefined}
                        className={cn(
                          'flex aspect-square flex-col items-center justify-center rounded-xl border text-sm font-semibold transition-colors',
                          isCurrent
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                            : deload
                              ? 'border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[var(--color-accent)] hover:border-[var(--color-accent)]'
                              : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-fg)] hover:border-[var(--color-primary)]',
                        )}
                      >
                        {w.week_number}
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {rules.data && rules.data.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Global rules</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {rules.data.map((r) => (
              <div key={r.id} className="flex gap-3">
                <Badge variant="primary" className="h-6 shrink-0">
                  {r.priority}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-[var(--color-fg)]">{r.rule}</p>
                  {r.implementation ? (
                    <p className="mt-0.5 text-sm text-[var(--color-muted)]">{r.implementation}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function blockTitle(raw: string): string {
  const parts = raw.split('—').map((p) => p.trim())
  return parts[parts.length - 1] || raw
}
