import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2, UtensilsCrossed, ChefHat } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { toast, toastError } from '@/components/ui/Toast'
import { useAuth } from '@/lib/auth/AuthProvider'
import {
  useCreateDietTemplate,
  useDeleteDietTemplate,
  useDietTemplates,
  useUpdateDietTemplate,
  type DietTemplateInput,
} from '@/api/dietTemplates'
import type { DietTemplate } from '@/lib/types'

const templateSchema = z.object({
  name: z.string().min(2, 'Name required').max(120),
  description: z.string().max(500).optional(),
  target_calories: z.string().min(1, 'Required'),
  protein_g: z.string().min(1, 'Required'),
  carbs_g: z.string().min(1, 'Required'),
  fat_g: z.string().min(1, 'Required'),
  water_ml: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

type TemplateForm = z.infer<typeof templateSchema>

export function CoachNutritionPage() {
  const { user } = useAuth()
  const templates = useDietTemplates()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DietTemplate | null>(null)

  const ownTemplates = (templates.data ?? []).filter((t) => t.coach_id === user?.id)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (template: DietTemplate) => {
    setEditing(template)
    setModalOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Nutrition templates"
        subtitle="Prescribe calorie and macro targets for clients"
        action={
          <Button size="sm" onClick={openCreate} data-testid="new-diet-template-btn">
            <Plus className="h-4 w-4" /> New template
          </Button>
        }
      />

      {templates.isLoading ? (
        <LoadingState />
      ) : templates.isError ? (
        <ErrorState />
      ) : ownTemplates.length === 0 ? (
        <EmptyState
          title="No diet templates yet"
          description="Create a template with daily calories and macros, then assign it from a client's profile."
          icon={<UtensilsCrossed className="h-7 w-7" />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {ownTemplates.map((t) => (
            <TemplateRow key={t.id} template={t} onEdit={() => openEdit(t)} />
          ))}
        </div>
      )}

      <TemplateFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />
    </div>
  )
}

function TemplateRow({
  template,
  onEdit,
}: {
  template: DietTemplate
  onEdit: () => void
}) {
  const remove = useDeleteDietTemplate()

  const onDelete = async () => {
    if (!window.confirm(`Delete "${template.name}"?`)) return
    try {
      await remove.mutateAsync(template.id)
      toast('Template deleted', 'success')
    } catch (error) {
      toastError(error)
    }
  }

  return (
    <Card data-testid={`diet-template-${template.id}`}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-[var(--color-fg)]">{template.name}</p>
            <Badge variant="outline">{template.target_calories} kcal</Badge>
          </div>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            P {template.protein_g}g · C {template.carbs_g}g · F {template.fat_g}g
            {template.water_ml != null ? ` · ${template.water_ml} ml water` : ''}
          </p>
          {template.description ? (
            <p className="mt-1 text-xs text-[var(--color-fg)]">{template.description}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link to={`/coach/nutrition/${template.id}`}>
            <Button type="button" size="sm" variant="outline" data-testid={`edit-plan-${template.id}`}>
              <ChefHat className="h-3.5 w-3.5" /> Edit plan
            </Button>
          </Link>
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onDelete} disabled={remove.isPending}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TemplateFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: DietTemplate | null
}) {
  const create = useCreateDietTemplate()
  const update = useUpdateDietTemplate()

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    values: {
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      target_calories: String(editing?.target_calories ?? 2200),
      protein_g: String(editing?.protein_g ?? 150),
      carbs_g: String(editing?.carbs_g ?? 220),
      fat_g: String(editing?.fat_g ?? 70),
      water_ml: editing?.water_ml != null ? String(editing.water_ml) : '2500',
      notes: editing?.notes ?? '',
    },
  })

  const toInput = (values: TemplateForm): DietTemplateInput => ({
    name: values.name,
    description: values.description || null,
    target_calories: Number(values.target_calories),
    protein_g: Number(values.protein_g),
    carbs_g: Number(values.carbs_g),
    fat_g: Number(values.fat_g),
    water_ml: values.water_ml ? Number(values.water_ml) : null,
    notes: values.notes || null,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...toInput(values) })
        toast('Template updated', 'success')
      } else {
        await create.mutateAsync(toInput(values))
        toast('Template created', 'success')
      }
      onClose()
    } catch (error) {
      toastError(error)
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit diet template' : 'New diet template'}
      description="Daily calorie and macro prescription"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <Label>Name</Label>
          <Input className="mt-1" {...form.register('name')} data-testid="diet-template-name" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea className="mt-1" rows={2} {...form.register('description')} />
        </div>
        <div>
          <Label>Calories</Label>
          <Input className="mt-1" type="number" {...form.register('target_calories')} data-testid="diet-template-calories" />
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
          <Label>Water (ml)</Label>
          <Input className="mt-1" type="number" {...form.register('water_ml')} />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea className="mt-1" rows={2} {...form.register('notes')} />
        </div>
        <Button type="submit" disabled={create.isPending || update.isPending} data-testid="diet-template-save">
          {editing ? 'Save changes' : 'Create template'}
        </Button>
      </form>
    </Modal>
  )
}
