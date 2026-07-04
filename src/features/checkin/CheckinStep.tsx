import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select, Textarea } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { cn } from '@/lib/utils'
import type { CommitCheckinInput } from '@/api/health'
import { BODY_AREA_LABEL, BODY_AREAS } from '@/lib/adjustments'
import type { ReportedInjury, Readiness } from '@/lib/adjustments'
import type { BodyArea, Injury, InjurySeverity } from '@/lib/types'

const SEVERITIES: InjurySeverity[] = ['mild', 'moderate', 'severe']
const SEVERITY_LABEL: Record<InjurySeverity, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
}

type InjuryAction = 'same' | 'better' | 'worse' | 'resolved'

export type CheckinResult = {
  readiness: Readiness
  reportedInjuries: ReportedInjury[]
  draft: CommitCheckinInput
}

function stepSeverity(severity: InjurySeverity, direction: 'up' | 'down'): InjurySeverity {
  const idx = SEVERITIES.indexOf(severity)
  const next = direction === 'up' ? idx + 1 : idx - 1
  return SEVERITIES[Math.min(SEVERITIES.length - 1, Math.max(0, next))]
}

function reportedSeverity(injury: Injury, action: InjuryAction): InjurySeverity {
  const current = injury.severity as InjurySeverity
  if (action === 'worse') return stepSeverity(current, 'up')
  if (action === 'better') return stepSeverity(current, 'down')
  return current
}

