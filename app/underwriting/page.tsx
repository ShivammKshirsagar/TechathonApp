import Link from 'next/link';
import { TrendingUp, CreditCard, Wallet, Upload } from 'lucide-react';
import DecisionMetricCard from '@/components/underwriting/DecisionMetricCard';
import RuleRow from '@/components/underwriting/RuleRow';
import ChatSidebar from '@/components/underwriting/ChatSidebar';

export default function UnderwritingPage() {
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
              TATA Capital
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Dashboard
            </Link>
            <Link href="/loans" className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Loans
            </Link>
            <Link href="/investments" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Investments
            </Link>
            <Link href="/contact" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Contact Us
            </Link>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
              Apply Now
            </button>
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </nav>

      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 p-6 lg:p-8">
          {/* Breadcrumb */}
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Personal Details / Loan Details / <span className="font-semibold text-gray-900 dark:text-white">Underwriting</span> / Document Upload / Confirmation
          </div>

          {/* Page Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Underwriting Decision
          </h1>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <DecisionMetricCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Credit Score"
              value="780"
            />
            <DecisionMetricCard
              icon={<CreditCard className="w-6 h-6" />}
              label="Pre-Approved Limit"
              value="₹1,00,000"
            />
            <DecisionMetricCard
              icon={<Wallet className="w-6 h-6" />}
              label="Requested Amount"
              value="₹1,50,000"
            />
          </div>

          {/* Decision Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  How We Made This Decision
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Application Status
                </p>
              </div>
              <span className="px-4 py-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-sm font-medium rounded-full">
                Underwriting Logic Triggered
              </span>
            </div>

            {/* Decision Rules */}
            <div className="space-y-3">
              <RuleRow
                condition="If score < 700"
                result="Auto Reject"
                resultType="reject"
              />
              <RuleRow
                condition="If amount ≤ limit"
                result="Instant Approval"
                resultType="approve"
              />
              <RuleRow
                condition="If amount ≤ 2× limit"
                result="Salary Slip Required"
                resultType="required"
                isActive={true}
              />
            </div>
          </div>

          {/* Upload Button */}
          <Link href="/upload-salary-slip">
            <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Upload className="w-5 h-5" />
              Upload Salary Slip
            </button>
          </Link>
        </div>

        {/* Chat Sidebar */}
        <div className="lg:w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <ChatSidebar />
        </div>
      </div>
    </div>
  );
}

