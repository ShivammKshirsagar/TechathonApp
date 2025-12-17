import { User, Mail, Phone, CreditCard, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useLoanFlow } from '@/lib/hooks/useLoanFlow';

export default function CustomerSummaryCard() {
  const { state } = useLoanFlow();
  const { personalDetails, monthlyIncome, loanAmount, tenure, employmentType } = state.collectedData;
  
  const hasBasicInfo = personalDetails?.fullName || personalDetails?.email || personalDetails?.mobile;
  const hasLoanDetails = monthlyIncome || loanAmount || tenure;
  const hasKYC = personalDetails?.pan || personalDetails?.aadhaar;
  
  const renderStatusBadge = (isComplete: boolean, text: string) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isComplete 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    }`}>
      {isComplete ? (
        <CheckCircle className="w-3 h-3 mr-1" />
      ) : (
        <Clock className="w-3 h-3 mr-1" />
      )}
      {text}
    </span>
  );

  const getBasicInfoStatus = () => {
    const hasInfo = !!(personalDetails?.fullName || personalDetails?.email || personalDetails?.mobile);
    return hasInfo ? 'Complete' : 'In Progress';
  };

  const getKYCStatus = () => {
    const hasKYC = !!(personalDetails?.pan || personalDetails?.aadhaar);
    return hasKYC ? 'Complete' : 'Pending';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Customer Summary
        </h2>
        {renderStatusBadge(!!hasBasicInfo, getBasicInfoStatus())}
      </div>
      
      {hasBasicInfo || hasLoanDetails ? (
        <div className="space-y-6">
          {/* Personal Info Section */}
          {(personalDetails?.fullName || personalDetails?.email || personalDetails?.mobile) && (
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Personal Information
              </h3>
              <div className="space-y-2 pl-7">
                {personalDetails?.fullName && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Name:</span> {personalDetails.fullName}
                  </p>
                )}
                {personalDetails?.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{personalDetails.email}</span>
                  </div>
                )}
                {personalDetails?.mobile && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{personalDetails.mobile}</span>
                  </div>
                )}
                {employmentType && (
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Employment:</span> {employmentType}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Loan Details Section */}
          {(monthlyIncome || loanAmount || tenure) && (
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                Loan Details
              </h3>
              <div className="space-y-2 pl-7">
                {monthlyIncome && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Monthly Income:</span> ₹{monthlyIncome.toLocaleString('en-IN')}
                  </p>
                )}
                {loanAmount && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Loan Amount:</span> ₹{loanAmount.toLocaleString('en-IN')}
                  </p>
                )}
                {tenure && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Tenure:</span> {tenure} months
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* KYC Status Section */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                <FileText className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                KYC Status
              </h3>
              {renderStatusBadge(!!hasKYC, getKYCStatus())}
            </div>
            <div className="space-y-2 pl-7">
              {personalDetails?.pan ? (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  PAN Card Verified
                </p>
              ) : (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  PAN Card Pending
                </p>
              )}
              {personalDetails?.aadhaar ? (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aadhaar Verified
                </p>
              ) : (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Aadhaar Pending
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-96">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
            <User className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Awaiting Details
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm">
            Your information will appear here as you provide it in the chat.
          </p>
        </div>
      )}
    </div>
  );
}