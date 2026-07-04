import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Copy, Dumbbell, Plus, Sparkles, Trash2 } from 'lucide-react'
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
  useCreateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  useProgramTemplates,
} from '@/api/programs'
import type { ProgramTemplate } from '@/lib/types'

const createSchema = z.object({
  name: z.string().min(2, 'Give the program a name').max(120),
  description: z.string().max(500).optional(),
})

type CreateValues = z.infer<typeof createSchema>

export function ProgramsPage() {
  const { user } = useAuth()
  const templates = useProgramTemplates()
  const [createOpen, setCreateOpen] = useState(false)

  const systemTemplates = (templates.data ?? []).filter((t) => t.coach_id === null)
  const ownTemplates = (templates.data ?? []).filter((t) => t.coach_id === user?.id)

  return (
    <div>
      <PageHeader
        title="Programs"
        subtitle="Browse system templates, duplicate them, or build your own"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="new-program-btn">
            <Plus className="h-4 w-4" /> New program
          </Button>
        }
      />

      {templates.isLoading ? (
        <LoadingState />
      ) : templates.isError ? (
        <ErrorState />
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              <Sparkles className="h-4 w-4" /> System templates
            </h2>
            {systemTemplates.length > 0 ? (
              <div className="flex flex-col gap-3">
                {systemTemplates.map((t) => (
                  <TemplateCard key={t.id} template={t} owned={false} />
                ))}
              </div>
            ) : (
              <EmptyState title="No system templates" />
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              <Dumbbell className="h-4 w-4" /> Your programs
            </h2>
            {ownTemplates.length > 0 ? (
              <div className="flex flex-col gap-3">
                {ownTemplates.map((t) => (
                  <TemplateCard key={t.id} template={t} owned />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No custom programs yet"
                description="Duplicate a system template to tweak it, or build one from scratch."
                icon={<Dumbbell className="h-7 w-7" />}
              />
            )}
          </section>
        </div>
      )}

      <CreateTemplateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function TemplateCard({ template, owned }: { template: ProgramTemplate; owned: boolean }) {
  const duplicate = useDuplicateTemplate()
  const remove = useDeleteTemplate()

  const onDuplicate = async () => {
    try {
      await duplicate.mutateAsync({ sourceId: template.id })
      toast('Program duplicated', 'success')
    } catch (error) {
      toastError(error, 'Could not duplicate program')
    }
  }

  const onDelete = async () => {
    try {
      await remove.mutateAsync(template.id)
      toast('Program deleted', 'success')
    } catch (error) {
      toastError(error, 'Could not delete program')
    }
  }

  return (
    <Card className="transition-colors hover:border-[var(--color-primary)]" data-testid={`program-template-${template.id}`}>
      <CardContent className="flex items-center gap-4 p-4">
        <Link to={`/coach/programs/${template.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-semibold text-[var(--color-fg)]">{template.name}</p>
            {owned ? (
              <Badge variant="primary">Custom</Badge>
            ) : (
              <Badge variant="accent">System</Badge>
            )}
          </div>
          {template.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
              {template.description}
            </p>
          ) : null}
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            disabled={duplicate.isPending}
          >
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          {owned ? (
            <button
              type="button"
              aria-label="Delete program"
              onClick={onDelete}
              disabled={remove.isPending}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to={`/coach/programs/${template.id}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              aria-label="Open program"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CreateTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateTemplate()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', description: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        name: values.name.trim(),
        description: values.description?.trim() || null,
      })
      toast('Program created', 'success')
      reset({ name: '', description: '' })
      onClose()
    } catch (error) {
      toastError(error, 'Could not create program')
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New program"
      description="Start a blank custom program, then add mesocycles and sessions."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="template-name">Name</Label>
          <Input id="template-name" placeholder="e.g. Off-season strength" {...register('name')} />
          {errors.name ? (
            <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="template-description">Description (optional)</Label>
          <Textarea
            id="template-description"
            placeholder="Who is this for and what's the goal?"
            {...register('description')}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="create-program-save">
            {isSubmitting ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
