import React from 'react';
import { LoanOffer } from '@/lib/loan-flow/types';
import { formatCurrency } from '@/lib/loan-flow/calculations';

interface LoanOfferCardProps {
  offer: LoanOffer;
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
}

export const LoanOfferCard: React.FC<LoanOfferCardProps> = ({
  offer,
  onAccept,
  onReject,
  disabled = false
}) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 my-4 border border-blue-200 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">Your Loan Offer</h3>
        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
          Pre-Approved
        </span>
      </div>

      <div className="space-y-3">
        {/* Loan Amount */}
        <div className="flex justify-between items-center py-2 border-b border-blue-100">
          <span className="text-gray-600 font-medium">Loan Amount</span>
          <span className="text-2xl font-bold text-blue-600">
            {formatCurrency(offer.amount)}
          </span>
        </div>

        {/* EMI */}
        <div className="flex justify-between items-center py-2 border-b border-blue-100">
          <span className="text-gray-600 font-medium">Monthly EMI</span>
          <span className="text-xl font-bold text-gray-800">
            {formatCurrency(offer.emi)}
          </span>
        </div>

        {/* Tenure */}
        <div className="flex justify-between items-center py-2 border-b border-blue-100">
          <span className="text-gray-600 font-medium">Tenure</span>
          <span className="text-lg font-semibold text-gray-800">
            {offer.tenure} months
          </span>
        </div>

        {/* Interest Rate */}
        <div className="flex justify-between items-center py-2 border-b border-blue-100">
          <span className="text-gray-600 font-medium">Interest Rate</span>
          <span className="text-lg font-semibold text-gray-800">
            {offer.interestRate}% p.a.
          </span>
        </div>

        {/* Processing Fee */}
        <div className="flex justify-between items-center py-2 border-b border-blue-100">
          <span className="text-gray-600 font-medium">Processing Fee</span>
          <span className="text-lg font-semibold text-gray-800">
            {formatCurrency(offer.processingFee)}
          </span>
        </div>

        {/* Total Interest */}
        <div className="flex justify-between items-center py-2 border-b border-blue-100">
          <span className="text-gray-600 font-medium">Total Interest</span>
          <span className="text-lg text-gray-800">
            {formatCurrency(offer.totalInterest)}
          </span>
        </div>

        {/* Total Payable */}
        <div className="flex justify-between items-center py-3 bg-blue-100 rounded-lg px-3 mt-2">
          <span className="text-gray-700 font-bold">Total Payable</span>
          <span className="text-xl font-bold text-blue-700">
            {formatCurrency(offer.totalPayable)}
          </span>
        </div>

        {/* APR */}
        <div className="text-center text-sm text-gray-600 mt-2">
          APR: {offer.apr}%
        </div>
      </div>

      {/* Terms Preview */}
      <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>Key Terms:</strong> No prepayment charges after 6 months. 
          Late payment penalty: 2% per month. Offer valid for 15 days. 
          Subject to final approval and documentation.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onAccept}
          disabled={disabled}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold 
                     hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed 
                     transition-colors shadow-md"
        >
          Accept Offer
        </button>
        <button
          onClick={onReject}
          disabled={disabled}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold 
                     hover:bg-gray-300 disabled:bg-gray-300 disabled:cursor-not-allowed 
                     transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
};