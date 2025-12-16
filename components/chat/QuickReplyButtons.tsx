import React from 'react';

interface QuickReplyButtonsProps {
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export const QuickReplyButtons: React.FC<QuickReplyButtonsProps> = ({
  options,
  onSelect,
  disabled = false
}) => {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelect(option)}
          disabled={disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors
                     font-medium text-sm shadow-sm"
        >
          {option}
        </button>
      ))}
    </div>
  );
};