import React from 'react';
import { SanctionLetter } from '@/lib/loan-flow/types';
import { SanctionLetterDocument } from './SanctionLetterDocument';
import { generatePDF } from '@/lib/pdf/generateSanctionLetter';

interface SanctionLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  sanctionLetter: SanctionLetter;
}

export const SanctionLetterModal: React.FC<SanctionLetterModalProps> = ({
  isOpen,
  onClose,
  sanctionLetter
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      await generatePDF(sanctionLetter);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col my-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center print:hidden">
          <div>
            <h2 className="text-2xl font-bold">Sanction Letter</h2>
            <p className="text-blue-100 text-sm">
              Reference: {sanctionLetter.referenceNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-3xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <SanctionLetterDocument sanctionLetter={sanctionLetter} />
        </div>

        {/* Action Buttons */}
        <div className="border-t p-6 bg-gray-50 flex gap-3 justify-end print:hidden">
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold 
                       hover:bg-gray-300 transition-colors"
          >
            🖨️ Print
          </button>
          <button
            onClick={handleDownload}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold 
                       hover:bg-green-700 transition-colors shadow-md"
          >
            📥 Download PDF
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold 
                       hover:bg-blue-700 transition-colors shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};