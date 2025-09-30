import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';
import { sendWhatsappOtp, verifyWhatsappOtp } from '@/lib/mfa';

export interface WhatsappMfaState {
  phone: string;
  verified: boolean;
  lastVerifiedAt: Date | null;
  loading: boolean;
}

export function useWhatsappMfa() {
  const { user } = useAuth();
  const { currentOrg } = useOrganizations();
  const [state, setState] = useState<WhatsappMfaState>({ phone: '', verified: false, lastVerifiedAt: null, loading: false });
  const [cooldown, setCooldown] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('whatsapp_e164, whatsapp_verified')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        throw error;
      }
      let lastVerified: Date | null = null;
      if (currentOrg) {
        const { data: challengeData } = await supabase
          .from('mfa_challenges')
          .select('created_at')
          .eq('org_id', currentOrg.id)
          .eq('user_id', user.id)
          .eq('channel', 'WHATSAPP')
          .eq('consumed', true)
          .order('created_at', { ascending: false })
          .limit(1);
        if (challengeData?.length) {
          const value = challengeData[0].created_at as string;
          lastVerified = value ? new Date(value) : null;
        }
      }
      setState({
        phone: data?.whatsapp_e164 ?? '',
        verified: Boolean(data?.whatsapp_verified),
        lastVerifiedAt: lastVerified,
        loading: false,
      });
    } catch (error) {
      console.error('mfa.refresh_failed', error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [currentOrg, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendCode = useCallback(
    async (phone: string) => {
      if (!user || !currentOrg) {
        throw new Error('Missing context');
      }
      if (!phone.trim()) {
        throw new Error('WhatsApp number is required');
      }
      setState((prev) => ({ ...prev, loading: true }));
      try {
        await sendWhatsappOtp({ orgId: currentOrg.id, userId: user.id, whatsappE164: phone.trim() });
        setState((prev) => ({ ...prev, phone: phone.trim() }));
        setCooldown(60);
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [currentOrg, user],
  );

  const verifyCode = useCallback(
    async (code: string) => {
      if (!user || !currentOrg) {
        throw new Error('Missing context');
      }
      setState((prev) => ({ ...prev, loading: true }));
      try {
        await verifyWhatsappOtp({ orgId: currentOrg.id, userId: user.id, code: code.trim() });
        await refresh();
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [currentOrg, refresh, user],
  );

  const cooldownMessage = useMemo(() => (cooldown ? `Resend in ${cooldown}s` : null), [cooldown]);

  return {
    state,
    refresh,
    sendCode,
    verifyCode,
    cooldown,
    cooldownMessage,
    isSupabaseConfigured,
  };
}
