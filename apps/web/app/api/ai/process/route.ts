/**
 * Transaction Processing API
 * 
 * POST /api/ai/process - Process a transaction through the AI engine
 * POST /api/ai/process/batch - Process multiple transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface TransactionInput {
    id: string;
    type: 'bank_feed' | 'invoice' | 'receipt' | 'journal_entry' | 'payment' | 'transfer' | 'adjustment';
    date: string;
    amount: number;
    currency: string;
    description: string;
    vendor?: string;
    reference?: string;
}

// Simplified precision model matching (would use ai-engine package in production)
const VENDOR_PATTERNS: Record<string, { category: string; confidence: number }> = {
    'amazon': { category: 'Office Supplies', confidence: 0.95 },
    'aws': { category: 'Cloud Services', confidence: 0.98 },
    'google': { category: 'Software Subscriptions', confidence: 0.94 },
    'microsoft': { category: 'Software Subscriptions', confidence: 0.96 },
    'uber': { category: 'Transportation', confidence: 0.92 },
    'starbucks': { category: 'Meals & Entertainment', confidence: 0.94 },
    'payroll': { category: 'Payroll Expenses', confidence: 0.99 },
    'insurance': { category: 'Insurance', confidence: 0.91 },
    'rent': { category: 'Rent & Facilities', confidence: 0.97 },
    'utility': { category: 'Utilities', confidence: 0.93 },
};

function predictCategory(description: string, vendor?: string): { category: string; confidence: number; model: string } {
    const searchText = `${vendor || ''} ${description}`.toLowerCase();

    for (const [pattern, result] of Object.entries(VENDOR_PATTERNS)) {
        if (searchText.includes(pattern)) {
            return { ...result, model: 'precision' };
        }
    }

    // Default fallback
    return { category: 'Uncategorized', confidence: 0.5, model: 'precision' };
}

function determineRoute(confidence: number): 'auto' | 'human-review' | 'reject' {
    if (confidence >= 0.95) return 'auto';
    if (confidence >= 0.80) return 'human-review';
    return 'reject';
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await request.json() as TransactionInput | TransactionInput[];
        const startTime = Date.now();

        // Handle single or batch
        const transactions = Array.isArray(body) ? body : [body];
        const results = [];

        for (const tx of transactions) {
            // Predict category
            const prediction = predictCategory(tx.description, tx.vendor);
            const route = determineRoute(prediction.confidence);

            // Store processing result
            const { data, error } = await supabase
                .from('transaction_processing')
                .insert({
                    transaction_id: tx.id,
                    transaction_type: tx.type,
                    model_used: prediction.model,
                    confidence_score: prediction.confidence,
                    predicted_category: prediction.category,
                    route,
                    auto_processed: route === 'auto',
                    processing_time_ms: Date.now() - startTime,
                    reasoning: `Matched pattern for ${prediction.category}`,
                    predictions: [prediction],
                })
                .select()
                .single();

            if (error) {
                console.error('Error storing processing result:', error);
                results.push({
                    transactionId: tx.id,
                    success: false,
                    error: error.message,
                });
                continue;
            }

            results.push({
                transactionId: tx.id,
                success: true,
                processingId: data.id,
                category: prediction.category,
                confidence: prediction.confidence,
                route,
                autoProcessed: route === 'auto',
            });
        }

        // Return single result or batch results
        if (!Array.isArray(body)) {
            return NextResponse.json(results[0]);
        }

        return NextResponse.json({
            processed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        });
    } catch (error) {
        console.error('Process error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
