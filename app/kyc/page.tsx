import { AppShell } from '@/components/layout/AppShell'
import { KycCard } from '@/components/kyc/KycCard'

export default function KycPage() {
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Verification & KYC Sync</h1>
        <KycCard />
      </div>
    </AppShell>
  )
}

