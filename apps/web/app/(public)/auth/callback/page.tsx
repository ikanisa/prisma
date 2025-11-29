'use client';

import { useEffect, useState, useRef } from 'react';
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
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const supabase = createClient();
    
    // Set up auth state change listener for handling the callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMountedRef.current) return;
      
      if (event === 'SIGNED_IN' && session) {
        const next = searchParams.get('next') ?? '/dashboard';
        router.push(next);
      }
    });

    const handleAuthCallback = async () => {
      // Check for error in URL (from Supabase redirect)
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      if (errorParam) {
        if (isMountedRef.current) {
          setError(errorDescription || errorParam);
        }
        return;
      }

      // Get the next redirect URL
      const next = searchParams.get('next') ?? '/dashboard';

      // Try to get session (Supabase client library handles the code exchange automatically)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!isMountedRef.current) return;
      
      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (session) {
        router.push(next);
      } else {
        // No session found - this might be an invalid or expired link
        // The auth state change listener will handle successful logins
        // If no session comes through after a brief wait, redirect to login
        const timeoutId = setTimeout(() => {
          if (isMountedRef.current && !session) {
            router.push('/login');
          }
        }, 5000);
        
        return () => clearTimeout(timeoutId);
      }
    };

    handleAuthCallback();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  // Redirect on error after a delay
  useEffect(() => {
    if (error) {
      const timeoutId = setTimeout(() => {
        router.push('/login?error=auth_callback_error');
      }, 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [error, router]);

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
