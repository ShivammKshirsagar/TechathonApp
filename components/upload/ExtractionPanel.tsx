'use client'

export function ExtractionPanel() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-xl font-semibold mb-4">Extracted Information</h2>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Monthly Salary</p>
          <p className="font-medium">-</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Employer</p>
          <p className="font-medium">-</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Date</p>
          <p className="font-medium">-</p>
        </div>
      </div>
    </div>
  )
}

