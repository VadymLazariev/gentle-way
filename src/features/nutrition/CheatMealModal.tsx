import { useEffect, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { toast, toastError } from '@/components/ui/Toast'
import { useCreateCheatMeal } from '@/api/cheatMeals'
import { estimateCheatMeal } from '@/lib/cheatMeal'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  amountGrams: z.string().optional(),
  notes: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof schema>

function parseAmountGrams(value: string | undefined): number | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) return NaN
  return n
}

type CheatMealModalProps = {
  open: boolean
  onClose: () => void
}

export function CheatMealModal({ open, onClose }: CheatMealModalProps) {
  const create = useCreateCheatMeal()
  const photoRef = useRef<HTMLInputElement>(null)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', amountGrams: '', notes: '' },
  })

  const gramsValue = watch('amountGrams')
  const parsedGrams = parseAmountGrams(gramsValue)
  const preview =
    parsedGrams != null && !Number.isNaN(parsedGrams) && parsedGrams > 0
      ? estimateCheatMeal(parsedGrams)
      : null

  useEffect(() => {
    if (!open) return
    reset({ name: '', amountGrams: '', notes: '' })
    if (photoRef.current) photoRef.current.value = ''
  }, [open, reset])

  const onSubmit = handleSubmit(async (values) => {
    const parsed = schema.parse(values)
    const amountGrams = parseAmountGrams(parsed.amountGrams)
    if (Number.isNaN(amountGrams)) {
      toast('Enter a positive amount in grams', 'error')
      return
    }
    const photo = photoRef.current?.files?.[0] ?? null
    try {
      await create.mutateAsync({
        name: parsed.name,
        amountGrams,
        notes: parsed.notes,
        photo,
      })
      toast('Cheat meal reported to your coach', 'success')
      onClose()
    } catch (error) {
      toastError(error)
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report cheat meal"
      description="Log something off-plan. Your coach will review the suggested adjustment."
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="cheat-meal-name">What did you eat?</Label>
          <Input
            id="cheat-meal-name"
            data-testid="cheat-meal-name"
            placeholder="e.g. Pizza slice"
            {...register('name')}
          />
          {errors.name ? (
            <p className="mt-1 text-xs text-[var(--color-accent)]">{errors.name.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="cheat-meal-grams">Approx. amount (grams)</Label>
          <Input
            id="cheat-meal-grams"
            data-testid="cheat-meal-grams"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            placeholder="Optional"
            {...register('amountGrams')}
          />
          {errors.amountGrams ? (
            <p className="mt-1 text-xs text-[var(--color-accent)]">{errors.amountGrams.message}</p>
          ) : parsedGrams != null && Number.isNaN(parsedGrams) ? (
            <p className="mt-1 text-xs text-[var(--color-accent)]">Enter a positive amount</p>
          ) : null}
        </div>

        {preview ? (
          <div
            className="rounded-xl bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-muted)]"
            data-testid="cheat-meal-preview"
          >
            <p>
              Est. <span className="font-medium text-[var(--color-fg)]">{preview.calories} kcal</span>
            </p>
            <p className="mt-1">
              Suggested cardio:{' '}
              <span className="font-medium text-[var(--color-fg)]">{preview.cardioMinutes} min</span>
            </p>
            <p className="mt-1 text-xs">
              Targets will adjust pending coach approval (~{Math.abs(preview.adjustment.macro_adjustment.calories)}{' '}
              kcal, {Math.abs(preview.adjustment.macro_adjustment.carbs_g)} g carbs).
            </p>
          </div>
        ) : null}

        <div>
          <Label htmlFor="cheat-meal-photo">Photo (optional)</Label>
          <Input
            id="cheat-meal-photo"
            data-testid="cheat-meal-photo"
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
          />
        </div>

        <div>
          <Label htmlFor="cheat-meal-notes">Notes (optional)</Label>
          <Textarea
            id="cheat-meal-notes"
            data-testid="cheat-meal-notes"
            rows={2}
            placeholder="Context for your coach"
            {...register('notes')}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending} data-testid="cheat-meal-submit">
            {create.isPending ? 'Submitting…' : 'Submit report'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
