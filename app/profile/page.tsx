'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, TrendingUp, Receipt, CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import UserOverviewCard from '@/components/profile/UserOverviewCard';
import EligibilityCard from '@/components/profile/EligibilityCard';
import DocumentStatusCard from '@/components/profile/DocumentStatusCard';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();

  const [isApplying, setIsApplying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load user data from localStorage if available
  const getUserData = () => {
    if (typeof window === 'undefined') return null;
    const savedData = localStorage.getItem('userData');
    return savedData ? JSON.parse(savedData) : null;
  };

  // Mock user data with fallback to default if not in localStorage
  const defaultUserData = {
    name: 'Ananya Sharma',
    customerId: 'CUST-2024-789456',
    phone: '+91 98765 43210',
    email: 'ananya.sharma@email.com',
    city: 'Mumbai, Maharashtra',
    kycStatus: 'Verified' as const,
    lastUpdated: new Date().toLocaleString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  };

  const userData = getUserData() || defaultUserData;

  const handleApplyForLoan = () => {
    setIsApplying(true);
    // Simulate API call
    setTimeout(() => {
      router.push('/');
      toast.success('Redirecting to loan application...');
      setIsApplying(false);
    }, 1000);
  };

  const handleUpdateDocuments = () => {
    setIsUpdating(true);
    // Simulate document update
    setTimeout(() => {
      toast.success('Document update request received. You will be notified once processed.');
      setIsUpdating(false);
    }, 1500);
  };

  const eligibilityData = [
    {
      icon: <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      label: 'Pre-approved Limit',
      value: '₹ 10,00,000',
      badge: 'Active',
      badgeColor: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
    },
    {
      icon: <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      label: 'Existing Loans',
      value: '1 Active',
      badge: 'Personal Loan',
      badgeColor: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    },
    {
      icon: <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      label: 'Current EMI',
      value: '₹ 15,250',
      badge: 'Monthly',
      badgeColor: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      label: 'Credit Score',
      value: '780',
      badge: 'Low Risk',
      badgeColor: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
    }
  ];

  const documentsData = [
    {
      name: 'PAN Card',
      status: 'verified' as const,
      uploadedDate: 'Nov 15, 2024'
    },
    {
      name: 'Aadhaar Card',
      status: 'verified' as const,
      uploadedDate: 'Nov 15, 2024'
    },
    {
      name: 'Salary Slip',
      status: 'verified' as const,
      uploadedDate: 'Dec 1, 2024'
    },
    {
      name: 'Bank Statement',
      status: 'pending' as const,
      uploadedDate: 'Dec 5, 2024'
    }
  ];

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>

          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your personal information and loan eligibility details
            </p>
          </div>

          {/* User Overview Section */}
          <div className="mb-8">
            <UserOverviewCard {...userData} />
          </div>

          {/* Loan Eligibility & Limits Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Loan Eligibility & Limits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {eligibilityData.map((item, index) => (
                <EligibilityCard key={index} {...item} />
              ))}
            </div>
          </div>

          {/* Document Status Section */}
          <div className="mb-8">
            <DocumentStatusCard documents={documentsData} />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleApplyForLoan}
              disabled={isApplying}
              className={`flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors ${isApplying ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : 'Apply for New Loan'}
            </button>
            <button 
              onClick={handleUpdateDocuments}
              disabled={isUpdating}
              className={`flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors ${isUpdating ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : 'Update Documents'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
