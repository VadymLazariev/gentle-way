import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { ClipboardList, Cookie, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { useAllSubmittedReports } from '@/api/reports'
import { usePendingCheatMeals, useReviewCheatMeal } from '@/api/cheatMeals'
import { toast, toastError } from '@/components/ui/Toast'
import type { CheatMealAdjustment, WeeklyReportStatus } from '@/lib/types'

export function ReportsPage() {
  const reports = useAllSubmittedReports()
  const cheatMeals = usePendingCheatMeals()
  const reviewCheatMeal = useReviewCheatMeal()

  if (reports.isLoading || cheatMeals.isLoading) return <LoadingState />
  if (reports.isError || cheatMeals.isError) return <ErrorState />

  const reportRows = reports.data ?? []
  const cheatRows = cheatMeals.data ?? []

  const onReviewCheatMeal = async (
    cheatMealId: string,
    status: 'approved' | 'rejected',
    coachNotes?: string,
  ) => {
    try {
      await reviewCheatMeal.mutateAsync({ cheatMealId, status, coachNotes })
      toast(status === 'approved' ? 'Cheat meal approved' : 'Cheat meal rejected', 'success')
    } catch (error) {
      toastError(error)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-fg)]">Inbox</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Weekly check-ins and cheat meal reports from your clients.
        </p>
      </div>

      {cheatRows.length > 0 ? (
        <Card data-testid="coach-pending-cheat-meals">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-4 w-4 text-[var(--color-accent)]" />
              Pending cheat meals
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-[var(--color-border)]">
            {cheatRows.map((meal) => {
              const adjustment = meal.adjustment as CheatMealAdjustment | null
              return (
                <div key={meal.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-fg)]">
                      {meal.client_name ?? 'Client'} · {meal.name}
                    </p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {meal.amount_grams != null ? `${meal.amount_grams} g` : 'Amount not specified'}
                      {meal.estimated_calories != null
                        ? ` · ~${Math.round(Number(meal.estimated_calories))} kcal`
                        : ''}
                    </p>
                    {adjustment?.cardio_minutes ? (
                      <p className="text-xs text-[var(--color-muted)]">
                        Suggested cardio: {adjustment.cardio_minutes} min
                      </p>
                    ) : null}
                    {meal.submitted_at ? (
                      <p className="text-xs text-[var(--color-muted)]">
                        Submitted {format(parseISO(meal.submitted_at), 'MMM d, h:mm a')}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/coach/clients/${meal.client_id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" /> View client
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      disabled={reviewCheatMeal.isPending}
                      onClick={() => onReviewCheatMeal(meal.id, 'approved')}
                      data-testid={`cheat-meal-approve-${meal.id}`}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={reviewCheatMeal.isPending}
                      onClick={() => onReviewCheatMeal(meal.id, 'rejected')}
                      data-testid={`cheat-meal-reject-${meal.id}`}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {reportRows.length === 0 && cheatRows.length === 0 ? (
        <EmptyState
          title="Inbox is empty"
          description="When clients submit weekly reports or cheat meals, they will appear here."
          icon={<ClipboardList className="h-7 w-7" />}
        />
      ) : reportRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[var(--color-primary)]" />
              Weekly reports
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-[var(--color-border)]">
            {reportRows.map((report) => (
              <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-fg)]">
                    {report.client_name ?? 'Client'}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {format(parseISO(report.week_start), 'MMM d')} –{' '}
                    {format(parseISO(report.week_end), 'MMM d, yyyy')}
                  </p>
                  {report.submitted_at ? (
                    <p className="text-xs text-[var(--color-muted)]">
                      Submitted {format(parseISO(report.submitted_at), 'MMM d, h:mm a')}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={report.status as WeeklyReportStatus} />
                  <Link to={`/coach/clients/${report.client_id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" /> View client
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function StatusBadge({ status }: { status: WeeklyReportStatus }) {
  switch (status) {
    case 'submitted':
      return <Badge variant="accent">Awaiting review</Badge>
    case 'reviewed':
      return <Badge variant="primary">Reviewed</Badge>
    case 'draft':
      return <Badge variant="outline">Draft</Badge>
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}
