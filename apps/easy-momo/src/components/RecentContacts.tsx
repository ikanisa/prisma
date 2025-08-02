
import React, { useState, useEffect } from 'react';
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

// This component now only manages the data and provides it to the dropdown
// The UI is handled by RecentContactsDropdown when needed
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
        });
      
      setContacts(contactList);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // This component doesn't render anything visible - it just provides data
  // The actual UI is handled by RecentContactsDropdown when triggered
  return null;
};

// Export both the component and the contacts data hook
export const useRecentContacts = () => {
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
      
      const allPhones = [
        ...payments.map(p => ({ phone: p.phone_number, date: p.created_at })),
        ...qrHistory.map(q => ({ phone: q.phone_number, date: q.created_at }))
      ];
      
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
      
      const favorites = JSON.parse(localStorage.getItem('favorite_contacts') || '[]');
      
      const contactList: Contact[] = Array.from(phoneMap.entries())
        .map(([phone, data]) => ({
          phone_number: phone,
          last_used: data.lastUsed,
          frequency: data.frequency,
          is_favorite: favorites.includes(phone)
        }))
        .sort((a, b) => {
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          if (a.frequency !== b.frequency) return b.frequency - a.frequency;
          return new Date(b.last_used).getTime() - new Date(a.last_used).getTime();
        });
      
      setContacts(contactList);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  return { contacts, loading, refreshContacts: loadContacts };
};

export default RecentContacts;
