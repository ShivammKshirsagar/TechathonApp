'use client'

export function DecisionMetricCard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Credit Score</p>
        <p className="text-2xl font-bold">-</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Credit Limit</p>
        <p className="text-2xl font-bold">-</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Loan Amount</p>
        <p className="text-2xl font-bold">-</p>
      </div>
    </div>
  )
}

