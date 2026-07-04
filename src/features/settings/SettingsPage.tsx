import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { LoadingState, ErrorState } from '@/components/ui/Feedback'
import { useClientSettings, useUpdateSettings } from '@/api/settings'
import { InjuriesSection } from '@/features/settings/InjuriesSection'
import { computeCurrentWeek, TOTAL_WEEKS } from '@/lib/program'
import { sanitizeNumericInput } from '@/lib/numeric'

export function SettingsPage() {
  const settings = useClientSettings()
  const update = useUpdateSettings()

  const [startDate, setStartDate] = useState('')
  const [manual, setManual] = useState(false)
  const [manualWeek, setManualWeek] = useState('1')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings.data) {
      setStartDate(settings.data.program_start_date)
      setManual(settings.data.current_week != null)
      setManualWeek(String(settings.data.current_week ?? 1))
    }
  }, [settings.data])

  if (settings.isLoading) return <LoadingState />
  if (settings.isError || !settings.data) return <ErrorState />

  const autoWeek = startDate ? computeCurrentWeek(startDate) : 1
  const effectiveWeek = manual ? clampWeek(Number(manualWeek)) : autoWeek

  const onSave = async () => {
    await update.mutateAsync({
      program_start_date: startDate,
      current_week: manual ? clampWeek(Number(manualWeek)) : null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Program anchor and week tracking" />

      <div className="flex max-w-xl flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Program timing</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Program start date (Week 1, Monday)</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="text-xs text-[var(--color-muted)]">
                Today maps to <span className="text-[var(--color-fg)]">Week {autoWeek}</span> based on
                this date.
              </p>
            </div>

            <label className="flex items-center gap-2.5 rounded-xl bg-[var(--color-surface-2)] p-3">
              <input
                type="checkbox"
                checked={manual}
                onChange={(e) => setManual(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm text-[var(--color-fg)]">Manually set current week</span>
            </label>

            {manual ? (
              <div className="flex flex-col gap-1.5">
                <Label>Current week</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={manualWeek}
                  onChange={(e) => setManualWeek(sanitizeNumericInput(e.target.value, false))}
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <Badge variant="primary">Active: Week {effectiveWeek}</Badge>
              <Button onClick={onSave} disabled={update.isPending || !startDate}>
                {saved ? (
                  <>
                    <Check className="h-4 w-4" /> Saved
                  </>
                ) : (
                  'Save settings'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <InjuriesSection />
      </div>
    </div>
  )
}

function clampWeek(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(Math.max(Math.round(value), 1), TOTAL_WEEKS)
}
