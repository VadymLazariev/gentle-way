import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Toaster, toastError } from '@/components/ui/Toast'
import { authCallbackUrl } from '@/lib/auth/redirect'
import { supabase } from '@/lib/supabase'
import { sanitizeNumericInput } from '@/lib/numeric'
import type { InviteStatus } from '@/lib/types'

const schema = z
  .object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Use at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
    name: z.string().min(1, 'Enter your name').max(80),
    sex: z.enum(['male', 'female', 'other']),
    dob: z.string().min(1, 'Pick your date of birth'),
    heightCm: z.coerce.number().min(80, 'Too low').max(260, 'Too high'),
    startingWeightKg: z.coerce.number().min(20, 'Too low').max(400, 'Too high'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type FormValues = z.input<typeof schema>

const STEPS = ['Account', 'About you', 'Review'] as const
type StepFields = Array<keyof FormValues>
const STEP_FIELDS: StepFields[] = [
  ['email', 'password', 'confirmPassword'],
  ['name', 'sex', 'dob', 'heightCm', 'startingWeightKg'],
  [],
]

function withSanitizer(reg: UseFormRegisterReturn, allowDecimal: boolean): UseFormRegisterReturn {
  return {
    ...reg,
    onChange: (e) => {
      const target = e.target
      if (target instanceof HTMLInputElement) {
        target.value = sanitizeNumericInput(target.value, allowDecimal)
      }
      return reg.onChange(e)
    },
  }
}

export function OnboardPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<InviteStatus | 'loading'>('loading')

  const checkToken = useCallback(async () => {
    if (!token) {
      setStatus('invalid')
      return
    }
    setStatus('loading')
    const { data, error } = await supabase.rpc('invite_status', { p_token: token })
    if (error) {
      setStatus('invalid')
      return
    }
    setStatus((data as InviteStatus) ?? 'invalid')
  }, [token])

  useEffect(() => {
    void checkToken()
  }, [checkToken])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-10">
      <div className="w-full max-w-md">
        {status === 'loading' ? (
          <CenteredCard>
            <Loader2 className="h-7 w-7 animate-spin text-[var(--color-muted)]" />
            <p className="text-sm text-[var(--color-muted)]">Checking your invitation…</p>
          </CenteredCard>
        ) : status === 'valid' ? (
          <OnboardForm token={token!} />
        ) : (
          <InvalidInvite status={status} onRetry={checkToken} />
        )}
      </div>
      <Toaster />
    </div>
  )
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        {children}
      </CardContent>
    </Card>
  )
}

