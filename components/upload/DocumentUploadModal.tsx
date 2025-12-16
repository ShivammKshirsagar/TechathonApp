import React from 'react';
import { DocumentsState } from '@/lib/loan-flow/types';
import { DocumentUploadSlot } from './DocumentUploadSlot';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentsState;
  onFileSelect: (docType: keyof DocumentsState, file: File) => void;
  onRemove: (docType: keyof DocumentsState) => void;
  canProceed: boolean;
  onProceed: () => void;
}

const documentLabels: Record<keyof DocumentsState, { title: string; description: string }> = {
  salarySlip: {
    title: 'Salary Slips',
    description: 'Last 3 months salary slips (PDF/Image)'
  },
  bankStatement: {
    title: 'Bank Statement',
    description: 'Last 6 months bank statement (PDF)'
  },
  addressProof: {
    title: 'Address Proof',
    description: 'Aadhaar, Passport, or Utility Bill (PDF/Image)'
  },
  selfie: {
    title: 'Selfie with PAN',
    description: 'Clear photo holding your PAN card (Image)'
  }
};

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  documents,
  onFileSelect,
  onRemove,
  canProceed,
  onProceed
}) => {
  if (!isOpen) return null;

  const uploadedCount = Object.values(documents).filter(
    doc => doc.status === 'uploaded'
  ).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Upload Required Documents</h2>
              <p className="text-blue-100">
                Please upload all 4 documents to proceed with your loan application
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          
          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress: {uploadedCount}/4 documents</span>
              <span>{Math.round((uploadedCount / 4) * 100)}%</span>
            </div>
            <div className="w-full bg-blue-800 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${(uploadedCount / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Document Slots */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(documentLabels) as Array<keyof DocumentsState>).map((docType) => (
              <DocumentUploadSlot
                key={docType}
                docType={docType}
                label={documentLabels[docType].title}
                description={documentLabels[docType].description}
                document={documents[docType]}
                onFileSelect={(file: File) => onFileSelect(docType, file)}
                onRemove={() => onRemove(docType)}
              />
            ))}
          </div>

          {/* Instructions */}
          {canProceed && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold mb-2">
                ✅ All documents uploaded successfully!
              </p>
              <p className="text-green-700 text-sm">
                Click "Complete Upload" to proceed, then type <strong>"DoneDoneDone"</strong> in the chat to confirm.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onProceed}
              disabled={!canProceed}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold 
                         hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed 
                         transition-colors shadow-md"
            >
              Complete Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};