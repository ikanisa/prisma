/**
 * Health Check API Route
 * 
 * Provides health status for monitoring and load balancers.
 * Returns 200 OK if healthy, 503 if unhealthy.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'edge';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    checks: {
        database: { status: string; latency?: number };
        auth: { status: string };
        environment: { status: string };
    };
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
    const startTime = Date.now();

    const checks = {
        database: { status: 'unknown' as string, latency: undefined as number | undefined },
        auth: { status: 'unknown' as string },
        environment: { status: 'unknown' as string },
    };

    // Check environment
    checks.environment.status =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? 'healthy'
            : 'unhealthy';

    // Check database connectivity
    try {
        const dbStart = Date.now();
        const supabase = await createServerSupabaseClient();

        // Simple query to verify connectivity
        const { error } = await supabase.from('user_profiles').select('id').limit(1);

        checks.database.latency = Date.now() - dbStart;
        checks.database.status = error ? 'unhealthy' : 'healthy';
    } catch (e) {
        checks.database.status = 'unhealthy';
    }

    // Check auth service
    try {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase.auth.getSession();
        checks.auth.status = error ? 'degraded' : 'healthy';
    } catch (e) {
        checks.auth.status = 'unhealthy';
    }

    // Determine overall status
    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
    const anyUnhealthy = Object.values(checks).some(c => c.status === 'unhealthy');

    const status: HealthStatus = {
        status: anyUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || 'unknown',
        checks,
    };

    const httpStatus = status.status === 'healthy' ? 200 :
        status.status === 'degraded' ? 200 : 503;

    return NextResponse.json(status, {
        status: httpStatus,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Response-Time': `${Date.now() - startTime}ms`,
        },
    });
}