function InvalidInvite({
  status,
  onRetry,
}: {
  status: Exclude<InviteStatus, 'valid'>
  onRetry: () => void
}) {
  const copy: Record<Exclude<InviteStatus, 'valid'>, { title: string; body: string }> = {
    invalid: {
      title: 'Invitation not found',
      body: 'This onboarding link is not valid. Ask your coach to send you a fresh link.',
    },
    used: {
      title: 'Invitation already used',
      body: 'This link has already been redeemed. If that was not you, contact your coach.',
    },
    expired: {
      title: 'Invitation expired',
      body: 'This onboarding link has expired. Ask your coach to generate a new one.',
    },
  }
  const { title, body } = copy[status]
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-danger)_16%,transparent)] text-[var(--color-danger)]">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-fg)]">{title}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{body}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
          <Link to="/login">
            <Button variant="ghost">Go to sign in</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function OnboardForm({ token }: { token: string }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      sex: 'male',
      dob: '',
      heightCm: 175,
      startingWeightKg: 75,
    },
  })

  const goNext = async () => {
    const ok = await trigger(STEP_FIELDS[step])
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const onSubmit = handleSubmit(async (raw) => {
    const values = schema.parse(raw)
    try {
      const { data: signUp, error: signUpError } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          emailRedirectTo: authCallbackUrl(`/onboard/${token}`),
          data: { role: 'client', name: values.name.trim() },
        },
      })
      if (signUpError) throw signUpError

      let userId = signUp.user?.id ?? null
      if (!signUp.session) {
        const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email.trim(),
          password: values.password,
        })
        if (signInError) throw signInError
        userId = signIn.user?.id ?? userId
      }
      if (!userId) throw new Error('Sign up did not return a session')

      const { error: redeemError } = await supabase.rpc('redeem_invite', { p_token: token })
      if (redeemError) throw redeemError

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: values.name.trim(),
          sex: values.sex,
          date_of_birth: values.dob,
          height_cm: values.heightCm,
          starting_weight_kg: values.startingWeightKg,
        })
        .eq('id', userId)
      if (profileError) throw profileError

      setDone(true)
    } catch (error) {
      toastError(error, 'Could not complete onboarding')
    }
  })

  if (done) return <OnboardSuccess onContinue={() => navigate('/', { replace: true })} />

  return (
    <div>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-fg)]">
            Welcome to your training
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Your coach set this up for you. A couple of quick steps and you're in.
          </p>
        </div>
      </div>

      <Stepper step={step} />

      <Card className="mt-4">
        <CardContent className="pt-5">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {step === 0 ? (
              <>
                <Field label="Email" error={errors.email?.message}>
                  <Input type="email" autoComplete="email" {...register('email')} />
                </Field>
                <Field label="Password" error={errors.password?.message}>
                  <Input type="password" autoComplete="new-password" {...register('password')} />
                </Field>
                <Field label="Confirm password" error={errors.confirmPassword?.message}>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                  />
                </Field>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Field label="Full name" error={errors.name?.message}>
                  <Input type="text" autoComplete="name" {...register('name')} />
                </Field>
                <Field label="Sex" error={errors.sex?.message}>
                  <Select {...register('sex')}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                <Field label="Date of birth" error={errors.dob?.message}>
                  <Input type="date" {...register('dob')} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Height (cm)" error={errors.heightCm?.message}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      {...withSanitizer(register('heightCm'), true)}
                    />
                  </Field>
                  <Field label="Starting weight (kg)" error={errors.startingWeightKg?.message}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      {...withSanitizer(register('startingWeightKg'), true)}
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {step === 2 ? <ReviewStep values={getValues()} /> : null}

            <div className="mt-1 flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep((s) => Math.max(s - 1, 0))}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={goNext}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Setting up…' : 'Finish & enter'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col gap-1.5">
          <div
            className={
              i <= step
                ? 'h-1.5 rounded-full bg-[var(--color-primary)]'
                : 'h-1.5 rounded-full bg-[var(--color-surface-2)]'
            }
          />
          <span
            className={
              i <= step
                ? 'text-[11px] font-medium text-[var(--color-fg)]'
                : 'text-[11px] text-[var(--color-muted)]'
            }
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  )
}

function ReviewStep({ values }: { values: FormValues }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Email', value: String(values.email) },
    { label: 'Name', value: String(values.name) },
    { label: 'Sex', value: String(values.sex) },
    { label: 'Date of birth', value: String(values.dob) },
    { label: 'Height', value: `${values.heightCm} cm` },
    { label: 'Starting weight', value: `${values.startingWeightKg} kg` },
  ]
  return (
    <div className="flex flex-col gap-1">
      <p className="mb-2 text-sm text-[var(--color-muted)]">
        Check everything looks right, then finish to enter your app.
      </p>
      <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
              {row.label}
            </span>
            <span className="text-sm font-medium text-[var(--color-fg)]">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OnboardSuccess({ onContinue }: { onContinue: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-success)_16%,transparent)] text-[var(--color-success)]">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-fg)]">You're all set</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Your account is ready and linked to your coach. Time to train.
          </p>
        </div>
        <Button size="lg" className="w-full" onClick={onContinue}>
          Enter your app <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
