
import React from 'react';
import { Phone } from 'lucide-react';

interface AIPhoneSuggestionsProps {
  suggestions: string[];
  onSelect: (phone: string) => void;
  isVisible: boolean;
  isLoading: boolean;
}

const AIPhoneSuggestions: React.FC<AIPhoneSuggestionsProps> = ({
  suggestions,
  onSelect,
  isVisible,
  isLoading
}) => {
  if (!isVisible || (!suggestions.length && !isLoading)) return null;

  const formatPhone = (phone: string) => {
    if (phone.length === 10 && phone.startsWith('07')) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }
    return phone;
  };

  const getPhoneType = (phone: string) => {
    if (/^07[2-9][0-9]{7}$/.test(phone)) {
      return 'Mobile Number';
    }
    if (/^[0-9]{4,6}$/.test(phone)) {
      return 'Agent Code';
    }
    return 'Number';
  };

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-48 overflow-y-auto animate-fade-in">
      <div className="p-2">
        {suggestions.map((phone, index) => (
          <button
            key={`${phone}-${index}`}
            onClick={() => onSelect(phone)}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left group"
          >
            <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {formatPhone(phone)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getPhoneType(phone)}
              </p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIPhoneSuggestions;
