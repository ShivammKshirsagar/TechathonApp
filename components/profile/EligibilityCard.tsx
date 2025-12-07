interface EligibilityCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
  badgeColor?: string;
}

export default function EligibilityCard({
  icon,
  label,
  value,
  badge,
  badgeColor = 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
}: EligibilityCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          {icon}
        </div>
        {badge && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}