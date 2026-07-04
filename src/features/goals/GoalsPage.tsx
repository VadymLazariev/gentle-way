import { PageHeader } from '@/components/PageHeader'
import { GoalsSection } from '@/features/goals/GoalsSection'

export function GoalsPage() {
  return (
    <div>
      <PageHeader title="Goals" subtitle="Track progress toward your targets" />
      <GoalsSection />
    </div>
  )
}
