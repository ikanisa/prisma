/**
 * AI Processing Status API
 * 
 * GET /api/ai/status - Get real-time AI processing metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get processing stats for today
        const { data: todayStats, error: statsError } = await supabase
            .from('transaction_processing')
            .select('route, confidence_score, correction_applied')
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString());

        if (statsError) {
            console.error('Error fetching stats:', statsError);
            return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
        }

        const stats = todayStats || [];
        const total = stats.length;
        const autoProcessed = stats.filter(s => s.route === 'auto').length;
        const pendingReview = stats.filter(s => s.route === 'human-review').length;
        const rejected = stats.filter(s => s.route === 'reject').length;

        const avgConfidence = total > 0
            ? stats.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / total
            : 0;

        // Get 7-day trend for confidence
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: weekStats } = await supabase
            .from('transaction_processing')
            .select('confidence_score')
            .gte('created_at', weekAgo.toISOString())
            .lt('created_at', today.toISOString());

        const weekAvgConfidence = weekStats && weekStats.length > 0
            ? weekStats.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / weekStats.length
            : avgConfidence;

        const confidenceTrend = avgConfidence > weekAvgConfidence ? 'up'
            : avgConfidence < weekAvgConfidence ? 'down'
                : 'stable';

        return NextResponse.json({
            autoProcessedCount: autoProcessed,
            autoProcessedPercent: total > 0 ? (autoProcessed / total) * 100 : 0,
            pendingReviewCount: pendingReview,
            rejectedCount: rejected,
            avgConfidence: avgConfidence * 100,
            confidenceTrend,
            totalToday: total,
        });
    } catch (error) {
        console.error('AI status error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
