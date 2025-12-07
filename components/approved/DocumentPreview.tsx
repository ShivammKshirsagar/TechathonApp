export default function DocumentPreview() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border-2 border-dashed border-gray-300 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Document Preview
      </h3>
      
      {/* Document Preview Area */}
      <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-8 min-h-96 flex items-center justify-center">
        <div className="text-center max-w-md">
          {/* Mock Document Image */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6 text-left">
            <div className="space-y-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Sanction Letter
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                TATA Capital Financial Services Ltd.
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Loan Sanctioned
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  This is to certify that the loan application has been approved...
                </div>
              </div>
              <div className="pt-4 space-y-1">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Loan Amount: <span className="font-semibold">₹5,00,000</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Tenure: <span className="font-semibold">60 months</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Interest Rate: <span className="font-semibold">10.5% p.a.</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your sanction letter is ready for download
          </p>
        </div>
      </div>
    </div>
  );
}
