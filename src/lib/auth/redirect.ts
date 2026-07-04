export function authCallbackUrl(path = '/login'): string {
  return `${window.location.origin}${path}`
}
