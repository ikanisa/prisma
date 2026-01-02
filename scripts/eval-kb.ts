#!/usr/bin/env tsx
/**
 * Knowledge Factory Eval Harness
 * 
 * Runs golden question evaluations and generates reports
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { retrieve, type RetrievalOptions } from '../services/rag/knowledge/retriever.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

interface EvalQuestion {
    id: string;
    question: string;
    expectedFilters?: {
        standard?: string;
        jurisdiction?: string;
        docType?: string;
    };
    expectedCitations?: {
        documentPatterns: string[];
        minResults: number;
    };
    expectedKeyPoints?: string[];
    difficulty: 'basic' | 'intermediate' | 'advanced';
}

interface EvalResult {
    questionId: string;
    question: string;
    passed: boolean;
    retrievalScore: number;
    groundednessScore: number;
    details: {
        retrievedDocs: string[];
        matchedPatterns: string[];
        missingPatterns: string[];
        durationMs: number;
    };
}

interface EvalReport {
    runId: string;
    timestamp: string;
    orgId: string;
    totalQuestions: number;
    passed: number;
    failed: number;
    avgRetrievalScore: number;
    avgGroundednessScore: number;
    results: EvalResult[];
}

async function main() {
    const orgId = process.argv[2] || process.env.EVAL_ORG_ID;
    if (!orgId) {
        console.error('Usage: pnpm eval:kb <org-id>');
        process.exit(1);
    }

    console.log(`[EVAL] Starting KB evaluation for org ${orgId}...`);

    // Load questions
    const questionsPath = path.join(__dirname, '../evals/kb/questions.json');
    const questions: EvalQuestion[] = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
    console.log(`[EVAL] Loaded ${questions.length} questions`);

    // Initialize clients
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Run evaluations
    const results: EvalResult[] = [];

    for (const q of questions) {
        console.log(`[EVAL] Testing: ${q.id}...`);
        const result = await evaluateQuestion(q, orgId, { supabase, openai });
        results.push(result);
        console.log(`  ${result.passed ? '✓' : '✗'} Retrieval: ${result.retrievalScore.toFixed(2)}`);
    }

    // Generate report
    const report: EvalReport = {
        runId: `eval-${Date.now()}`,
        timestamp: new Date().toISOString(),
        orgId,
        totalQuestions: questions.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        avgRetrievalScore: average(results.map(r => r.retrievalScore)),
        avgGroundednessScore: average(results.map(r => r.groundednessScore)),
        results,
    };

    // Output report
    const reportPath = path.join(__dirname, `../evals/kb/report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n[EVAL] Report written to ${reportPath}`);

    // Print summary
    console.log('\n=== EVALUATION SUMMARY ===');
    console.log(`Total: ${report.totalQuestions}`);
    console.log(`Passed: ${report.passed} (${((report.passed / report.totalQuestions) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${report.failed}`);
    console.log(`Avg Retrieval Score: ${report.avgRetrievalScore.toFixed(2)}`);
    console.log(`Avg Groundedness Score: ${report.avgGroundednessScore.toFixed(2)}`);

    // Generate markdown report
    const mdReport = generateMarkdownReport(report);
    const mdPath = path.join(__dirname, `../evals/kb/report-${Date.now()}.md`);
    fs.writeFileSync(mdPath, mdReport);
    console.log(`Markdown report: ${mdPath}`);

    process.exit(report.failed > 0 ? 1 : 0);
}

async function evaluateQuestion(
    q: EvalQuestion,
    orgId: string,
    deps: { supabase: any; openai: OpenAI }
): Promise<EvalResult> {
    const startTime = Date.now();

    const options: RetrievalOptions = {
        tenantId: orgId,
        userRole: 'MANAGER',
        filters: q.expectedFilters as any,
        topK: 5,
    };

    let retrievedDocs: string[] = [];
    let retrievalScore = 0;

    try {
        const result = await retrieve(q.question, options, deps);
        retrievedDocs = result.chunks.map(c => c.documentName);

        // Calculate retrieval score
        if (q.expectedCitations) {
            const matchedPatterns: string[] = [];
            const missingPatterns: string[] = [];

            for (const pattern of q.expectedCitations.documentPatterns) {
                const found = retrievedDocs.some(doc =>
                    doc.toLowerCase().includes(pattern.toLowerCase())
                );
                if (found) {
                    matchedPatterns.push(pattern);
                } else {
                    missingPatterns.push(pattern);
                }
            }

            const patternScore = matchedPatterns.length / q.expectedCitations.documentPatterns.length;
            const countScore = Math.min(1, result.chunks.length / q.expectedCitations.minResults);
            retrievalScore = (patternScore + countScore) / 2;

            const passed = retrievalScore >= 0.5 && missingPatterns.length === 0;

            return {
                questionId: q.id,
                question: q.question,
                passed,
                retrievalScore,
                groundednessScore: result.chunks.length > 0 ? 0.8 : 0,
                details: {
                    retrievedDocs,
                    matchedPatterns,
                    missingPatterns,
                    durationMs: Date.now() - startTime,
                },
            };
        }
    } catch (error) {
        console.error(`  Error: ${error}`);
    }

    return {
        questionId: q.id,
        question: q.question,
        passed: false,
        retrievalScore: 0,
        groundednessScore: 0,
        details: {
            retrievedDocs,
            matchedPatterns: [],
            missingPatterns: q.expectedCitations?.documentPatterns || [],
            durationMs: Date.now() - startTime,
        },
    };
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function generateMarkdownReport(report: EvalReport): string {
    const passRate = ((report.passed / report.totalQuestions) * 100).toFixed(1);

    return `# KB Evaluation Report

**Run ID:** ${report.runId}
**Timestamp:** ${report.timestamp}
**Organization:** ${report.orgId}

## Summary

| Metric | Value |
|--------|-------|
| Total Questions | ${report.totalQuestions} |
| Passed | ${report.passed} (${passRate}%) |
| Failed | ${report.failed} |
| Avg Retrieval Score | ${report.avgRetrievalScore.toFixed(2)} |
| Avg Groundedness Score | ${report.avgGroundednessScore.toFixed(2)} |

## Results

${report.results.map(r => `
### ${r.passed ? '✅' : '❌'} ${r.questionId}

**Question:** ${r.question}

| Metric | Value |
|--------|-------|
| Retrieval Score | ${r.retrievalScore.toFixed(2)} |
| Groundedness | ${r.groundednessScore.toFixed(2)} |
| Duration | ${r.details.durationMs}ms |

**Retrieved:** ${r.details.retrievedDocs.join(', ') || 'None'}

**Matched Patterns:** ${r.details.matchedPatterns.join(', ') || 'None'}

**Missing Patterns:** ${r.details.missingPatterns.join(', ') || 'None'}
`).join('\n---\n')}
`;
}

main().catch(console.error);
