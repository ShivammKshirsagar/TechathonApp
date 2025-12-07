import { AppShell } from '@/components/layout/AppShell'
import { ApprovalSummaryCard } from '@/components/approved/ApprovalSummaryCard'

export default function ApprovedPage() {
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Loan Approved</h1>
        <ApprovalSummaryCard />
      </div>
    </AppShell>
  )
}

