
import React from 'react';
import { Phone, Clock } from 'lucide-react';

interface Contact {
  phone_number: string;
  last_used: string;
  frequency: number;
}

interface RecentContactsDropdownProps {
  contacts: Contact[];
  onSelectContact: (phone: string) => void;
  isVisible: boolean;
}

const RecentContactsDropdown: React.FC<RecentContactsDropdownProps> = ({
  contacts,
  onSelectContact,
  isVisible
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1}d ago`;
    return `${Math.ceil(diffDays / 7)}w ago`;
  };

  if (!isVisible || contacts.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
      <div className="p-2">
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 border-b border-gray-100">
          <Clock className="w-3 h-3" />
          <span>Recent Numbers</span>
        </div>
        {contacts.slice(0, 5).map((contact) => (
          <button
            key={contact.phone_number}
            onClick={() => onSelectContact(contact.phone_number)}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {contact.phone_number}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(contact.last_used)} • Used {contact.frequency}x
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentContactsDropdown;
