'use client'

export function ApprovalSummaryCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
          Loan Approved!
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Your loan application has been successfully approved
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <span className="text-gray-600 dark:text-gray-400">Loan Amount</span>
          <span className="font-semibold">-</span>
        </div>
        <div className="flex justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <span className="text-gray-600 dark:text-gray-400">Interest Rate</span>
          <span className="font-semibold">-</span>
        </div>
        <div className="flex justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <span className="text-gray-600 dark:text-gray-400">Tenure</span>
          <span className="font-semibold">-</span>
        </div>
      </div>
    </div>
  )
}

