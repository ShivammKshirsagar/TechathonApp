import React from 'react';
import { SanctionLetter } from '@/lib/loan-flow/types';
import { formatCurrency } from '@/lib/loan-flow/calculations';
import { formatDate } from '@/lib/loan-flow/mockServices';

interface SanctionLetterDocumentProps {
  sanctionLetter: SanctionLetter;
}

export const SanctionLetterDocument: React.FC<SanctionLetterDocumentProps> = ({
  sanctionLetter
}) => {
  const {
    referenceNumber,
    referenceNo,
    generatedAt,
    date,
    validUntil,
    documentHash,
    applicantName,
    loanDetails,
  } = sanctionLetter;
  const displayReference = referenceNumber || referenceNo || '--';
  const displayDate = generatedAt || date || '';

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto" id="sanction-letter">
      {/* Letterhead */}
      <div className="border-b-4 border-blue-600 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">XYZ Finance</h1>
            <p className="text-sm text-gray-600 mt-1">
              Corporate Office: 123 Business Park, Mumbai - 400001<br />
              CIN: U65999MH2020PTC123456 | RBI Reg. No: N-14.12345
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">NBFC - Non-Banking Financial Company</p>
            <p className="text-xs text-gray-600 mt-1">ISO 9001:2015 Certified</p>
          </div>
        </div>
      </div>

      {/* Letter Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">SANCTION LETTER</h2>
        <p className="text-sm text-gray-600 mt-1">Personal Loan Pre-Approval</p>
      </div>

      {/* Reference Details */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Reference No:</span>
            <span className="font-semibold ml-2">{displayReference}</span>
          </div>
          <div>
            <span className="text-gray-600">Date:</span>
            <span className="font-semibold ml-2">{displayDate ? formatDate(displayDate) : '--'}</span>
          </div>
        </div>
      </div>

      {/* Applicant Details */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-800 mb-2">To,</h3>
        <p className="text-gray-700 font-semibold">{applicantName}</p>
      </div>

      {/* Opening Statement */}
      <p className="mb-6 text-gray-700 leading-relaxed">
        Dear <strong>{applicantName}</strong>,
      </p>
      <p className="mb-6 text-gray-700 leading-relaxed">
        We are pleased to inform you that your application for a Personal Loan has been 
        <strong className="text-green-600"> pre-approved</strong>. The sanctioned loan details are as follows:
      </p>

      {/* Loan Details Table */}
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="text-left p-3 font-semibold">Particulars</th>
              <th className="text-right p-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="p-3 text-gray-700">Sanctioned Loan Amount</td>
              <td className="p-3 text-right font-semibold text-gray-800">
                {formatCurrency(loanDetails.amount)}
              </td>
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="p-3 text-gray-700">Rate of Interest (p.a.)</td>
              <td className="p-3 text-right font-semibold text-gray-800">
                {loanDetails.interestRate}%
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-3 text-gray-700">Loan Tenure</td>
              <td className="p-3 text-right font-semibold text-gray-800">
                {loanDetails.tenure} months
              </td>
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="p-3 text-gray-700">Monthly EMI</td>
              <td className="p-3 text-right font-semibold text-blue-600">
                {formatCurrency(loanDetails.emi)}
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-3 text-gray-700">Processing Fee (One-time)</td>
              <td className="p-3 text-right font-semibold text-gray-800">
                {formatCurrency(loanDetails.processingFee)}
              </td>
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="p-3 text-gray-700">Total Interest Payable</td>
              <td className="p-3 text-right font-semibold text-gray-800">
                {formatCurrency(loanDetails.totalInterest)}
              </td>
            </tr>
            <tr className="bg-blue-50">
              <td className="p-3 text-gray-700 font-bold">Total Amount Payable</td>
              <td className="p-3 text-right font-bold text-blue-600">
                {formatCurrency(loanDetails.totalPayable)}
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="p-3 text-gray-700">Annual Percentage Rate (APR)</td>
              <td className="p-3 text-right font-semibold text-gray-800">
                {loanDetails.apr}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Terms and Conditions */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-800 mb-3">Terms & Conditions:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>This sanction is valid for <strong>15 days</strong> from the date of issue: {formatDate(validUntil)}</li>
          <li>The loan is subject to verification of documents and final credit approval.</li>
          <li>Prepayment of the loan is allowed after 6 months without any charges.</li>
          <li>Prepayment within 6 months will attract a charge of 4% of the outstanding principal.</li>
          <li>Late payment penalty: 2% per month on overdue EMI amount.</li>
          <li>Bounce charges for EMI auto-debit failure: ₹500 per instance.</li>
          <li>The loan is subject to registration of Post-Dated Cheques (PDCs) or NACH mandate.</li>
          <li>Any changes in the applicant's employment or financial status must be immediately reported.</li>
        </ol>
      </div>

      {/* RBI Disclosures */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-gray-800 mb-2">RBI Mandated Disclosures:</h3>
        <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
          <li>No upfront fee or advance payment should be paid to anyone for loan processing.</li>
          <li>EMI amount includes principal and interest components as per reducing balance method.</li>
          <li>Grievance Redressal: Email: grievance@xyzfinance.com | Phone: 1800-123-4567</li>
          <li>In case of non-resolution, complaints can be escalated to RBI Ombudsman.</li>
        </ul>
      </div>

      {/* Acceptance */}
      <div className="mb-6">
        <p className="text-gray-700 leading-relaxed mb-4">
          Please proceed with document submission and loan agreement signing to complete the disbursement process.
        </p>
        <p className="text-gray-700">
          We look forward to serving your financial needs.
        </p>
      </div>

      {/* Signature */}
      <div className="mt-8 mb-6">
        <p className="text-gray-700 font-semibold">Yours sincerely,</p>
        <div className="mt-8">
          <p className="font-bold text-gray-800">Authorized Signatory</p>
          <p className="text-sm text-gray-600">XYZ Finance Ltd.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 mt-8">
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <p><strong>Document Hash:</strong> {documentHash}</p>
            <p><strong>Generated:</strong> {displayDate ? formatDate(displayDate) : '--'}</p>
          </div>
          <div className="text-right">
            <p>This is a system-generated document.</p>
            <p>No signature is required for validity.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
