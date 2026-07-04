import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useCreateJudoSession, useDeleteJudoSession, useUpdateJudoSession } from '@/api/judo'
import { localDateString } from '@/lib/dates'
import { sanitizeNumericInput } from '@/lib/numeric'
import type { JudoSession } from '@/lib/types'

function withSanitizer(
  reg: UseFormRegisterReturn,
  allowDecimal: boolean,
): UseFormRegisterReturn {
  return {
    ...reg,
    onChange: (e) => {
      const target = e.target
      if (target instanceof HTMLInputElement) {
        target.value = sanitizeNumericInput(target.value, allowDecimal)
      }
      return reg.onChange(e)
    },
  }
}

const schema = z.object({
  session_date: z.string().min(1, 'Pick a date'),
  duration_minutes: z.coerce.number().int().min(1, 'Too short').max(600),
  standing_randori_rounds: z.coerce.number().int().min(0).max(99),
  ground_randori_rounds: z.coerce.number().int().min(0).max(99),
  intensity_rpe: z
    .union([z.literal(''), z.coerce.number().min(1).max(10)])
    .transform((v) => (v === '' ? null : v)),
  notes: z.string().max(1000).optional(),
})

type FormValues = z.input<typeof schema>

function today(): string {
  return localDateString()
}

export function JudoLogModal({
  open,
  onClose,
  session,
  weekNumber,
}: {
  open: boolean
  onClose: () => void
  session?: JudoSession | null
  weekNumber?: number | null
}) {
  const create = useCreateJudoSession()
  const update = useUpdateJudoSession()
  const remove = useDeleteJudoSession()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      session_date: today(),
      duration_minutes: 90,
      standing_randori_rounds: 0,
      ground_randori_rounds: 0,
      intensity_rpe: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      session_date: session?.session_date ?? today(),
      duration_minutes: session?.duration_minutes ?? 90,
      standing_randori_rounds: session?.standing_randori_rounds ?? 0,
      ground_randori_rounds: session?.ground_randori_rounds ?? 0,
      intensity_rpe: session?.intensity_rpe != null ? session.intensity_rpe : '',
      notes: session?.notes ?? '',
    })
  }, [open, session, reset])

  const onSubmit = handleSubmit(async (values) => {
    const parsed = schema.parse(values)
    const payload = {
      session_date: parsed.session_date,
      week_number: weekNumber ?? session?.week_number ?? null,
      duration_minutes: parsed.duration_minutes,
      standing_randori_rounds: parsed.standing_randori_rounds,
      ground_randori_rounds: parsed.ground_randori_rounds,
      intensity_rpe: parsed.intensity_rpe,
      notes: parsed.notes?.trim() ? parsed.notes.trim() : null,
    }
    if (session) {
      await update.mutateAsync({ id: session.id, patch: payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  })

  const onDelete = async () => {
    if (!session) return
    await remove.mutateAsync(session.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={session ? 'Edit judo session' : 'Log judo session'}
      description="Randori mat time — tachi-waza and ne-waza rounds."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="judo-date">Date</Label>
          <Input id="judo-date" type="date" {...register('session_date')} />
          {errors.session_date ? (
            <p className="text-xs text-[var(--color-danger)]">{errors.session_date.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="judo-duration">Duration (minutes)</Label>
          <Input id="judo-duration" type="text" inputMode="numeric" {...withSanitizer(register('duration_minutes'), false)} />
          {errors.duration_minutes ? (
            <p className="text-xs text-[var(--color-danger)]">{errors.duration_minutes.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="judo-standing">Standing rounds</Label>
            <Input
              id="judo-standing"
              type="text"
              inputMode="numeric"
              {...withSanitizer(register('standing_randori_rounds'), false)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="judo-ground">Ground rounds</Label>
            <Input
              id="judo-ground"
              type="text"
              inputMode="numeric"
              {...withSanitizer(register('ground_randori_rounds'), false)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="judo-rpe">Intensity RPE (optional)</Label>
          <Input
            id="judo-rpe"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 7.5"
            {...withSanitizer(register('intensity_rpe'), true)}
          />
          {errors.intensity_rpe ? (
            <p className="text-xs text-[var(--color-danger)]">Enter a value between 1 and 10</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="judo-notes">Notes (optional)</Label>
          <Textarea id="judo-notes" placeholder="Partners, focus, how it felt…" {...register('notes')} />
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          {session ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onDelete}
              disabled={remove.isPending}
              className="text-[var(--color-danger)]"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {session ? 'Save' : 'Log session'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
