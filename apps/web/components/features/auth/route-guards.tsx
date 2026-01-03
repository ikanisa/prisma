'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/features/auth/auth-provider';

interface AdminGuardProps {
    children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
    const { profile, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            // Not logged in
            if (!user) {
                router.push('/login');
                return;
            }

            // Not admin
            if (profile && profile.role !== 'SYSTEM_ADMIN') {
                router.push('/dashboard');
                return;
            }

            // Suspended
            if (profile?.status === 'SUSPENDED') {
                router.push('/login?error=suspended');
                return;
            }
        }
    }, [isLoading, user, profile, router]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Not authorized
    if (!user || profile?.role !== 'SYSTEM_ADMIN') {
        return null;
    }

    return <>{children}</>;
}

// Auth guard for any authenticated user
export function AuthGuard({ children }: AdminGuardProps) {
    const { user, profile, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push('/login');
                return;
            }

            if (profile?.status === 'SUSPENDED') {
                router.push('/login?error=suspended');
                return;
            }
        }
    }, [isLoading, user, profile, router]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
