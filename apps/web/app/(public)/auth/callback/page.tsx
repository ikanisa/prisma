'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function AuthCallbackContent() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();
      
      // Check for error in URL (from Supabase redirect)
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      if (errorParam) {
        setError(errorDescription || errorParam);
        setTimeout(() => {
          router.push('/login?error=auth_callback_error');
        }, 3000);
        return;
      }

      // Get the next redirect URL
      const next = searchParams.get('next') ?? '/dashboard';

      // Try to get session (Supabase client library handles the code exchange automatically)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setError(sessionError.message);
        setTimeout(() => {
          router.push('/login?error=auth_callback_error');
        }, 3000);
        return;
      }

      if (session) {
        router.push(next);
      } else {
        // No session - might be waiting for email confirmation or other flow
        // Check if we have a hash fragment with access_token (magic link flow)
        if (typeof window !== 'undefined' && window.location.hash) {
          // The Supabase client should handle this, but let's wait a moment
          setTimeout(async () => {
            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (newSession) {
              router.push(next);
            } else {
              router.push('/login');
            }
          }, 1000);
        } else {
          router.push('/login');
        }
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-destructive">Authentication Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Redirecting to login page...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Authenticating...</CardTitle>
        <CardDescription>Please wait while we verify your credentials</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </CardContent>
    </Card>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Authenticating...</CardTitle>
          <CardDescription>Please wait while we verify your credentials</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
