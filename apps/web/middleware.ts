import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, addRateLimitHeaders } from '@/lib/middleware/rate-limiter';

// Routes that require SYSTEM_ADMIN role
const ADMIN_ROUTES = ['/app/admin'];

// Routes that require authentication (any role)
const AUTH_ROUTES = ['/app'];

// Public routes (no auth required)
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/auth', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // ===========================================
    // RATE LIMITING (Blocker #6)
    // ===========================================
    if (pathname.startsWith('/api/')) {
        const rateLimit = checkRateLimit(request);

        if (rateLimit.limited) {
            const response = NextResponse.json(
                {
                    error: 'Too many requests',
                    message: `Rate limit exceeded. Please try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds.`,
                    retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
                },
                { status: 429 }
            );
            return addRateLimitHeaders(response, rateLimit);
        }
    }

    // ===========================================
    // SECURITY VALIDATION (Blocker #2)
    // ===========================================
    // Note: Full validation happens at app startup via security-validator.ts
    // This is a runtime check for stub mode
    if (process.env.NODE_ENV === 'production' &&
        process.env.SUPABASE_ALLOW_STUB === 'true') {
        console.error('[SECURITY] CRITICAL: SUPABASE_ALLOW_STUB is true in production!');
        // In production, we should fail hard - but for now log and continue
        // The security-validator.ts will throw on app startup
    }

    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        // If env vars are missing (e.g. during build), skip auth check
        return response;
    }

    const supabase = createServerClient(
        url,
        key,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser();

    // Check if route is public
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isPublicRoute) {
        return response;
    }

    // If not authenticated, redirect to login
    if (!user) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // Check if route requires admin role
    const isAdminRoute = ADMIN_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    if (isAdminRoute) {
        // Fetch user profile to check role
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'SYSTEM_ADMIN') {
            // Not an admin - redirect to dashboard with error
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.pathname = '/dashboard';
            redirectUrl.searchParams.set('error', 'unauthorized');
            return NextResponse.redirect(redirectUrl);
        }
    }

    // Add rate limit headers to successful responses for API routes
    if (pathname.startsWith('/api/')) {
        const rateLimit = checkRateLimit(request);
        return addRateLimitHeaders(response, rateLimit);
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (favicon)
         * - public files (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

