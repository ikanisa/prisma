/**
 * Pending Reviews API
 * 
 * GET /api/ai/reviews - Get pending reviews queue
 * PATCH /api/ai/reviews - Complete a review (approve/reject)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get pending reviews (transactions requiring human review)
        const { data: reviews, error } = await supabase
            .from('transaction_processing')
            .select(`
        id,
        transaction_id,
        predicted_category,
        confidence_score,
        reasoning,
        predictions,
        created_at
      `)
            .eq('route', 'human-review')
            .eq('human_reviewed', false)
            .order('confidence_score', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error fetching reviews:', error);
            return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
        }

        // Get counts
        const { count: total } = await supabase
            .from('transaction_processing')
            .select('*', { count: 'exact', head: true })
            .eq('route', 'human-review')
            .eq('human_reviewed', false);

        const { count: highPriority } = await supabase
            .from('transaction_processing')
            .select('*', { count: 'exact', head: true })
            .eq('route', 'human-review')
            .eq('human_reviewed', false)
            .lt('confidence_score', 0.7);

        // Transform to frontend format
        const items = (reviews || []).map(r => ({
            id: r.id,
            transactionId: r.transaction_id,
            vendor: 'Unknown', // Would join with transactions table
            amount: 0, // Would join with transactions table
            currency: 'USD',
            suggestedCategory: r.predicted_category,
            confidence: r.confidence_score,
            reasoning: r.reasoning || 'AI categorization',
            priority: r.confidence_score < 0.7 ? 'high' : r.confidence_score < 0.85 ? 'medium' : 'low',
            createdAt: r.created_at,
        }));

        return NextResponse.json({
            items,
            total: total || 0,
            highPriorityCount: highPriority || 0,
        });
    } catch (error) {
        console.error('Reviews GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await request.json();

        const { id, approved, correctedCategory, userId } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing review ID' }, { status: 400 });
        }

        // Update the processing record
        const { error: updateError } = await supabase
            .from('transaction_processing')
            .update({
                human_reviewed: true,
                correction_applied: !!correctedCategory,
                predicted_category: correctedCategory || undefined,
                reviewed_by: userId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (updateError) {
            console.error('Error updating review:', updateError);
            return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
        }

        // If corrected, log the correction for learning
        if (correctedCategory) {
            const { error: correctionError } = await supabase
                .from('ai_corrections')
                .insert({
                    transaction_id: id, // Using processing ID for now
                    processing_id: id,
                    feedback_type: 'category',
                    corrected_value: correctedCategory,
                    user_id: userId || '00000000-0000-0000-0000-000000000000',
                });

            if (correctionError) {
                console.error('Error logging correction:', correctionError);
                // Non-fatal, continue
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reviews PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
