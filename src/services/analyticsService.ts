
import { getSessionId } from './supabaseService';

export interface AnalyticsEvent {
  event_name: string;
  properties?: Record<string, any>;
  user_agent?: string;
  timestamp?: string;
}

export const analyticsService = {
  async trackEvent(eventName: string, properties: Record<string, any> = {}) {
    try {
      const sessionId = getSessionId();

      const event: AnalyticsEvent = {
        event_name: eventName,
        properties: {
          ...properties,
          session_id: sessionId,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          referrer: document.referrer
        }
      };

      // Production: could call a Supabase event logging edge function here if desired
      // For now, just log to the console for clarity
      console.log('[Analytics]', eventName, properties);

      return true;
    } catch (error) {
      console.error('Analytics tracking failed:', error);
      return false;
    }
  },

  trackPageView(page: string) {
    return this.trackEvent('page_view', { page });
  },

  trackQRGeneration(amount: number, method: string) {
    return this.trackEvent('qr_generated', { amount, method });
  },

  trackPaymentAttempt(amount: number, recipient: string) {
    return this.trackEvent('payment_attempt', { amount, recipient_type: recipient });
  },

  trackShare(method: string, amount: number) {
    return this.trackEvent('share_payment', { method, amount });
  },

  trackError(error: string, context: string) {
    return this.trackEvent('error_occurred', { error, context });
  }
};
