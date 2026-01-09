/**
 * Anomaly Alerts API
 * 
 * GET /api/ai/anomalies - Get detected anomalies
 * PATCH /api/ai/anomalies - Dismiss or investigate anomaly
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const showReviewed = searchParams.get('reviewed') === 'true';

        // Build query
        let query = supabase
            .from('anomaly_detections')
            .select(`
        id,
        transaction_id,
        anomaly_type,
        severity,
        risk_score,
        description,
        reason,
        recommended_action,
        related_transactions,
        reviewed,
        false_positive,
        created_at
      `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (!showReviewed) {
            query = query.eq('reviewed', false);
        }

        const { data: anomalies, error } = await query;

        if (error) {
            console.error('Error fetching anomalies:', error);
            return NextResponse.json({ error: 'Failed to fetch anomalies' }, { status: 500 });
        }

        // Get counts
        const { count: totalUnreviewed } = await supabase
            .from('anomaly_detections')
            .select('*', { count: 'exact', head: true })
            .eq('reviewed', false);

        const { count: criticalCount } = await supabase
            .from('anomaly_detections')
            .select('*', { count: 'exact', head: true })
            .eq('reviewed', false)
            .in('severity', ['critical', 'high']);

        // Calculate overall risk score (average of top 10 unreviewed)
        const { data: topAnomalies } = await supabase
            .from('anomaly_detections')
            .select('risk_score')
            .eq('reviewed', false)
            .order('risk_score', { ascending: false })
            .limit(10);

        const overallRiskScore = topAnomalies && topAnomalies.length > 0
            ? topAnomalies.reduce((sum, a) => sum + (a.risk_score || 0), 0) / topAnomalies.length
            : 0;

        // Transform to frontend format
        const alerts = (anomalies || []).map(a => ({
            id: a.id,
            transactionId: a.transaction_id,
            type: a.anomaly_type,
            severity: a.severity,
            description: a.description,
            reason: a.reason,
            riskScore: a.risk_score,
            recommendedAction: a.recommended_action,
            relatedTransactions: a.related_transactions,
            createdAt: a.created_at,
        }));

        return NextResponse.json({
            alerts,
            totalCount: totalUnreviewed || 0,
            criticalCount: criticalCount || 0,
            overallRiskScore: Math.round(overallRiskScore),
        });
    } catch (error) {
        console.error('Anomalies GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await request.json();

        const { id, action, notes, userId } = body;

        if (!id || !action) {
            return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
        }

        if (!['investigate', 'dismiss', 'false_positive'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const updates: Record<string, unknown> = {
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
        };

        switch (action) {
            case 'dismiss':
                updates.reviewed = true;
                break;
            case 'false_positive':
                updates.reviewed = true;
                updates.false_positive = true;
                break;
            case 'investigate':
                updates.reviewer_notes = notes || 'Under investigation';
                break;
        }

        const { error: updateError } = await supabase
            .from('anomaly_detections')
            .update(updates)
            .eq('id', id);

        if (updateError) {
            console.error('Error updating anomaly:', updateError);
            return NextResponse.json({ error: 'Failed to update anomaly' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Anomalies PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
