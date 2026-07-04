import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { Cookie } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useCheatMealsForClient, useReviewCheatMeal } from '@/api/cheatMeals'
import { toast, toastError } from '@/components/ui/Toast'
import type { CheatMeal, CheatMealAdjustment, CheatMealStatus } from '@/lib/types'

export function CheatMealsSection({ clientId }: { clientId: string }) {
  const cheatMeals = useCheatMealsForClient(clientId, 10)
  const rows = cheatMeals.data ?? []

  return (
    <Card data-testid="client-cheat-meals">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cookie className="h-4 w-4 text-[var(--color-accent)]" />
          Cheat meals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cheatMeals.isLoading ? (
          <p className="text-sm text-[var(--color-muted)]">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No cheat meal reports yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.slice(0, 5).map((meal) => (
              <CheatMealRow key={meal.id} meal={meal} />
            ))}
            <Link to="/coach/reports" className="text-xs text-[var(--color-primary)] hover:underline">
              Open inbox
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CheatMealRow({ meal }: { meal: CheatMeal }) {
  const review = useReviewCheatMeal()
  const adjustment = meal.adjustment as CheatMealAdjustment | null

  const onReview = async (status: 'approved' | 'rejected') => {
    try {
      await review.mutateAsync({ cheatMealId: meal.id, status })
      toast(status === 'approved' ? 'Cheat meal approved' : 'Cheat meal rejected', 'success')
    } catch (error) {
      toastError(error)
    }
  }

  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--color-fg)]">{meal.name}</p>
        <CheatMealStatusBadge status={meal.status as CheatMealStatus} />
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {meal.submitted_at ? format(parseISO(meal.submitted_at), 'MMM d, h:mm a') : null}
        {meal.estimated_calories != null
          ? ` · ~${Math.round(Number(meal.estimated_calories))} kcal`
          : ''}
        {adjustment?.cardio_minutes ? ` · cardio ${adjustment.cardio_minutes} min` : ''}
      </p>
      {meal.notes ? <p className="mt-2 text-xs text-[var(--color-fg)]">{meal.notes}</p> : null}
      {meal.status === 'pending' ? (
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={review.isPending}
            onClick={() => onReview('approved')}
            data-testid={`client-cheat-approve-${meal.id}`}
          >
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={review.isPending}
            onClick={() => onReview('rejected')}
            data-testid={`client-cheat-reject-${meal.id}`}
          >
            Reject
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function CheatMealStatusBadge({ status }: { status: CheatMealStatus }) {
  switch (status) {
    case 'pending':
      return <Badge variant="accent">Pending</Badge>
    case 'approved':
      return <Badge variant="primary">Approved</Badge>
    case 'rejected':
      return <Badge variant="outline">Rejected</Badge>
    case 'cancelled':
      return <Badge variant="outline">Cancelled</Badge>
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}
