import { env } from '@/lib/env'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function pushConfigured(): boolean {
  return Boolean(env.VITE_VAPID_PUBLIC_KEY)
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription | null> {
  const publicKey = env.VITE_VAPID_PUBLIC_KEY
  if (!publicKey) return null

  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  })
}

export type PushSubscriptionPayload = {
  endpoint: string
  p256dh: string
  auth: string
}

export function serializePushSubscription(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('Invalid push subscription')
  }
  return { endpoint: json.endpoint, p256dh, auth }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.requestPermission()
}

export async function enablePushReminders(): Promise<{
  permission: NotificationPermission
  subscription: PushSubscriptionPayload | null
}> {
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    return { permission, subscription: null }
  }

  const registration = await registerServiceWorker()
  if (!registration) {
    return { permission, subscription: null }
  }

  const subscription = await subscribeToPush(registration)
  if (!subscription) {
    return { permission, subscription: null }
  }

  return { permission, subscription: serializePushSubscription(subscription) }
}

export async function disablePushReminders(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  await subscription?.unsubscribe()
}
