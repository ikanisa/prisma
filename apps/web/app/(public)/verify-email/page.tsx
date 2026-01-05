'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/features/auth/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function VerifyEmailContent() {
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resendVerificationEmail } = useAuth();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleResend = async () => {
    if (!email) return;
    
    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const { error } = await resendVerificationEmail(email);
      if (error) {
        setResendError(error.message);
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch {
      setResendError('An unexpected error occurred');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
        <CardDescription>
          We&apos;ve sent a verification link to your email address
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {email && (
          <div className="rounded-lg bg-muted p-3 text-center text-sm">
            <p className="text-muted-foreground">Email sent to:</p>
            <p className="mt-1 font-medium">{email}</p>
          </div>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>To complete your account setup:</p>
          <ol className="list-inside list-decimal space-y-1 pl-2">
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the verification link in the email</li>
            <li>You&apos;ll be automatically signed in</li>
          </ol>
        </div>

        {resendSuccess && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Verification email resent successfully!
          </div>
        )}

        {resendError && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {resendError}
          </div>
        )}

        {email && (
          <div className="pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend verification email
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <p className="text-center text-sm text-muted-foreground">
          Already verified?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Card className="max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
