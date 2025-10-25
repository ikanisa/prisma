import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { recordClientEvent } from '@/lib/client-events';
import { isPasswordBreached, isPasswordBreachCheckEnabled } from '@/lib/security/password';
import { logger } from '@/lib/logger';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string, captchaToken?: string | null) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string, captchaToken?: string | null) => Promise<{ error?: string }>;
}

export function useAuth(): AuthState {
  const createDemoUser = (overrides?: Partial<User>): User => ({
    id: '1',
    email: 'demo@prismaglow.test',
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'local-demo' },
    user_metadata: { name: 'Demo User' },
    aud: 'authenticated',
    role: 'authenticated',
    identities: [],
    factors: [],
    created_at: new Date().toISOString(),
    phone: '',
    updated_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    ...overrides,
  } as unknown as User);

  const [user, setUser] = useState<User | null>(!isSupabaseConfigured ? createDemoUser() : null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const { toast } = useToast();
  const shouldCheckPasswords = isPasswordBreachCheckEnabled();
  const captchaEnabled =
    (import.meta.env.VITE_ENABLE_CAPTCHA ?? '').toString().toLowerCase() === 'true';
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

  const verifyCaptchaToken = async (token?: string | null): Promise<void> => {
    if (!captchaEnabled) {
      return;
    }

    if (!apiBaseUrl) {
      logger.warn('captcha_enabled_but_api_base_missing');
      return;
    }

    if (!token) {
      throw new Error('captcha_required');
    }

    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}/v1/security/verify-captcha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      logger.warn('captcha.verification_request_failed', { error });
      throw new Error('captcha_verification_unavailable');
    }

    if (!response.ok) {
      let detail = 'captcha_verification_failed';
      try {
        const payload = await response.json();
        detail = payload?.detail ?? detail;
      } catch {
        // ignore parse errors
      }
      throw new Error(detail);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      recordClientEvent({ name: 'auth:demoModeActivated' });
      return;
    }

    recordClientEvent({ name: 'auth:listenerRegistered' });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        recordClientEvent({ name: 'auth:stateChange', data: { event, userPresent: Boolean(session?.user) } });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      recordClientEvent({ name: 'auth:initialSessionResolved', data: { userPresent: Boolean(session?.user) } });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      setUser((prev) => prev ?? createDemoUser({
        email,
        user_metadata: { name: email.split('@')[0] ?? 'Demo User' },
      }));
      setLoading(false);
      return {};
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return {};
    } catch (error: any) {
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, captchaToken?: string | null) => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return { error: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.' };
    }

    setLoading(true);
    try {
      if (shouldCheckPasswords) {
        const breached = await isPasswordBreached(password).catch((error) => {
          logger.warn('password_breach_check_failed', { error });
          return false;
        });

        if (breached) {
          return { error: 'This password has appeared in a data breach. Choose a different password.' };
        }
      }

      await verifyCaptchaToken(captchaToken);

      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name
          }
        }
      });

      if (error) {
        throw error;
      }

      return {};
    } catch (error: any) {
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(createDemoUser());
      setSession(null);
      return;
    }

    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const sendMagicLink = async (email: string, captchaToken?: string | null) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase magic links require server configuration.' };
    }

    setLoading(true);
    try {
      await verifyCaptchaToken(captchaToken);

      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        throw error;
      }

      return {};
    } catch (error: any) {
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    sendMagicLink
  };
}
