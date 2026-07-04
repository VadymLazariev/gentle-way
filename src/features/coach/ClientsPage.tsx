import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowRight, Link2, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { toastError } from '@/components/ui/Toast'
import { useClients, useInvites, useRevokeInvite } from '@/api/coach'
import type { CoachClientSummary } from '@/api/coach'
import { AddClientModal } from '@/features/coach/AddClientModal'

type ActivityTone = { variant: 'success' | 'warning' | 'danger' | 'default'; label: string }

function activityStatus(lastActiveAt: string | null): ActivityTone {
  if (!lastActiveAt) return { variant: 'default', label: 'No activity yet' }
  const days = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 3) return { variant: 'success', label: 'Active' }
  if (days <= 10) return { variant: 'warning', label: 'Slowing down' }
  return { variant: 'danger', label: 'Inactive' }
}

export function ClientsPage() {
  const clients = useClients()
  const invites = useInvites()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Your roster and onboarding links"
        action={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add client
          </Button>
        }
      />

      {clients.isLoading ? (
        <LoadingState />
      ) : clients.isError ? (
        <ErrorState />
      ) : clients.data && clients.data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {clients.data.map((client) => (
            <ClientCard key={client.clientId} client={client} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No clients yet"
          description="Add your first client to generate a one-time onboarding link."
          icon={<Users className="h-7 w-7" />}
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" /> Add client
            </Button>
          }
        />
      )}

      {invites.data && invites.data.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Pending invites
          </h2>
          <div className="flex flex-col gap-2">
            {invites.data.map((invite) => (
              <PendingInvite
                key={invite.id}
                id={invite.id}
                email={invite.email}
                expiresAt={invite.expires_at}
              />
            ))}
          </div>
        </div>
      ) : null}

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function ClientCard({ client }: { client: CoachClientSummary }) {
  const status = activityStatus(client.lastActiveAt)
  const name = client.profile?.name ?? 'Unnamed client'
  const initial = name.charAt(0).toUpperCase()
  return (
    <Link to={`/coach/clients/${client.clientId}`}>
      <Card className="transition-colors hover:border-[var(--color-primary)]">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-sm font-bold text-[var(--color-fg)]">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[var(--color-fg)]">{name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant={status.variant}>{status.label}</Badge>
              <span className="text-xs text-[var(--color-muted)]">
                {client.workoutCount} lifts · {client.judoCount} judo
              </span>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-[var(--color-muted)]" />
        </CardContent>
      </Card>
    </Link>
  )
}

function PendingInvite({
  id,
  email,
  expiresAt,
}: {
  id: string
  email: string | null
  expiresAt: string | null
}) {
  const revoke = useRevokeInvite()
  const onRevoke = async () => {
    try {
      await revoke.mutateAsync(id)
    } catch (error) {
      toastError(error, 'Could not revoke invite')
    }
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-muted)]">
          <Link2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--color-fg)]">
            {email ?? 'Onboarding link'}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {expiresAt
              ? `Expires ${formatDistanceToNow(parseISO(expiresAt), { addSuffix: true })}`
              : 'No expiry'}
          </p>
        </div>
        <button
          type="button"
          aria-label="Revoke invite"
          onClick={onRevoke}
          disabled={revoke.isPending}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  )
}
