
import { useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabaseService';

export const useSupabaseCache = () => {
  const [recentPhones, setRecentPhones] = useState<string[]>([]);
  const [recentQRs, setRecentQRs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = async () => {
    try {
      setIsLoading(true);

      // Always try to load from Supabase
      const payments = await supabaseService.getRecentPayments();
      const phones = payments.map(p => p.phone_number).filter((phone, index, arr) => arr.indexOf(phone) === index);
      setRecentPhones(phones.slice(0, 5));

      // Recent QR codes from backend
      const qrs = await supabaseService.getRecentQRCodes();
      setRecentQRs(qrs);

    } catch (error) {
      console.error('Failed to load cached data:', error);
      // fallback: load from localStorage
      const localPhones = JSON.parse(localStorage.getItem('recent_phones') || '[]');
      setRecentPhones(localPhones);
    } finally {
      setIsLoading(false);
    }
  };

  const addPhone = (phone: string) => {
    const updated = [phone, ...recentPhones.filter(p => p !== phone)].slice(0, 5);
    setRecentPhones(updated);
    localStorage.setItem('recent_phones', JSON.stringify(updated));
  };

  const getRecentPhones = () => recentPhones;
  const getRecentQRCodes = () => recentQRs;

  return {
    recentPhones,
    recentQRs,
    isLoading,
    addPhone,
    getRecentPhones,
    getRecentQRCodes,
    refreshCache: loadCachedData
  };
};
