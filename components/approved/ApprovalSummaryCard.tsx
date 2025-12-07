import React from 'react';

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBgColor?: string;
  iconColor?: string;
}

export default function ApprovalSummaryCard({
  icon,
  label,
  value,
  iconBgColor = 'bg-teal-50 dark:bg-teal-900/30',
  iconColor = 'text-teal-600 dark:text-teal-400'
}: SummaryCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${iconBgColor} rounded-lg p-2.5`}>
          <div className={iconColor}>
            {icon}
          </div>
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}


