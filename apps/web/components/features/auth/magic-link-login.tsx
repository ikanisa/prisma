'use client';

import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { useAuth } from './auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface MagicLinkLoginProps {
  email: string;
  setEmail: (email: string) => void;
}

export function MagicLinkLogin({ email, setEmail }: MagicLinkLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signInWithMagicLink } = useAuth();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Magic link sent!</p>
            <p className="text-xs">Check your email ({email}) and click the link to sign in.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setSuccess(false);
            setEmail('');
          }}
        >
          Send another link
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleMagicLink} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="magic-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          We&apos;ll send you a passwordless sign-in link
        </p>
      </div>
      <Button type="submit" variant="outline" className="w-full" disabled={isLoading || !email}>
        {isLoading ? (
          <>
            <Send className="mr-2 h-4 w-4 animate-pulse" />
            Sending link...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send magic link
          </>
        )}
      </Button>
    </form>
  );
}

