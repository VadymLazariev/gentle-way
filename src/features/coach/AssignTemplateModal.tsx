import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingState } from '@/components/ui/Feedback'
import { toast, toastError } from '@/components/ui/Toast'
import { useClients } from '@/api/coach'
import { useAssignTemplate } from '@/api/programs'
import { DEFAULT_SCHEDULE, WEEKDAY_LABELS } from '@/lib/assignment'
import { localDateString } from '@/lib/dates'
import type { AssignmentSchedule, Mesocycle } from '@/lib/types'

const REST_VALUE = 'rest'

export function AssignTemplateModal({
  open,
  onClose,
  templateId,
  mesocycles,
  dayCodes,
}: {
  open: boolean
  onClose: () => void
  templateId: string
  mesocycles: Mesocycle[]
  dayCodes: string[]
}) {
  const clients = useClients()
  const assign = useAssignTemplate()

  const [clientId, setClientId] = useState('')
  const [mesocycleId, setMesocycleId] = useState('')
  const [startDate, setStartDate] = useState(localDateString())
  const [schedule, setSchedule] = useState<AssignmentSchedule>(DEFAULT_SCHEDULE)

  useEffect(() => {
    if (!open) return
    setClientId('')
    setMesocycleId('')
    setStartDate(localDateString())
    setSchedule(DEFAULT_SCHEDULE)
  }, [open])

  const dayOptions = useMemo(
    () => (dayCodes.length > 0 ? dayCodes : ['A', 'B', 'C']),
    [dayCodes],
  )

  const setDay = (weekday: number, value: string) => {
    setSchedule((prev) => {
      const next = { ...prev }
      if (value === REST_VALUE) delete next[String(weekday)]
      else next[String(weekday)] = value
      return next
    })
  }

  const onSubmit = async () => {
    if (!clientId) {
      toast('Pick a client', 'error')
      return
    }
    try {
      await assign.mutateAsync({
        clientId,
        templateId,
        mesocycleId: mesocycleId || null,
        startDate,
        schedule,
      })
      toast('Program assigned', 'success')
      onClose()
    } catch (error) {
      toastError(error, 'Could not assign program')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign program"
      description="Choose a client, a start date, and which weekday runs which session."
    >
      {clients.isLoading ? (
        <LoadingState />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-client">Client</Label>
            <Select
              id="assign-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              data-testid="assign-program-client"
            >
              <option value="">Select a client…</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.profile?.name ?? 'Unnamed client'}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-phase">Phase</Label>
            <Select
              id="assign-phase"
              value={mesocycleId}
              onChange={(e) => setMesocycleId(e.target.value)}
            >
              <option value="">Full program (progress through phases)</option>
              {mesocycles.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-start">Start date</Label>
            <Input
              id="assign-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Weekly schedule</Label>
            <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-3">
              {WEEKDAY_LABELS.map((label, weekday) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[var(--color-fg)]">{label}</span>
                  <Select
                    aria-label={`${label} session`}
                    className="w-40"
                    value={schedule[String(weekday)] ?? REST_VALUE}
                    onChange={(e) => setDay(weekday, e.target.value)}
                  >
                    <option value={REST_VALUE}>Rest</option>
                    {dayOptions.map((code) => (
                      <option key={code} value={code}>
                        Day {code}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onSubmit} disabled={assign.isPending} data-testid="assign-program-submit">
              {assign.isPending ? 'Assigning…' : 'Assign program'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
