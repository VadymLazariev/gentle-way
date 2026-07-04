import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RpeBadge, RpeTextBadge } from '@/components/RpeBadge'
import { LoadingState, ErrorState } from '@/components/ui/Feedback'
import { SessionLauncher } from '@/features/session/SessionLauncher'
import { useBlock, useExerciseLibrary, useProgressionRules, useWeek } from '@/api/program'
import {
  DAY_META,
  DAY_ORDER,
  TOTAL_WEEKS,
  blockIdForWeek,
  isDeloadWeek,
  planForWeekday,
} from '@/lib/program'
import { cn } from '@/lib/utils'
import type { DayCode } from '@/lib/types'

function defaultDay(): DayCode {
  const plan = planForWeekday(new Date().getDay())
  return plan.type === 'sc' ? plan.day : 'A'
}

export function WeekPage() {
  const params = useParams()
  const week = Number(params.week)
  const [day, setDay] = useState<DayCode>(defaultDay)
  const [showReference, setShowReference] = useState(false)

  const weekData = useWeek(Number.isFinite(week) ? week : undefined)
  const blockId = Number.isFinite(week) ? blockIdForWeek(week) : undefined
  const block = useBlock(blockId)

  if (!Number.isFinite(week) || week < 1 || week > TOTAL_WEEKS) {
    return <ErrorState message="That week does not exist." />
  }
  if (weekData.isLoading) return <LoadingState />
  if (weekData.isError) return <ErrorState />

  const focus = weekData.data?.focus ?? null
  const deload = isDeloadWeek(focus)
  const mainWork =
    day === 'A'
      ? weekData.data?.day_a_main
      : day === 'B'
        ? weekData.data?.day_b_main
        : weekData.data?.day_c_focus

  return (
    <div>
      <PageHeader
        title={`Week ${week}`}
        subtitle={block.data ? blockTitle(block.data.title) : undefined}
        action={
          <div className="flex items-center gap-1">
            <Link to={`/program/week/${Math.max(1, week - 1)}`}>
              <Button variant="outline" size="icon" disabled={week <= 1} aria-label="Previous week">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={`/program/week/${Math.min(TOTAL_WEEKS, week + 1)}`}>
              <Button
                variant="outline"
                size="icon"
                disabled={week >= TOTAL_WEEKS}
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {focus ? <Badge variant={deload ? 'accent' : 'primary'}>{focus}</Badge> : null}
        {weekData.data?.hard_sets != null ? (
          <Badge variant="outline">{weekData.data.hard_sets} hard sets</Badge>
        ) : null}
        <RpeBadge rpe={weekData.data?.main_rpe ?? null} label="Main RPE" />
      </div>

      <div className="mb-4 inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {DAY_ORDER.map((code) => (
          <button
            key={code}
            onClick={() => setDay(code)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              day === code
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]',
            )}
          >
            {DAY_META[code].label}
            <span className="ml-1.5 hidden text-xs opacity-70 sm:inline">
              {DAY_META[code].weekday}
            </span>
          </button>
        ))}
      </div>

      {mainWork ? (
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Main work: <span className="text-[var(--color-fg)]">{mainWork}</span>
        </p>
      ) : null}

      <SessionLauncher weekNumber={week} dayCode={day} />

      <div className="mt-6">
        <Button variant="ghost" onClick={() => setShowReference((v) => !v)}>
          {showReference ? 'Hide' : 'Show'} block reference
        </Button>
      </div>

      {showReference && blockId ? <BlockReference blockId={blockId} /> : null}
    </div>
  )
}

function BlockReference({ blockId }: { blockId: number }) {
  const rules = useProgressionRules(blockId)
  const library = useExerciseLibrary(blockId)

  return (
    <div className="mt-4 flex flex-col gap-5">
      {rules.data && rules.data.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Progression rules</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {rules.data.map((r) => (
              <div key={r.id}>
                <p className="text-sm font-medium text-[var(--color-fg)]">{r.rule}</p>
                {r.implementation ? (
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">{r.implementation}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {library.data && library.data.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Exercise library</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {library.data.map((ex) => (
              <div
                key={ex.id}
                className="flex flex-col gap-1 border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{ex.day_label}</Badge>
                  <span className="font-medium text-[var(--color-fg)]">{ex.exercise}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]">
                  {ex.default_prescription ? <span>{ex.default_prescription}</span> : null}
                  <RpeTextBadge value={ex.rpe} />
                  {ex.rest ? <Badge variant="outline">{ex.rest}</Badge> : null}
                </div>
                {ex.transfer ? (
                  <p className="text-xs italic text-[var(--color-muted)]">{ex.transfer}</p>
                ) : null}
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
