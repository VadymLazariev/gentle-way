// Pure, unit-testable rules that translate a pre-workout check-in (injuries +
// readiness) into per-exercise adjustments. Aligned with the program's own
// philosophy: cut/scale accessories first, protect judo quality, never load a
// severely injured area.

import type { BodyArea, InjurySeverity } from '@/lib/types'

export type ReportedInjury = { bodyArea: BodyArea; severity: InjurySeverity }

export type Readiness = {
  sleep: number | null
  soreness: number | null
  fatigue: number | null
}

export type ExerciseInput = {
  prescriptionId: number
  exercise: string
  targetRpe: number | null
}

export type AdjustmentAction = 'keep' | 'cap_rpe' | 'swap' | 'skip'

export type ExerciseAdjustment = {
  prescriptionId: number
  exercise: string
  action: AdjustmentAction
  substitute: string | null
  rpeCap: number | null
  bodyArea: BodyArea | null
  reason: string | null
}

export type AdjustmentPlan = {
  adjustments: ExerciseAdjustment[]
  restRecommended: boolean
  restReason: string | null
}

export const BODY_AREA_LABEL: Record<BodyArea, string> = {
  shoulder: 'Shoulder',
  elbow: 'Elbow',
  wrist_grip: 'Wrist / grip',
  fingers: 'Fingers',
  neck: 'Neck',
  lower_back: 'Lower back',
  hip_groin: 'Hip / groin',
  knee: 'Knee',
  ankle: 'Ankle',
  other: 'Other',
}

export const BODY_AREAS: BodyArea[] = [
  'shoulder',
  'elbow',
  'wrist_grip',
  'fingers',
  'neck',
  'lower_back',
  'hip_groin',
  'knee',
  'ankle',
  'other',
]

const CLASSIFIER: { match: RegExp; areas: BodyArea[] }[] = [
  { match: /front squat|back squat|\bsquat\b|lunge|split squat|step[- ]?up|leg press|pistol|leg extension/i, areas: ['knee', 'hip_groin'] },
  { match: /deadlift|romanian|\brdl\b|good morning|hip thrust|kettlebell swing|\bkb swing\b|hyperextension|back extension/i, areas: ['lower_back', 'hip_groin'] },
  { match: /copenhagen|adductor|groin|nordic|hamstring curl/i, areas: ['hip_groin'] },
  { match: /overhead press|push press|military|\bbench\b|push[- ]?up|\bdip\b|shoulder press|lateral raise|\bpress\b/i, areas: ['shoulder'] },
  { match: /pull[- ]?up|chin[- ]?up|lat pulldown|pulldown|judogi|\bgi\b|towel|rope climb/i, areas: ['wrist_grip', 'elbow', 'shoulder'] },
  { match: /barbell row|bent[- ]?over row|\brow\b|face pull/i, areas: ['shoulder', 'elbow'] },
  { match: /curl/i, areas: ['elbow'] },
  { match: /farmer|carry|\bhang\b|grip|wrist/i, areas: ['wrist_grip'] },
  { match: /neck/i, areas: ['neck'] },
  { match: /calf|ankle|tibialis/i, areas: ['ankle'] },
]

const SUBSTITUTIONS: Partial<Record<BodyArea, { match: RegExp; to: string }[]>> = {
  knee: [
    { match: /front squat/i, to: 'Box squat' },
    { match: /back squat|\bsquat\b|lunge|split squat|step[- ]?up|pistol/i, to: 'Leg press (partial range)' },
    { match: /leg extension/i, to: 'Wall sit (isometric)' },
  ],
  shoulder: [
    { match: /overhead press|push press|military|shoulder press|\bpress\b/i, to: 'Neutral-grip DB press' },
    { match: /\bbench\b/i, to: 'Floor press (neutral grip)' },
    { match: /pull[- ]?up|chin[- ]?up/i, to: 'Neutral-grip lat pulldown' },
    { match: /lateral raise/i, to: 'Cable lateral raise (light)' },
  ],
  lower_back: [
    { match: /deadlift|romanian|\brdl\b|good morning/i, to: 'Hip thrust' },
    { match: /barbell row|bent[- ]?over row|\brow\b/i, to: 'Chest-supported row' },
  ],
  hip_groin: [
    { match: /copenhagen/i, to: 'Side-lying adductor raise' },
    { match: /nordic|hamstring curl/i, to: 'Machine hamstring curl (light)' },
  ],
  elbow: [
    { match: /chin[- ]?up|pull[- ]?up/i, to: 'Neutral-grip lat pulldown' },
    { match: /curl/i, to: 'Hammer curl' },
    { match: /\brow\b/i, to: 'Chest-supported row (neutral grip)' },
  ],
  wrist_grip: [
    { match: /\brow\b|pulldown|pull[- ]?up|chin[- ]?up/i, to: 'Machine row with straps' },
    { match: /farmer|carry/i, to: 'Straps carry' },
  ],
}

const SEVERITY_RANK: Record<InjurySeverity, number> = { mild: 1, moderate: 2, severe: 3 }

export function classifyExercise(exercise: string): BodyArea[] {
  const areas = new Set<BodyArea>()
  for (const rule of CLASSIFIER) {
    if (rule.match.test(exercise)) {
      for (const area of rule.areas) areas.add(area)
    }
  }
  return [...areas]
}

