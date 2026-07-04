import { useEffect, useState } from 'react'
import { Check, Copy, Link2, Mail } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { toast, toastError } from '@/components/ui/Toast'
import { inviteLink, useCreateInvite } from '@/api/coach'
import type { ClientInvite } from '@/lib/types'

export function AddClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createInvite = useCreateInvite()
  const [email, setEmail] = useState('')
  const [invite, setInvite] = useState<ClientInvite | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setEmail('')
      setInvite(null)
      setCopied(false)
    }
  }, [open])

  const onGenerate = async () => {
    try {
      const created = await createInvite.mutateAsync({ email: email.trim() || null })
      setInvite(created)
    } catch (error) {
      toastError(error, 'Could not create invite')
    }
  }

  const link = invite ? inviteLink(invite.token) : ''

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast('Onboarding link copied', 'success')
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toastError(error, 'Could not copy link')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a client"
      description="Generate a one-time onboarding link and share it with your client."
    >
      {invite ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Onboarding link</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={onCopy} aria-label="Copy link">
                {copied ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">
              <Link2 className="h-3 w-3" /> One-time link
            </Badge>
            {invite.expires_at ? (
              <Badge variant="outline">
                Expires {format(parseISO(invite.expires_at), 'MMM d, yyyy')}
              </Badge>
            ) : null}
            {invite.email ? (
              <Badge variant="outline">
                <Mail className="h-3 w-3" /> {invite.email}
              </Badge>
            ) : null}
          </div>

          <p className="text-xs text-[var(--color-muted)]">
            The link works once. When your client opens it, they'll set a password and their
            starting details, then land in their own app linked to you.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onGenerate} disabled={createInvite.isPending}>
              Generate another
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Client email (optional)</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-[var(--color-muted)]">
              Just a label to help you remember who the link is for. The client enters their own
              email during onboarding.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onGenerate} disabled={createInvite.isPending}>
              {createInvite.isPending ? 'Generating…' : 'Generate link'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