function Scale({
  label,
  value,
  onChange,
  lowHint,
  highHint,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
  lowHint: string
  highHint: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={cn(
              'h-10 flex-1 rounded-lg text-sm font-semibold transition-colors',
              value === n
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                : 'bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-fg)]',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-[var(--color-muted)]">
        <span>{lowHint}</span>
        <span>{highHint}</span>
      </div>
    </div>
  )
}

export function CheckinStep({
  activeInjuries,
  onSkip,
  onContinue,
}: {
  activeInjuries: Injury[]
  onSkip: () => void
  onContinue: (result: CheckinResult) => void
}) {
  const [sleep, setSleep] = useState<number | null>(null)
  const [soreness, setSoreness] = useState<number | null>(null)
  const [fatigue, setFatigue] = useState<number | null>(null)
  const [mood, setMood] = useState<number | null>(null)
  const [stress, setStress] = useState<number | null>(null)
  const [recovery, setRecovery] = useState<number | null>(null)
  const [overallFeeling, setOverallFeeling] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [actions, setActions] = useState<Map<string, InjuryAction>>(new Map())
  const [newInjuries, setNewInjuries] = useState<{ bodyArea: BodyArea; severity: InjurySeverity }[]>([])
  const [pickArea, setPickArea] = useState<BodyArea>('knee')
  const [pickSeverity, setPickSeverity] = useState<InjurySeverity>('mild')

  const actionFor = (id: string): InjuryAction => actions.get(id) ?? 'same'
  const setAction = (id: string, action: InjuryAction) =>
    setActions((prev) => new Map(prev).set(id, action))

  const addNewInjury = () => {
    setNewInjuries((prev) => [...prev, { bodyArea: pickArea, severity: pickSeverity }])
  }
  const removeNewInjury = (index: number) =>
    setNewInjuries((prev) => prev.filter((_, i) => i !== index))

  const onContinueClick = () => {
    const reported: ReportedInjury[] = []
    const injuryUpdates: CommitCheckinInput['injuryUpdates'] = []
    const existingJoins: CommitCheckinInput['existingJoins'] = []

    for (const injury of activeInjuries) {
      const action = actionFor(injury.id)
      if (action === 'resolved') {
        injuryUpdates.push({ injuryId: injury.id, status: 'resolved' })
        continue
      }
      const severity = reportedSeverity(injury, action)
      if (action === 'worse' || action === 'better') {
        injuryUpdates.push({
          injuryId: injury.id,
          severity,
          status: action === 'better' ? 'improving' : 'active',
        })
      }
      reported.push({ bodyArea: injury.body_area as BodyArea, severity })
      existingJoins.push({ injuryId: injury.id, severityAtTime: severity })
    }

    for (const n of newInjuries) {
      reported.push({ bodyArea: n.bodyArea, severity: n.severity })
    }

    const draft: CommitCheckinInput = {
      sleepQuality: sleep,
      soreness,
      fatigue,
      mood,
      stress,
      recovery,
      overallFeeling,
      notes: notes.trim() ? notes.trim() : null,
      injuryUpdates,
      existingJoins,
      newInjuries: [...newInjuries],
    }

    onContinue({
      readiness: { sleep, soreness, fatigue },
      reportedInjuries: reported,
      draft,
    })
  }

  const availableAreas = BODY_AREAS

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">Pre-workout check-in</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          A quick readiness and injury check tunes today's session. Skip if you feel great.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Readiness
          </h2>
          <Scale label="Sleep quality" value={sleep} onChange={setSleep} lowHint="Poor" highHint="Great" />
          <Scale label="Muscle soreness" value={soreness} onChange={setSoreness} lowHint="None" highHint="Severe" />
          <Scale label="Fatigue" value={fatigue} onChange={setFatigue} lowHint="Fresh" highHint="Exhausted" />
          <Scale label="Mood" value={mood} onChange={setMood} lowHint="Low" highHint="Great" />
          <Scale label="Stress" value={stress} onChange={setStress} lowHint="Calm" highHint="High" />
          <Scale label="Recovery" value={recovery} onChange={setRecovery} lowHint="Poor" highHint="Fully recovered" />
          <Scale label="Overall feeling" value={overallFeeling} onChange={setOverallFeeling} lowHint="Rough" highHint="Excellent" />
        </CardContent>
      </Card>

      {activeInjuries.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Active injuries
            </h2>
            {activeInjuries.map((injury) => {
              const action = actionFor(injury.id)
              return (
                <div key={injury.id} className="rounded-xl bg-[var(--color-surface-2)] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium text-[var(--color-fg)]">
                      {BODY_AREA_LABEL[injury.body_area as BodyArea]}
                    </span>
                    <Badge variant="outline">{SEVERITY_LABEL[injury.severity as InjurySeverity]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['better', 'same', 'worse', 'resolved'] as InjuryAction[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAction(injury.id, opt)}
                        aria-pressed={action === opt}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                          action === opt
                            ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                            : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-fg)]',
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            New injury or niggle
          </h2>
          {newInjuries.length > 0 ? (
            <div className="flex flex-col gap-2">
              {newInjuries.map((n, i) => (
                <div
                  key={`${n.bodyArea}-${i}`}
                  className="flex items-center justify-between rounded-xl bg-[var(--color-surface-2)] px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm text-[var(--color-fg)]">
                    {BODY_AREA_LABEL[n.bodyArea]}
                    <Badge variant="outline">{SEVERITY_LABEL[n.severity]}</Badge>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeNewInjury(i)}
                    aria-label="Remove"
                    className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Select value={pickArea} onChange={(e) => setPickArea(e.target.value as BodyArea)}>
              {availableAreas.map((area) => (
                <option key={area} value={area}>
                  {BODY_AREA_LABEL[area]}
                </option>
              ))}
            </Select>
            <Select
              value={pickSeverity}
              onChange={(e) => setPickSeverity(e.target.value as InjurySeverity)}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={addNewInjury}>
            <Plus className="h-4 w-4" /> Add injury
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1.5 p-5">
          <Label htmlFor="checkin-notes">Notes (optional)</Label>
          <Textarea
            id="checkin-notes"
            placeholder="Anything worth noting today…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-16 z-10 flex flex-col gap-2 md:bottom-4">
        <Button size="lg" className="w-full" onClick={onContinueClick}>
          Continue
        </Button>
        <Button variant="ghost" className="w-full" onClick={onSkip}>
          Feeling good, skip
        </Button>
      </div>
    </div>
  )
}
