import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { recordClientEvent } from '@/lib/client-events';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<{ error?: string }>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      recordClientEvent({ name: 'auth:demoModeActivated' });
      const demoUser = {
        id: '1',
        email: 'demo@aurora.test',
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        last_sign_in_at: new Date().toISOString(),
        app_metadata: { provider: 'local-demo' },
        user_metadata: { name: 'Demo User' },
        identities: [],
        factors: [],
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
      } as unknown as User;

      setUser(demoUser);
      setSession(null);
      setLoading(false);
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
      setUser((prev) =>
        prev ?? ({
          id: '1',
          email,
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: { provider: 'local-demo' },
          user_metadata: { name: email.split('@')[0] ?? 'Demo User' },
          aud: 'authenticated',
          role: 'authenticated',
          identities: [],
          factors: [],
          created_at: new Date().toISOString(),
          phone: '',
          updated_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
        } as unknown as User),
      );
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

  const signUp = async (email: string, password: string, name: string) => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return { error: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.' };
    }

    setLoading(true);
    try {
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
      setUser(null);
      setSession(null);
      return;
    }

    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const sendMagicLink = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase magic links require server configuration.' };
    }

    setLoading(true);
    try {
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
