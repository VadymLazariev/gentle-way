import { zodResolver } from '@hookform/resolvers/zod'
import { Settings2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { toast, toastError } from '@/components/ui/Toast'
import { useUpsertNutritionTargets } from '@/api/nutrition'
import { localDateString } from '@/lib/dates'
import type { NutritionTarget } from '@/lib/types'

const targetsSchema = z.object({
  calories: z.string().min(1, 'Required'),
  protein_g: z.string().min(1, 'Required'),
  carbs_g: z.string().min(1, 'Required'),
  fat_g: z.string().min(1, 'Required'),
  water_ml: z.string().optional(),
})

type TargetsForm = z.infer<typeof targetsSchema>

type NutritionTargetsModalProps = {
  open: boolean
  onClose: () => void
  current: NutritionTarget | null
}

export function NutritionTargetsModal({ open, onClose, current }: NutritionTargetsModalProps) {
  const upsert = useUpsertNutritionTargets()
  const form = useForm<TargetsForm>({
    resolver: zodResolver(targetsSchema),
    values: {
      calories: String(current?.calories ?? 2200),
      protein_g: String(current?.protein_g ?? 150),
      carbs_g: String(current?.carbs_g ?? 220),
      fat_g: String(current?.fat_g ?? 70),
      water_ml: current?.water_ml != null ? String(current.water_ml) : '2500',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await upsert.mutateAsync({
        calories: Number(values.calories),
        protein_g: Number(values.protein_g),
        carbs_g: Number(values.carbs_g),
        fat_g: Number(values.fat_g),
        water_ml: values.water_ml ? Number(values.water_ml) : null,
        effective_from: localDateString(),
        auto_calculated: false,
        source: 'manual',
        template_id: null,
      })
      toast('Targets updated', 'success')
      onClose()
    } catch (error) {
      toastError(error)
    }
  })

  return (
    <Modal open={open} onClose={onClose} title="Daily targets" description="Set your calorie and macro goals">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <Label>Calories</Label>
          <Input className="mt-1" type="number" {...form.register('calories')} data-testid="target-calories" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Protein (g)</Label>
            <Input className="mt-1" type="number" {...form.register('protein_g')} />
          </div>
          <div>
            <Label>Carbs (g)</Label>
            <Input className="mt-1" type="number" {...form.register('carbs_g')} />
          </div>
          <div>
            <Label>Fat (g)</Label>
            <Input className="mt-1" type="number" {...form.register('fat_g')} />
          </div>
        </div>
        <div>
          <Label>Water (ml, optional)</Label>
          <Input className="mt-1" type="number" {...form.register('water_ml')} />
        </div>
        <Button type="submit" disabled={upsert.isPending}>
          <Settings2 className="h-4 w-4" /> Save targets
        </Button>
      </form>
    </Modal>
  )
}
