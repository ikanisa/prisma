import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

const STORAGE_KEY = 'cookieConsent';

type ConsentState = 'accepted' | 'rejected' | null;

export function useConsent() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const trackingEnabled = (import.meta.env.VITE_TRACKING_ENABLED ?? 'false') !== 'false';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'accepted' || raw === 'rejected') {
        setConsent(raw);
      } else {
        setConsent(null);
      }
    } catch (error) {
      logger.warn('cookie_consent.read_failed', error);
      setConsent(null);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch (error) {
      logger.warn('cookie_consent.write_failed', error);
    }
    setConsent('accepted');
  };

  const reject = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'rejected');
    } catch (error) {
      logger.warn('cookie_consent.write_failed', error);
    }
    setConsent('rejected');
  };

  return { consent, accept, reject, trackingEnabled };
}
