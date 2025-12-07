'use client';

interface ExtractionData {
  netSalary: string;
  maxEmi: string;
  employeeId: string;
  companyName: string;
}

interface ExtractionPanelProps {
  data: ExtractionData;
  isComplete: boolean;
}

export default function ExtractionPanel({ data, isComplete }: ExtractionPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        Real-time Extraction
      </h2>

      <div className="space-y-6">
        {/* Extracted Net Salary */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
            Extracted Net Salary
          </label>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {isComplete ? data.netSalary : '—'}
          </div>
        </div>

        {/* Calculated Max EMI */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
            Calculated Max. EMI
          </label>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {isComplete ? data.maxEmi : '—'}
          </div>
        </div>

        {/* Employee ID */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
            Employee ID
          </label>
          <div className="text-base font-medium text-gray-500 dark:text-gray-400">
            {isComplete ? data.employeeId : '—'}
          </div>
        </div>

        {/* Company Name */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
            Company Name
          </label>
          <div className="text-base font-medium text-gray-500 dark:text-gray-400">
            {isComplete ? data.companyName : '—'}
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <button
        disabled={!isComplete}
        className="w-full mt-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        Continue
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </button>
    </div>
  );
}

