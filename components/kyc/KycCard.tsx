'use client';

import { User, Building2, Calendar, Phone, CheckCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface KycField {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export default function KycCard() {
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  const fields: KycField[] = [
    {
      icon: <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      label: 'Name',
      value: 'Ananya Sharma'
    },
    {
      icon: <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      label: 'City',
      value: 'Mumbai'
    },
    {
      icon: <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      label: 'Age',
      value: '32'
    },
    {
      icon: <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      label: 'Phone',
      value: '98********'
    }
  ];

  // Simulate loading completion
  useState(() => {
    setTimeout(() => {
      setCompleted(true);
      setLoading(false);
    }, 2000);
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Verification & KYC Sync
          </h2>
        </div>
        <span className="px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-sm font-medium rounded-full">
          Verification Agent Active
        </span>
      </div>

      {/* KYC Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {fields.map((field, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              {field.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {field.label}
              </div>
              <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {field.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Section */}
      <div className="space-y-4 mb-8">
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 dark:bg-teal-400 transition-all duration-1000"
                style={{ width: completed ? '100%' : '60%' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {loading ? (
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 text-teal-500" />
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {loading ? 'Retrieving pre-approved offer...' : 'KYC details fetched from CRM'}
            </span>
          </div>

          {completed && (
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-teal-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                KYC details fetched from CRM
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <button 
        disabled={!completed}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-colors"
      >
        Proceed to Offer
      </button>
    </div>
  );
}


