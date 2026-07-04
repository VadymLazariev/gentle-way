import { useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast, toastError } from '@/components/ui/Toast'
import {
  useDeletePushSubscription,
  usePushSubscriptions,
  useSavePushSubscription,
} from '@/api/push'
import {
  disablePushReminders,
  enablePushReminders,
  isPushSupported,
  pushConfigured,
  registerServiceWorker,
} from '@/lib/push'

export function ReminderSettings() {
  const subscriptions = usePushSubscriptions()
  const saveSubscription = useSavePushSubscription()
  const deleteSubscription = useDeletePushSubscription()
  const [busy, setBusy] = useState(false)

  const supported = isPushSupported()
  const configured = pushConfigured()
  const enabled = (subscriptions.data?.length ?? 0) > 0

  const onEnable = async () => {
    setBusy(true)
    try {
      await registerServiceWorker()
      const { permission, subscription } = await enablePushReminders()
      if (permission !== 'granted') {
        toast('Notification permission denied', 'error')
        return
      }
      if (!subscription) {
        if (!configured) {
          toast('In-app reminders enabled. Add VAPID keys for push when the app is closed.', 'success')
        } else {
          toast('Could not create push subscription', 'error')
        }
        return
      }
      await saveSubscription.mutateAsync({
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        userAgent: navigator.userAgent,
      })
      toast('Reminders enabled', 'success')
    } catch (error) {
      toastError(error, 'Could not enable reminders')
    } finally {
      setBusy(false)
    }
  }

  const onDisable = async () => {
    setBusy(true)
    try {
      await disablePushReminders()
      for (const row of subscriptions.data ?? []) {
        await deleteSubscription.mutateAsync(row.endpoint)
      }
      toast('Reminders disabled', 'success')
    } catch (error) {
      toastError(error, 'Could not disable reminders')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card data-testid="reminder-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--color-accent)]" />
          Supplement reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!supported ? (
          <p className="text-sm text-[var(--color-muted)]">
            Push notifications are not supported in this browser.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--color-muted)]">
              Get notified when it is time to take a supplement. Due doses also appear on Today and
              Supplements when the app is open.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={enabled ? 'primary' : 'outline'}>
                {enabled ? 'Reminders on' : 'Reminders off'}
              </Badge>
              {!configured ? (
                <Badge variant="outline">Push keys not configured — in-app only</Badge>
              ) : null}
            </div>
            <div>
              {enabled ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  data-testid="disable-reminders-btn"
                  onClick={onDisable}
                >
                  <BellOff className="h-4 w-4" />
                  Disable reminders
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={busy}
                  data-testid="enable-reminders-btn"
                  onClick={onEnable}
                >
                  <Bell className="h-4 w-4" />
                  Enable reminders
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
