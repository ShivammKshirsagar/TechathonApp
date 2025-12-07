import { AppShell } from '@/components/layout/AppShell'
import { UploadCard } from '@/components/upload/UploadCard'
import { ExtractionPanel } from '@/components/upload/ExtractionPanel'

export default function UploadSalarySlipPage() {
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Upload Salary Slip</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UploadCard />
          <ExtractionPanel />
        </div>
      </div>
    </AppShell>
  )
}

