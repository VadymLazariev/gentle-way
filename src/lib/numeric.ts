// Free-text numeric input guardrails. Keeps only digits and at most one
// decimal separator (comma is normalized to a dot); negative signs are dropped
// so values clamp to non-negative.
export function sanitizeNumericInput(raw: string, allowDecimal = true): string {
  let out = ''
  let hasDot = false
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      out += ch
    } else if (allowDecimal && (ch === '.' || ch === ',') && !hasDot) {
      out += '.'
      hasDot = true
    }
  }
  return out
}

// Parse a sanitized numeric string, clamping negatives to 0. Returns null for
// empty or non-finite input so callers can fall back to a saved value.
export function parseNumericInput(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return null
  return n < 0 ? 0 : n
}
