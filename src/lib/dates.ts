// Local calendar date as YYYY-MM-DD, using the device's timezone rather than
// UTC. Avoids the late-night bug where toISOString() rolls over to tomorrow.
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
