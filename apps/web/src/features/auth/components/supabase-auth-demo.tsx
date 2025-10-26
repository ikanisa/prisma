'use client';

import { FormEvent, useState } from 'react';
import { useSupabaseAuth } from '../hooks/use-supabase-auth';

export function SupabaseAuthDemo() {
  const { session, status, signInWithOtp, signOut } = useSupabaseAuth();
  const [email, setEmail] = useState('stub-user@example.com');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      await signInWithOtp(email);
      setMessage('Sign-in request sent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-in failed.');
    } finally {
      setPending(false);
    }
  };

  const handleSignOut = async () => {
    setPending(true);
    setMessage(null);
    try {
      await signOut();
      setMessage('Signed out successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-out failed.');
    } finally {
      setPending(false);
    }
  };

  const sessionEmail = session?.user?.email ?? null;

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">Supabase auth demo</h2>
        <p className="text-sm text-muted-foreground">
          Trigger the OTP flow and observe session updates using the in-browser Supabase client. In stub mode the
          session is fulfilled immediately.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-foreground" htmlFor="supabase-demo-email">
          Email address
        </label>
        <input
          id="supabase-demo-email"
          data-testid="supabase-email-input"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          data-testid="supabase-sign-in"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending}
        >
          {pending ? 'Processing…' : 'Send magic link'}
        </button>
      </form>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Session status: {status}</p>
        <p className="text-sm" data-testid="supabase-session-email">
          {sessionEmail ? `Active session for ${sessionEmail}` : 'No active session'}
        </p>
        <button
          type="button"
          data-testid="supabase-sign-out"
          onClick={handleSignOut}
          className="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending || !session}
        >
          Sign out
        </button>
      </div>

      {message && (
        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" data-testid="supabase-feedback">
          {message}
        </div>
      )}
    </div>
  );
}
