// Parsers that turn free-text prescriptions ("3×6", "3×8/leg", "4×4/side",
// "2×10–12", "6–8 rounds of 10–15s") into seed data for the live tracker.

export type ParsedPrescription = {
  sets: number
  reps: number | null
  perSide: boolean
}

const SETS_REPS = /(\d+)\s*[×xX]\s*(\d+)/

// First rep number of a range like "8–10" / "10-12" -> 8/10.
function firstNumber(value: string): number | null {
  const match = value.match(/\d+/)
  return match ? Number(match[0]) : null
}

export function parsePrescription(text: string | null | undefined): ParsedPrescription {
  const fallback: ParsedPrescription = { sets: 3, reps: null, perSide: false }
  if (!text) return fallback

  const match = text.match(SETS_REPS)
  if (!match) {
    const perSide = /\/(leg|side|direction)|per side|each/i.test(text)
    return { sets: fallback.sets, reps: null, perSide }
  }

  const sets = Number(match[1])
  const reps = firstNumber(match[2])
  const perSide = /\/(leg|side|direction)|per side|each/i.test(text)
  return {
    sets: Number.isFinite(sets) && sets > 0 && sets <= 12 ? sets : fallback.sets,
    reps,
    perSide,
  }
}

// Rest text -> seconds, using the lower bound of any range.
// "2–3 min" -> 120, "90–120s" -> 90, "45s" -> 45, "2 min" -> 120.
export function parseRestSeconds(rest: string | null | undefined): number | null {
  if (!rest) return null
  const minutes = rest.match(/(\d+)(?:\s*[–-]\s*\d+)?\s*min/i)
  if (minutes) return Number(minutes[1]) * 60
  const seconds = rest.match(/(\d+)(?:\s*[–-]\s*\d+)?\s*s/i)
  if (seconds) return Number(seconds[1])
  return null
}

export function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(clamped / 3600)
  const minutes = Math.floor((clamped % 3600) / 60)
  const seconds = clamped % 60
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
