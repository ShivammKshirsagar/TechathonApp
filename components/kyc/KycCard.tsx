'use client'

export function KycCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-xl font-semibold mb-4">KYC Verification</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Aadhaar Number</label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            placeholder="Enter Aadhaar number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">PAN Number</label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            placeholder="Enter PAN number"
          />
        </div>
        <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Verify & Sync
        </button>
      </div>
    </div>
  )
}

