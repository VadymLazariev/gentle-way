import type { BodyMeasurement } from '@/lib/types'

export type MeasurementFieldKey =
  | 'weight_kg'
  | 'height_cm'
  | 'neck_cm'
  | 'shoulder_cm'
  | 'bicep_left_cm'
  | 'bicep_right_cm'
  | 'chest_cm'
  | 'abdomen_cm'
  | 'waist_cm'
  | 'hip_cm'
  | 'thigh_left_cm'
  | 'thigh_right_cm'
  | 'calf_left_cm'
  | 'calf_right_cm'

export type MeasurementFieldDef = {
  key: MeasurementFieldKey
  label: string
  unit: 'kg' | 'cm'
  min: number
  max: number
  step: number
  decimals: number
}

export const MEASUREMENT_FIELDS: MeasurementFieldDef[] = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg', min: 30, max: 200, step: 0.1, decimals: 1 },
  { key: 'height_cm', label: 'Height', unit: 'cm', min: 120, max: 230, step: 0.5, decimals: 1 },
  { key: 'neck_cm', label: 'Neck', unit: 'cm', min: 20, max: 60, step: 0.1, decimals: 1 },
  { key: 'shoulder_cm', label: 'Shoulder', unit: 'cm', min: 80, max: 180, step: 0.1, decimals: 1 },
  { key: 'bicep_left_cm', label: 'L bicep', unit: 'cm', min: 15, max: 60, step: 0.1, decimals: 1 },
  { key: 'bicep_right_cm', label: 'R bicep', unit: 'cm', min: 15, max: 60, step: 0.1, decimals: 1 },
  { key: 'chest_cm', label: 'Chest', unit: 'cm', min: 60, max: 180, step: 0.1, decimals: 1 },
  { key: 'abdomen_cm', label: 'Abdomen', unit: 'cm', min: 50, max: 180, step: 0.1, decimals: 1 },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', min: 50, max: 180, step: 0.1, decimals: 1 },
  { key: 'hip_cm', label: 'Hip', unit: 'cm', min: 60, max: 180, step: 0.1, decimals: 1 },
  { key: 'thigh_left_cm', label: 'L thigh', unit: 'cm', min: 30, max: 100, step: 0.1, decimals: 1 },
  { key: 'thigh_right_cm', label: 'R thigh', unit: 'cm', min: 30, max: 100, step: 0.1, decimals: 1 },
  { key: 'calf_left_cm', label: 'L calf', unit: 'cm', min: 20, max: 60, step: 0.1, decimals: 1 },
  { key: 'calf_right_cm', label: 'R calf', unit: 'cm', min: 20, max: 60, step: 0.1, decimals: 1 },
]

export function fieldDefForKey(key: MeasurementFieldKey): MeasurementFieldDef {
  const found = MEASUREMENT_FIELDS.find((f) => f.key === key)
  if (!found) throw new Error(`Unknown measurement field: ${key}`)
  return found
}

export function resolveExistingHeight(
  profileHeightCm: number | null | undefined,
  latestMeasurement: BodyMeasurement | null | undefined,
): number | null {
  if (profileHeightCm != null) return profileHeightCm
  const fromMeasurement = latestMeasurement?.height_cm
  if (fromMeasurement != null) return fromMeasurement
  return null
}

export function wizardFieldsForEntry(options: {
  profileHeightCm?: number | null
  initial?: BodyMeasurement | null
}): MeasurementFieldDef[] {
  const existingHeight = resolveExistingHeight(options.profileHeightCm, options.initial)
  if (existingHeight != null) {
    return MEASUREMENT_FIELDS.filter((field) => field.key !== 'height_cm')
  }
  return MEASUREMENT_FIELDS
}

export function seedMeasurementValues(options: {
  initial?: BodyMeasurement | null
  profileHeightCm?: number | null
}): Partial<Record<MeasurementFieldKey, number>> {
  const seed: Partial<Record<MeasurementFieldKey, number>> = {}
  for (const field of MEASUREMENT_FIELDS) {
    const existing = options.initial?.[field.key]
    if (typeof existing === 'number') seed[field.key] = existing
  }
  const height = resolveExistingHeight(options.profileHeightCm, options.initial)
  if (height != null) seed.height_cm = height
  return seed
}

export type BodyMeasurementValues = Partial<Record<MeasurementFieldKey, number | null>>

export type MeasurementSnapshot = {
  measured_at: string
  body_measurement_id: string
} & BodyMeasurementValues

export function buildMeasurementSnapshot(row: BodyMeasurement): MeasurementSnapshot {
  const snapshot: MeasurementSnapshot = {
    measured_at: row.measured_at,
    body_measurement_id: row.id,
  }

  for (const field of MEASUREMENT_FIELDS) {
    const value = row[field.key] as number | null
    if (value != null) snapshot[field.key] = value
  }

  return snapshot
}

export function snapshotReviewEntries(
  snapshot: MeasurementSnapshot,
): { label: string; value: number; unit: 'kg' | 'cm'; decimals: number }[] {
  const entries: { label: string; value: number; unit: 'kg' | 'cm'; decimals: number }[] = []
  for (const field of MEASUREMENT_FIELDS) {
    const value = snapshot[field.key]
    if (value != null) {
      entries.push({
        label: field.label,
        value,
        unit: field.unit,
        decimals: field.decimals,
      })
    }
  }
  return entries
}

export function measurementTrendFields(): MeasurementFieldDef[] {
  return MEASUREMENT_FIELDS.filter((f) => f.key === 'weight_kg' || f.unit === 'cm')
}

export function buildMeasurementInsert(
  measuredAt: string,
  values: Partial<Record<MeasurementFieldKey, number>>,
  notes: string | null,
): Omit<BodyMeasurement, 'id' | 'client_id' | 'created_at' | 'updated_at'> {
  const payload: Omit<BodyMeasurement, 'id' | 'client_id' | 'created_at' | 'updated_at'> = {
    measured_at: measuredAt,
    notes,
    custom_fields: {},
    weight_kg: null,
    height_cm: null,
    neck_cm: null,
    shoulder_cm: null,
    bicep_left_cm: null,
    bicep_right_cm: null,
    chest_cm: null,
    abdomen_cm: null,
    waist_cm: null,
    hip_cm: null,
    thigh_left_cm: null,
    thigh_right_cm: null,
    calf_left_cm: null,
    calf_right_cm: null,
  }

  for (const field of MEASUREMENT_FIELDS) {
    const value = values[field.key]
    payload[field.key] = value ?? null
  }

  return payload
}
