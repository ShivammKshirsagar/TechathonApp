import { User } from 'lucide-react';

export default function CustomerSummaryCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 h-full">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
        Customer Summary
      </h2>
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-96">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
          <div className="relative">
            <User className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Awaiting Details
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm">
          Your information will appear here as you provide it in the chat.
        </p>
      </div>
    </div>
  );
}