'use client'

export function RuleRow() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-xl font-semibold mb-4">Decision Rules</h2>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <span>Rule 1</span>
          <span className="text-green-500">✓ Pass</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <span>Rule 2</span>
          <span className="text-green-500">✓ Pass</span>
        </div>
      </div>
    </div>
  )
}

