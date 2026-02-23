'use client';

import { useEffect, useMemo, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface MessageInputProps {
  onSend?: (message: string) => void;
  isLoading?: boolean;
  uploadRequired?: boolean;
  onUpload?: (file: File, docType?: string) => void;
  requiredDocuments?: string[];
  uploadedDocuments?: string[];
}

const DOC_LABELS: Record<string, string> = {
  salary_slip: 'Salary Slip',
  bank_statement: 'Bank Statement',
  address_proof: 'Address Proof',
  selfie_pan: 'Selfie with PAN',
};

export default function MessageInput({
  onSend,
  isLoading = false,
  uploadRequired = false,
  onUpload,
  requiredDocuments = [],
  uploadedDocuments = [],
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('');

  const pendingDocuments = useMemo(
    () => requiredDocuments.filter((doc) => !uploadedDocuments.includes(doc)),
    [requiredDocuments, uploadedDocuments]
  );

  const nextRequiredDoc = pendingDocuments[0] || '';

  useEffect(() => {
    setSelectedDocType(nextRequiredDoc);
  }, [nextRequiredDoc]);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend?.(message.trim());
      setMessage('');
    }
  };

  const handleUpload = () => {
    if (file && onUpload && !isLoading) {
      onUpload(file, selectedDocType || undefined);
      setFile(null);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:right-1/3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-10">
      <div className="max-w-4xl mx-auto">
        {uploadRequired ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl px-5 py-4 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="text-sm text-gray-700 dark:text-gray-200">
              Upload next document:
              <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
                {DOC_LABELS[nextRequiredDoc] || 'Required document'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
              >
                {pendingDocuments.map((doc) => (
                  <option key={doc} value={doc}>
                    {DOC_LABELS[doc] || doc}
                  </option>
                ))}
              </select>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="flex-1 text-sm text-gray-700 dark:text-gray-200"
              />
              <button
                onClick={handleUpload}
                disabled={isLoading || !file || !selectedDocType}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload
              </button>
            </div>
            {file && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                  Selected: {file.name} ({Math.ceil(file.size / 1024)} KB)
                </div>
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected file preview" className="max-h-28 rounded-md border border-gray-200" />
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Preview unavailable for this file type. PDF selected.
                  </div>
                )}
              </div>
            )}
            {pendingDocuments.length > 1 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Remaining after this: {pendingDocuments.slice(1).map((d) => DOC_LABELS[d] || d).join(', ')}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-full px-5 py-3 border border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
            />
            <button 
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSend}
              disabled={isLoading || !message.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
