import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { CoachLayout } from '@/components/layout/CoachLayout'
import { ProtectedRoute } from '@/components/routing/ProtectedRoute'
import { RoleRoute } from '@/components/routing/RoleRoute'
import { LoadingState } from '@/components/ui/Feedback'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'

const OnboardPage = lazy(() =>
  import('@/features/onboarding/OnboardPage').then((m) => ({ default: m.OnboardPage })),
)
const ClientsPage = lazy(() =>
  import('@/features/coach/ClientsPage').then((m) => ({ default: m.ClientsPage })),
)
const ClientDetailPage = lazy(() =>
  import('@/features/coach/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })),
)
const ProgramsPage = lazy(() =>
  import('@/features/coach/ProgramsPage').then((m) => ({ default: m.ProgramsPage })),
)
const TemplateDetailPage = lazy(() =>
  import('@/features/coach/TemplateDetailPage').then((m) => ({ default: m.TemplateDetailPage })),
)
const ReportsPage = lazy(() =>
  import('@/features/coach/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
const CoachAnalyticsOverviewPage = lazy(() =>
  import('@/features/coach/AnalyticsPage').then((m) => ({
    default: m.CoachAnalyticsOverviewPage,
  })),
)
const CoachNutritionPage = lazy(() =>
  import('@/features/coach/CoachNutritionPage').then((m) => ({ default: m.CoachNutritionPage })),
)
const TemplateBuilderPage = lazy(() =>
  import('@/features/coach/TemplateBuilderPage').then((m) => ({ default: m.TemplateBuilderPage })),
)
const AnalyticsPage = lazy(() =>
  import('@/features/coach/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)

const TodayPage = lazy(() =>
  import('@/features/today/TodayPage').then((m) => ({ default: m.TodayPage })),
)
const ProgramPage = lazy(() =>
  import('@/features/program/ProgramPage').then((m) => ({ default: m.ProgramPage })),
)
const WeekPage = lazy(() =>
  import('@/features/program/WeekPage').then((m) => ({ default: m.WeekPage })),
)
const StartWorkoutPage = lazy(() =>
  import('@/features/session/StartWorkoutPage').then((m) => ({ default: m.StartWorkoutPage })),
)
const TemplatePreviewPage = lazy(() =>
  import('@/features/session/TemplatePreviewPage').then((m) => ({
    default: m.TemplatePreviewPage,
  })),
)
const LiveSessionPage = lazy(() =>
  import('@/features/session/LiveSessionPage').then((m) => ({ default: m.LiveSessionPage })),
)
const SessionSummaryPage = lazy(() =>
  import('@/features/session/SessionSummaryPage').then((m) => ({ default: m.SessionSummaryPage })),
)
const LogbookPage = lazy(() =>
  import('@/features/logbook/LogbookPage').then((m) => ({ default: m.LogbookPage })),
)
const ProgressPage = lazy(() =>
  import('@/features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })),
)
const MeasurementsPage = lazy(() =>
  import('@/features/measurements/MeasurementsPage').then((m) => ({ default: m.MeasurementsPage })),
)
const WeeklyReportPage = lazy(() =>
  import('@/features/reports/WeeklyReportPage').then((m) => ({ default: m.WeeklyReportPage })),
)
const GoalsPage = lazy(() =>
  import('@/features/goals/GoalsPage').then((m) => ({ default: m.GoalsPage })),
)
const SupplementsPage = lazy(() =>
  import('@/features/supplements/SupplementsPage').then((m) => ({ default: m.SupplementsPage })),
)
const AttendancePage = lazy(() =>
  import('@/features/attendance/AttendancePage').then((m) => ({ default: m.AttendancePage })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const NutritionDashboardPage = lazy(() =>
  import('@/features/nutrition/NutritionDashboardPage').then((m) => ({
    default: m.NutritionDashboardPage,
  })),
)
const NutritionDiaryPage = lazy(() =>
  import('@/features/nutrition/NutritionDiaryPage').then((m) => ({ default: m.NutritionDiaryPage })),
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/onboard/:token"
          element={
            <Suspense fallback={<LoadingState />}>
              <OnboardPage />
            </Suspense>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allow="client" />}>
            <Route element={<AppLayout />}>
              <Route
                path="/"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <TodayPage />
                  </Suspense>
                }
              />
              <Route
                path="/program"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <ProgramPage />
                  </Suspense>
                }
              />
              <Route
                path="/program/week/:week"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <WeekPage />
                  </Suspense>
                }
              />
              <Route
                path="/start"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <StartWorkoutPage />
                  </Suspense>
                }
              />
              <Route
                path="/start/:week/:day"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <TemplatePreviewPage />
                  </Suspense>
                }
              />
              <Route
                path="/session/:week/:day"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <LiveSessionPage />
                  </Suspense>
                }
              />
              <Route
                path="/summary/:sessionId"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <SessionSummaryPage />
                  </Suspense>
                }
              />
              <Route
                path="/logbook"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <LogbookPage />
                  </Suspense>
                }
              />
              <Route
                path="/progress"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <ProgressPage />
                  </Suspense>
                }
              />
              <Route
                path="/measurements"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <MeasurementsPage />
                  </Suspense>
                }
              />
              <Route
                path="/weekly-report"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <WeeklyReportPage />
                  </Suspense>
                }
              />
              <Route
                path="/goals"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <GoalsPage />
                  </Suspense>
                }
              />
              <Route
                path="/supplements"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <SupplementsPage />
                  </Suspense>
                }
              />
              <Route
                path="/attendance"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <AttendancePage />
                  </Suspense>
                }
              />
              <Route
                path="/nutrition"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <NutritionDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="/nutrition/diary"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <NutritionDiaryPage />
                  </Suspense>
                }
              />
              <Route
                path="/settings"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>

          <Route element={<RoleRoute allow="coach" />}>
            <Route path="/coach" element={<CoachLayout />}>
              <Route index element={<Navigate to="/coach/clients" replace />} />
              <Route
                path="clients"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <ClientsPage />
                  </Suspense>
                }
              />
              <Route
                path="clients/:clientId"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <ClientDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="programs"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <ProgramsPage />
                  </Suspense>
                }
              />
              <Route
                path="programs/:templateId"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <TemplateDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="reports"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <ReportsPage />
                  </Suspense>
                }
              />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <CoachAnalyticsOverviewPage />
                  </Suspense>
                }
              />
              <Route
                path="nutrition"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <CoachNutritionPage />
                  </Suspense>
                }
              />
              <Route
                path="nutrition/:templateId"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <TemplateBuilderPage />
                  </Suspense>
                }
              />
              <Route
                path="analytics/:clientId"
                element={
                  <Suspense fallback={<LoadingState />}>
                    <AnalyticsPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
