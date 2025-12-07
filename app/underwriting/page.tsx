import { AppShell } from '@/components/layout/AppShell'
import { DecisionMetricCard } from '@/components/underwriting/DecisionMetricCard'
import { RuleRow } from '@/components/underwriting/RuleRow'

export default function UnderwritingPage() {
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Underwriting Decision</h1>
        <DecisionMetricCard />
        <RuleRow />
      </div>
    </AppShell>
  )
}

