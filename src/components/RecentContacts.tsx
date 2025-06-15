
import React, { useState, useEffect } from 'react';
import { Phone, Star, Clock, Trash2 } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';

interface Contact {
  phone_number: string;
  last_used: string;
  frequency: number;
  is_favorite: boolean;
}

interface RecentContactsProps {
  onSelectContact: (phone: string) => void;
  currentPhone?: string;
}

const RecentContacts = ({ onSelectContact, currentPhone }: RecentContactsProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const payments = await supabaseService.getRecentPayments();
      const qrHistory = await supabaseService.getRecentQRCodes();
      
      // Combine and process contacts
      const allPhones = [
        ...payments.map(p => ({ phone: p.phone_number, date: p.created_at })),
        ...qrHistory.map(q => ({ phone: q.phone_number, date: q.created_at }))
      ];
      
      // Group by phone and calculate frequency
      const phoneMap = new Map<string, { lastUsed: string; frequency: number }>();
      
      allPhones.forEach(({ phone, date }) => {
        if (phoneMap.has(phone)) {
          const existing = phoneMap.get(phone)!;
          phoneMap.set(phone, {
            lastUsed: new Date(date) > new Date(existing.lastUsed) ? date : existing.lastUsed,
            frequency: existing.frequency + 1
          });
        } else {
          phoneMap.set(phone, { lastUsed: date, frequency: 1 });
        }
      });
      
      // Get favorites from localStorage
      const favorites = JSON.parse(localStorage.getItem('favorite_contacts') || '[]');
      
      // Convert to contact objects and sort
      const contactList: Contact[] = Array.from(phoneMap.entries())
        .map(([phone, data]) => ({
          phone_number: phone,
          last_used: data.lastUsed,
          frequency: data.frequency,
          is_favorite: favorites.includes(phone)
        }))
        .sort((a, b) => {
          // Favorites first, then by frequency, then by recency
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          if (a.frequency !== b.frequency) return b.frequency - a.frequency;
          return new Date(b.last_used).getTime() - new Date(a.last_used).getTime();
        })
        .slice(0, 8); // Show max 8 contacts
      
      setContacts(contactList);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (phone: string) => {
    const favorites = JSON.parse(localStorage.getItem('favorite_contacts') || '[]');
    const updatedFavorites = favorites.includes(phone)
      ? favorites.filter((f: string) => f !== phone)
      : [...favorites, phone];
    
    localStorage.setItem('favorite_contacts', JSON.stringify(updatedFavorites));
    
    setContacts(prev => prev.map(contact => 
      contact.phone_number === phone 
        ? { ...contact, is_favorite: !contact.is_favorite }
        : contact
    ));
  };

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

  if (loading) {
    return (
      <div className="glass-card p-4 mb-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (contacts.length === 0) return null;

  return (
    <div className="glass-card p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
        <Clock className="w-4 h-4" />
        <span>Recent Contacts</span>
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
        {contacts.map((contact) => (
          <button
            key={contact.phone_number}
            onClick={() => onSelectContact(contact.phone_number)}
            className={`p-3 rounded-xl border-2 transition-all text-left relative group ${
              currentPhone === contact.phone_number
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {contact.phone_number}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(contact.last_used)} • {contact.frequency}x
                  </p>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(contact.phone_number);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
              >
                <Star 
                  className={`w-4 h-4 ${
                    contact.is_favorite 
                      ? 'text-yellow-500 fill-current' 
                      : 'text-gray-400 hover:text-yellow-500'
                  }`}
                />
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentContacts;
