import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, set } from 'date-fns'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useUpdateSession } from '@/api/sessions'
import type { WorkoutSession } from '@/lib/types'

const schema = z.object({
  title: z.string().max(200).optional(),
  workout_date: z.string().min(1, 'Pick a date'),
  notes: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

export function EditSessionModal({
  open,
  onClose,
  session,
}: {
  open: boolean
  onClose: () => void
  session: WorkoutSession
}) {
  const update = useUpdateSession()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', workout_date: '', notes: '' },
  })

  useEffect(() => {
    if (!open) return
    reset({
      title: session.title ?? '',
      workout_date: format(new Date(session.started_at), 'yyyy-MM-dd'),
      notes: session.notes ?? '',
    })
  }, [open, session, reset])

  const onSubmit = handleSubmit(async (values) => {
    const original = new Date(session.started_at)
    const [year, month, day] = values.workout_date.split('-').map(Number)
    const nextStart = set(original, { year, month: month - 1, date: day })
    await update.mutateAsync({
      id: session.id,
      patch: {
        title: values.title?.trim() ? values.title.trim() : null,
        notes: values.notes?.trim() ? values.notes.trim() : null,
        started_at: nextStart.toISOString(),
      },
    })
    onClose()
  })

  return (
    <Modal open={open} onClose={onClose} title="Edit workout" description="Title, date, and notes.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-title">Title</Label>
          <Input id="session-title" placeholder="e.g. Week 3 · Upper" {...register('title')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-date">Date</Label>
          <Input id="session-date" type="date" {...register('workout_date')} />
          {errors.workout_date ? (
            <p className="text-xs text-[var(--color-danger)]">{errors.workout_date.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-notes">Notes (optional)</Label>
          <Textarea id="session-notes" placeholder="How it felt, cues, context…" {...register('notes')} />
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || update.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
