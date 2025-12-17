'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import UploadCard from '@/components/upload/UploadCard';
import ExtractionPanel from '@/components/upload/ExtractionPanel';

export default function UploadSalarySlipPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [ackMessage, setAckMessage] = useState<string | null>(null);

  const extractionData = {
    netSalary: '₹ 78,450.00',
    maxEmi: '₹ 39,225.00',
    employeeId: '—',
    companyName: '—',
  };

  const handleFileUpload = (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setIsComplete(false);
    setAckMessage(null);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          setIsComplete(true);
          setAckMessage(
            'Great! Your salary slip has been analysed and your Loan EMI is within 50% of your monthly net salary based on the extracted data.'
          );
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center transform rotate-45">
              <div className="w-4 h-4 bg-white rounded-sm transform -rotate-45"></div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Loan Application
            </h1>
          </div>
          <div className="w-10 h-10 bg-gray-900 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Personal Details / Employment Info / <span className="font-semibold text-gray-900 dark:text-white">Upload Documents</span> / Loan Offer / Final Review
        </div>

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Upload Your Salary Slip
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Required only when your requested loan amount is greater than your pre-approved limit.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Upload Card */}
          <div>
            <UploadCard
              onFileUpload={handleFileUpload}
              isProcessing={isProcessing}
              progress={progress}
            />
            {ackMessage && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200">
                {ackMessage}
              </div>
            )}
          </div>

          {/* Right: Extraction Panel */}
          <div>
            <ExtractionPanel
              data={extractionData}
              isComplete={isComplete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}



