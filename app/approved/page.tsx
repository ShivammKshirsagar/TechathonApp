'use client';

import Link from 'next/link';
import { Wallet, Clock, Percent, Receipt, Download, CheckCircle2 } from 'lucide-react';
import ApprovalSummaryCard from '@/components/approved/ApprovalSummaryCard';
import DocumentPreview from '@/components/approved/DocumentPreview';

export default function ApprovedPage() {
  const handleDownload = () => {
    // Simulate PDF download
    alert('Sanction letter download started!');
    // In real app: trigger actual PDF download
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              BFSI Loan System
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Dashboard
            </Link>
            <Link href="/loans" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              My Loans
            </Link>
            <Link href="/applications" className="text-sm font-medium text-gray-900 dark:text-white">
              Applications
            </Link>
            <Link href="/support" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Support
            </Link>
            <button className="bg-blue-900 dark:bg-blue-800 hover:bg-blue-800 dark:hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
              Log Out
            </button>
            <div className="w-10 h-10 bg-orange-200 dark:bg-orange-300 rounded-full"></div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-500 rounded-2xl p-8 mb-8 relative overflow-hidden">
          <div className="relative z-10 flex items-start justify-between">
            <div className="text-white">
              <h1 className="text-4xl font-bold mb-3">
                Congratulations! Your Loan is Approved
              </h1>
              <p className="text-blue-100 text-lg">
                Your personal loan has been successfully sanctioned. Please find the details below.
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full"></div>
          <div className="absolute right-24 top-4 w-20 h-20 bg-white/10 rounded-full"></div>
        </div>

        {/* Status Badge */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
            Document Generator Active
          </span>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Loan Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loan Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ApprovalSummaryCard
                icon={<Wallet className="w-6 h-6" />}
                label="Approved Amount"
                value="₹ 5,00,000"
              />
              <ApprovalSummaryCard
                icon={<Clock className="w-6 h-6" />}
                label="Tenure"
                value="60 months"
              />
              <ApprovalSummaryCard
                icon={<Percent className="w-6 h-6" />}
                label="Interest Rate"
                value="10.5% p.a."
              />
              <ApprovalSummaryCard
                icon={<Receipt className="w-6 h-6" />}
                label="EMI"
                value="₹ 10,747"
              />
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="w-full md:w-auto bg-teal-500 hover:bg-teal-600 text-white font-semibold py-4 px-8 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-teal-500/30"
            >
              <Download className="w-5 h-5" />
              Download Sanction Letter
            </button>
          </div>

          {/* Right Column: Document Preview */}
          <div className="lg:col-span-1">
            <DocumentPreview />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Conversation Completed - Powered by Multi-Agent AI Workflow
          </p>
        </div>
      </div>
    </div>
  );
}


