import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Copy, Layers, Pencil, Plus, Trash2, UserCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { toast, toastError } from '@/components/ui/Toast'
import { useAuth } from '@/lib/auth/AuthProvider'
import {
  useAddTemplateSession,
  useCreateMesocycle,
  useDeleteMesocycle,
  useDeleteTemplateSession,
  useDuplicateTemplate,
  useTemplateStructure,
  useUpdateMesocycle,
  useUpdateTemplate,
  useUpdateTemplateSession,
} from '@/api/programs'
import { AssignTemplateModal } from '@/features/coach/AssignTemplateModal'
import type { Mesocycle, TemplateSession } from '@/lib/types'

export function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const { user } = useAuth()
  const structure = useTemplateStructure(templateId)
  const duplicate = useDuplicateTemplate()

  const [assignOpen, setAssignOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [mesoModal, setMesoModal] = useState<{ meso: Mesocycle | null } | null>(null)

  const sessionsByMeso = useMemo(() => {
    const map = new Map<string, TemplateSession[]>()
    for (const s of structure.data?.sessions ?? []) {
      const list = map.get(s.mesocycle_id) ?? []
      list.push(s)
      map.set(s.mesocycle_id, list)
    }
    return map
  }, [structure.data?.sessions])

  const dayCodes = useMemo(
    () => [...new Set((structure.data?.sessions ?? []).map((s) => s.day_code))].sort(),
    [structure.data?.sessions],
  )

  if (structure.isLoading) return <LoadingState />
  if (structure.isError || !structure.data) return <ErrorState />

  const { template, mesocycles } = structure.data
  const owned = template.coach_id === user?.id

  const onDuplicate = async () => {
    if (!templateId) return
    try {
      await duplicate.mutateAsync({ sourceId: templateId })
      toast('Program duplicated — find it under Your programs', 'success')
    } catch (error) {
      toastError(error, 'Could not duplicate program')
    }
  }

  const nextSortOrder = mesocycles.reduce((max, m) => Math.max(max, m.sort_order), 0) + 1

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/coach/programs"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-4 w-4" /> All programs
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-fg)]">
                {template.name}
              </h1>
              {owned ? <Badge variant="primary">Custom</Badge> : <Badge variant="accent">System</Badge>}
            </div>
            {template.description ? (
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
                {template.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {owned ? (
              <Button variant="outline" size="sm" onClick={() => setDetailsOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit details
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onDuplicate} disabled={duplicate.isPending}>
                <Copy className="h-4 w-4" /> Duplicate to edit
              </Button>
            )}
            <Button size="sm" onClick={() => setAssignOpen(true)} data-testid="assign-program-btn">
              <UserCheck className="h-4 w-4" /> Assign
            </Button>
          </div>
        </div>
      </div>

      {mesocycles.length === 0 ? (
        <EmptyState
          title="No mesocycles yet"
          description={owned ? 'Add a phase to start building sessions.' : 'This program has no phases.'}
          icon={<Layers className="h-7 w-7" />}
          action={
            owned ? (
              <Button size="sm" onClick={() => setMesoModal({ meso: null })} data-testid="add-meso-btn">
                <Plus className="h-4 w-4" /> Add phase
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {mesocycles.map((meso) => (
            <MesocycleCard
              key={meso.id}
              templateId={template.id}
              mesocycle={meso}
              sessions={sessionsByMeso.get(meso.id) ?? []}
              owned={owned}
              onEdit={() => setMesoModal({ meso })}
            />
          ))}
        </div>
      )}

      {owned && mesocycles.length > 0 ? (
        <Button variant="outline" onClick={() => setMesoModal({ meso: null })} data-testid="add-meso-btn">
          <Plus className="h-4 w-4" /> Add phase
        </Button>
      ) : null}

      <AssignTemplateModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        templateId={template.id}
        mesocycles={mesocycles}
        dayCodes={dayCodes}
      />
      <EditDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        templateId={template.id}
        name={template.name}
        description={template.description}
      />
      {mesoModal ? (
        <MesocycleModal
          open
          onClose={() => setMesoModal(null)}
          templateId={template.id}
          mesocycle={mesoModal.meso}
          nextSortOrder={nextSortOrder}
        />
      ) : null}
    </div>
  )
}

function MesocycleCard({
  templateId,
  mesocycle,
  sessions,
  owned,
  onEdit,
}: {
  templateId: string
  mesocycle: Mesocycle
  sessions: TemplateSession[]
  owned: boolean
  onEdit: () => void
}) {
  const deleteMeso = useDeleteMesocycle()
  const deleteSession = useDeleteTemplateSession()
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [rowModal, setRowModal] = useState<{ dayCode: string; row: TemplateSession | null } | null>(
    null,
  )

  const filteredSessions = useMemo(() => {
    if (selectedWeek == null) {
      return sessions.filter((s) => s.week_number == null)
    }
    return sessions.filter((s) => s.week_number == null || s.week_number === selectedWeek)
  }, [sessions, selectedWeek])

  const byDay = useMemo(() => {
    const map = new Map<string, TemplateSession[]>()
    for (const s of filteredSessions) {
      const list = map.get(s.day_code) ?? []
      list.push(s)
      map.set(s.day_code, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order)
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filteredSessions])

  const onDeleteMeso = async () => {
    try {
      await deleteMeso.mutateAsync({ id: mesocycle.id, templateId })
      toast('Phase removed', 'success')
    } catch (error) {
      toastError(error, 'Could not delete phase')
    }
  }

  const onDeleteRow = async (row: TemplateSession) => {
    try {
      await deleteSession.mutateAsync({ id: row.id, templateId })
    } catch (error) {
      toastError(error, 'Could not delete exercise')
    }
  }

  const nextRowSort = (dayCode: string) =>
    (byDay.find(([code]) => code === dayCode)?.[1].reduce((m, r) => Math.max(m, r.sort_order), -1) ??
      -1) + 1

  return (
    <Card data-testid={`mesocycle-${mesocycle.id}`}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-[var(--color-fg)]">{mesocycle.name}</p>
              <Badge variant="outline">{mesocycle.weeks} weeks</Badge>
            </div>
            {mesocycle.focus ? (
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">{mesocycle.focus}</p>
            ) : null}
          </div>
          {owned ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Edit phase"
                onClick={onEdit}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Delete phase"
                onClick={onDeleteMeso}
                disabled={deleteMeso.isPending}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        {owned ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Label htmlFor={`week-select-${mesocycle.id}`} className="text-xs text-[var(--color-muted)]">
              View week
            </Label>
            <Select
              id={`week-select-${mesocycle.id}`}
              className="w-40"
              value={selectedWeek == null ? 'all' : String(selectedWeek)}
              onChange={(e) => {
                const value = e.target.value
                setSelectedWeek(value === 'all' ? null : Number(value))
              }}
              data-testid={`meso-week-select-${mesocycle.id}`}
            >
              <option value="all">All weeks</option>
              {Array.from({ length: mesocycle.weeks }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-4">
          {byDay.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No sessions in this phase yet.</p>
          ) : (
            byDay.map(([dayCode, rows]) => (
              <div key={dayCode} className="rounded-xl bg-[var(--color-surface-2)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                    Day {dayCode}
                    {rows[0]?.day_label ? ` · ${rows[0].day_label}` : ''}
                  </p>
                  {owned ? (
                    <button
                      type="button"
                      onClick={() => setRowModal({ dayCode, row: null })}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:brightness-110"
                      data-testid={`add-exercise-${mesocycle.id}-${dayCode}`}
                    >
                      <Plus className="h-3.5 w-3.5" /> Exercise
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-col divide-y divide-[var(--color-border)]">
                  {rows.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[var(--color-fg)]">{row.exercise}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          {row.prescription ? (
                            <span className="text-xs text-[var(--color-muted)]">
                              {row.prescription}
                            </span>
                          ) : null}
                          {row.target_rpe ? (
                            <Badge variant="outline">RPE {row.target_rpe}</Badge>
                          ) : null}
                          {row.week_number != null ? (
                            <Badge variant="accent">Week {row.week_number}</Badge>
                          ) : null}
                          {row.rest ? <Badge variant="outline">{row.rest}</Badge> : null}
                        </div>
                      </div>
                      {owned ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label="Edit exercise"
                            onClick={() => setRowModal({ dayCode, row })}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete exercise"
                            onClick={() => onDeleteRow(row)}
                            disabled={deleteSession.isPending}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {owned ? (
            <button
              type="button"
              onClick={() => setRowModal({ dayCode: 'A', row: null })}
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:brightness-110"
              data-testid={`add-exercise-${mesocycle.id}`}
            >
              <Plus className="h-4 w-4" /> Add exercise to a day
            </button>
          ) : null}
        </div>
      </CardContent>

      {rowModal ? (
        <SessionRowModal
          open
          onClose={() => setRowModal(null)}
          templateId={templateId}
          mesocycleId={mesocycle.id}
          row={rowModal.row}
          defaultDayCode={rowModal.dayCode}
          defaultWeekNumber={selectedWeek}
          nextSortOrder={rowModal.row ? rowModal.row.sort_order : nextRowSort(rowModal.dayCode)}
        />
      ) : null}
    </Card>
  )
}

const detailsSchema = z.object({
  name: z.string().min(2, 'Give the program a name').max(120),
  description: z.string().max(500).optional(),
})

type DetailsValues = z.infer<typeof detailsSchema>

function EditDetailsModal({
  open,
  onClose,
  templateId,
  name,
  description,
}: {
  open: boolean
  onClose: () => void
  templateId: string
  name: string
  description: string | null
}) {
  const update = useUpdateTemplate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    values: { name, description: description ?? '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: templateId,
        name: values.name.trim(),
        description: values.description?.trim() || null,
      })
      toast('Program updated', 'success')
      onClose()
    } catch (error) {
      toastError(error, 'Could not update program')
    }
  })

  return (
    <Modal open={open} onClose={onClose} title="Edit program details">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-name">Name</Label>
          <Input id="edit-name" {...register('name')} />
          {errors.name ? (
            <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea id="edit-description" {...register('description')} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const mesoSchema = z.object({
  name: z.string().min(2, 'Name the phase').max(120),
  focus: z.string().max(200).optional(),
  weeks: z.coerce.number().int().min(1, 'At least 1 week').max(52),
})

type MesoValues = z.input<typeof mesoSchema>

function MesocycleModal({
  open,
  onClose,
  templateId,
  mesocycle,
  nextSortOrder,
}: {
  open: boolean
  onClose: () => void
  templateId: string
  mesocycle: Mesocycle | null
  nextSortOrder: number
}) {
  const create = useCreateMesocycle()
  const update = useUpdateMesocycle()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MesoValues>({
    resolver: zodResolver(mesoSchema),
    values: {
      name: mesocycle?.name ?? '',
      focus: mesocycle?.focus ?? '',
      weeks: mesocycle?.weeks ?? 4,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const parsed = mesoSchema.parse(values)
    try {
      if (mesocycle) {
        await update.mutateAsync({
          id: mesocycle.id,
          name: parsed.name.trim(),
          focus: parsed.focus?.trim() || null,
          weeks: parsed.weeks,
        })
      } else {
        await create.mutateAsync({
          templateId,
          name: parsed.name.trim(),
          focus: parsed.focus?.trim() || null,
          weeks: parsed.weeks,
          sortOrder: nextSortOrder,
        })
      }
      toast(mesocycle ? 'Phase updated' : 'Phase added', 'success')
      onClose()
    } catch (error) {
      toastError(error, 'Could not save phase')
    }
  })

  return (
    <Modal open={open} onClose={onClose} title={mesocycle ? 'Edit phase' : 'Add phase'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meso-name">Name</Label>
          <Input id="meso-name" placeholder="e.g. Accumulation" {...register('name')} data-testid="meso-name" />
          {errors.name ? (
            <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meso-focus">Focus (optional)</Label>
          <Input id="meso-focus" placeholder="e.g. Base strength, tissue tolerance" {...register('focus')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meso-weeks">Weeks</Label>
          <Input id="meso-weeks" type="number" min={1} max={52} {...register('weeks')} />
          {errors.weeks ? (
            <p className="text-xs text-[var(--color-danger)]">{errors.weeks.message}</p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="meso-save">
            {mesocycle ? 'Save' : 'Add phase'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const rowSchema = z.object({
  day_code: z.string().min(1, 'Day is required').max(10),
  exercise: z.string().min(1, 'Exercise is required').max(160),
  prescription: z.string().max(200).optional(),
  target_rpe: z.string().max(40).optional(),
  rest: z.string().max(40).optional(),
})

type RowValues = z.infer<typeof rowSchema>

function SessionRowModal({
  open,
  onClose,
  templateId,
  mesocycleId,
  row,
  defaultDayCode,
  defaultWeekNumber,
  nextSortOrder,
}: {
  open: boolean
  onClose: () => void
  templateId: string
  mesocycleId: string
  row: TemplateSession | null
  defaultDayCode: string
  defaultWeekNumber: number | null
  nextSortOrder: number
}) {
  const add = useAddTemplateSession()
  const update = useUpdateTemplateSession()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RowValues>({
    resolver: zodResolver(rowSchema),
    values: {
      day_code: row?.day_code ?? defaultDayCode,
      exercise: row?.exercise ?? '',
      prescription: row?.prescription ?? '',
      target_rpe: row?.target_rpe ?? '',
      rest: row?.rest ?? '',
    },
  })

  const weekNumber = row?.week_number ?? defaultWeekNumber

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (row) {
        await update.mutateAsync({
          id: row.id,
          templateId,
          dayCode: values.day_code.trim().toUpperCase(),
          exercise: values.exercise.trim(),
          prescription: values.prescription?.trim() || null,
          targetRpe: values.target_rpe?.trim() || null,
          rest: values.rest?.trim() || null,
          weekNumber: row.week_number,
        })
      } else {
        await add.mutateAsync({
          templateId,
          mesocycleId,
          dayCode: values.day_code.trim().toUpperCase(),
          exercise: values.exercise.trim(),
          prescription: values.prescription?.trim() || null,
          targetRpe: values.target_rpe?.trim() || null,
          rest: values.rest?.trim() || null,
          sortOrder: nextSortOrder,
          weekNumber,
        })
      }
      onClose()
    } catch (error) {
      toastError(error, 'Could not save exercise')
    }
  })

  return (
    <Modal open={open} onClose={onClose} title={row ? 'Edit exercise' : 'Add exercise'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" data-testid="session-row-form">
        {weekNumber != null ? (
          <p className="text-sm text-[var(--color-muted)]">Adding to week {weekNumber}</p>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Applies to all weeks in this phase</p>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="row-day">Day</Label>
            <Select id="row-day" {...register('day_code')}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="row-exercise">Exercise</Label>
            <Input id="row-exercise" placeholder="e.g. Front squat" {...register('exercise')} data-testid="session-row-exercise" />
          </div>
        </div>
        {errors.exercise ? (
          <p className="-mt-2 text-xs text-[var(--color-danger)]">{errors.exercise.message}</p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="row-prescription">Prescription</Label>
          <Input id="row-prescription" placeholder="e.g. 3×6" {...register('prescription')} data-testid="session-row-prescription" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="row-rpe">Target RPE</Label>
            <Input id="row-rpe" placeholder="e.g. 7–8" {...register('target_rpe')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="row-rest">Rest</Label>
            <Input id="row-rest" placeholder="e.g. 2 min" {...register('rest')} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="session-row-save">
            {row ? 'Save' : 'Add'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
