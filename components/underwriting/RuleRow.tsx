interface RuleRowProps {
  condition: string;
  result: string;
  resultType: 'reject' | 'approve' | 'required';
  isActive?: boolean;
}

export default function RuleRow({ 
  condition, 
  result, 
  resultType,
  isActive = false 
}: RuleRowProps) {
  const getResultColor = () => {
    switch (resultType) {
      case 'reject':
        return 'text-red-600 dark:text-red-400';
      case 'approve':
        return 'text-green-600 dark:text-green-400';
      case 'required':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getBorderColor = () => {
    if (!isActive) return 'border-gray-200 dark:border-gray-700';
    switch (resultType) {
      case 'required':
        return 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${getBorderColor()} transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
          {condition}
        </span>
        <span className="text-sm sm:text-base">
          <span className="text-gray-500 dark:text-gray-400">→ </span>
          <span className={`font-semibold ${getResultColor()}`}>
            {result}
          </span>
        </span>
      </div>
    </div>
  );
}