function findSubstitute(exercise: string, area: BodyArea): string | null {
  const table = SUBSTITUTIONS[area]
  if (!table) return null
  for (const entry of table) {
    if (entry.match.test(exercise)) return entry.to
  }
  return null
}

function cappedRpe(targetRpe: number | null): number {
  if (targetRpe == null) return 7
  return Math.max(6, Math.round((targetRpe - 1) * 2) / 2)
}

// Very poor readiness: both sleep and fatigue at their worst.
function isRestLevelReadiness(readiness: Readiness): boolean {
  const { sleep, fatigue } = readiness
  return sleep != null && fatigue != null && sleep <= 2 && fatigue <= 2
}

// Softer readiness dip: warrants a global RPE trim but not a rest day.
function isLowReadiness(readiness: Readiness): boolean {
  const { sleep, soreness, fatigue } = readiness
  return (sleep != null && sleep <= 2) || (fatigue != null && fatigue <= 2) || (soreness != null && soreness >= 4)
}

export function buildAdjustmentPlan(
  exercises: ExerciseInput[],
  injuries: ReportedInjury[],
  readiness: Readiness,
): AdjustmentPlan {
  const severeInjury = injuries.find((i) => i.severity === 'severe') ?? null
  const restFromReadiness = isRestLevelReadiness(readiness)
  const lowReadiness = isLowReadiness(readiness)

  const injuryByArea = new Map<BodyArea, InjurySeverity>()
  for (const injury of injuries) {
    const current = injuryByArea.get(injury.bodyArea)
    if (!current || SEVERITY_RANK[injury.severity] > SEVERITY_RANK[current]) {
      injuryByArea.set(injury.bodyArea, injury.severity)
    }
  }

  const adjustments = exercises.map<ExerciseAdjustment>((ex) => {
    const areas = classifyExercise(ex.exercise)

    let worstArea: BodyArea | null = null
    let worstSeverity: InjurySeverity | null = null
    for (const area of areas) {
      const severity = injuryByArea.get(area)
      if (severity && (!worstSeverity || SEVERITY_RANK[severity] > SEVERITY_RANK[worstSeverity])) {
        worstSeverity = severity
        worstArea = area
      }
    }

    if (worstSeverity && worstArea) {
      const label = BODY_AREA_LABEL[worstArea]
      if (worstSeverity === 'severe') {
        return {
          prescriptionId: ex.prescriptionId,
          exercise: ex.exercise,
          action: 'skip',
          substitute: null,
          rpeCap: null,
          bodyArea: worstArea,
          reason: `Severe ${label.toLowerCase()} injury — skipped`,
        }
      }
      if (worstSeverity === 'moderate') {
        const substitute = findSubstitute(ex.exercise, worstArea)
        if (substitute) {
          return {
            prescriptionId: ex.prescriptionId,
            exercise: ex.exercise,
            action: 'swap',
            substitute,
            rpeCap: null,
            bodyArea: worstArea,
            reason: `${label} — swapped to a safer variation`,
          }
        }
        return {
          prescriptionId: ex.prescriptionId,
          exercise: ex.exercise,
          action: 'skip',
          substitute: null,
          rpeCap: null,
          bodyArea: worstArea,
          reason: `${label} — no safe variation, skipped`,
        }
      }
      // mild
      return {
        prescriptionId: ex.prescriptionId,
        exercise: ex.exercise,
        action: 'cap_rpe',
        substitute: null,
        rpeCap: cappedRpe(ex.targetRpe),
        bodyArea: worstArea,
        reason: `${label} niggle — RPE capped`,
      }
    }

    if (lowReadiness && !restFromReadiness) {
      return {
        prescriptionId: ex.prescriptionId,
        exercise: ex.exercise,
        action: 'cap_rpe',
        substitute: null,
        rpeCap: cappedRpe(ex.targetRpe),
        bodyArea: null,
        reason: 'Low readiness — RPE capped',
      }
    }

    return {
      prescriptionId: ex.prescriptionId,
      exercise: ex.exercise,
      action: 'keep',
      substitute: null,
      rpeCap: null,
      bodyArea: null,
      reason: null,
    }
  })

  let restRecommended = false
  let restReason: string | null = null
  if (severeInjury) {
    restRecommended = true
    restReason = `Severe ${BODY_AREA_LABEL[severeInjury.bodyArea].toLowerCase()} injury — a rest or rehab day is recommended.`
  } else if (restFromReadiness) {
    restRecommended = true
    restReason = 'Very low readiness (poor sleep and high fatigue) — consider resting today.'
  }

  return { adjustments, restRecommended, restReason }
}

export function hasEffect(adjustment: ExerciseAdjustment): boolean {
  return adjustment.action !== 'keep'
}

export function summarizeReadiness(readiness: Readiness): string | null {
  const parts: string[] = []
  if (readiness.sleep != null) parts.push(`Sleep ${readiness.sleep}/5`)
  if (readiness.soreness != null) parts.push(`Soreness ${readiness.soreness}/5`)
  if (readiness.fatigue != null) parts.push(`Fatigue ${readiness.fatigue}/5`)
  return parts.length > 0 ? parts.join(' · ') : null
}
