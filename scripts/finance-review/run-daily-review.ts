#!/usr/bin/env tsx
/**
 * Finance Review - Daily Review CLI
 * 
 * Executes the dual-agent financial review and outputs results.
 * Can be run manually or scheduled via cron.
 * 
 * Usage:
 *   tsx scripts/finance-review/run-daily-review.ts [--org-id=UUID] [--hours=24]
 *   
 * Environment variables:
 *   DEFAULT_ORG_ID - Default organization ID if not specified
 *   API_BASE_URL - Base URL for API calls (default: http://localhost:3000)
 */

import { financeReviewEnv } from '../../src/lib/finance-review/env';

interface ReviewResult {
  status: 'GREEN' | 'AMBER' | 'RED';
  cfo: {
    summary: string;
    status: string;
    issues: Array<{ type: string; id: string; explain: string; severity: string }>;
    proposed_entries: Array<unknown>;
  };
  auditor: {
    exceptions: Array<{ ref: string; risk: string; explain: string; recommendation: string }>;
    risk_level: string;
    comments: string[];
  };
  tasks: string[];
  controlLogId: string;
}

async function runDailyReview() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let orgId = financeReviewEnv.DEFAULT_ORG_ID;
  let hours = 24;

  for (const arg of args) {
    if (arg.startsWith('--org-id=')) {
      orgId = arg.split('=')[1];
    } else if (arg.startsWith('--hours=')) {
      hours = parseInt(arg.split('=')[1], 10);
    }
  }

  // Determine API base URL
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const endpoint = `${apiBaseUrl}/api/review/run`;

  console.log('🔍 Running Daily Financial Review');
  console.log(`   Organization: ${orgId}`);
  console.log(`   Period: Last ${hours} hours`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log('');

  try {
    // Call review API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orgId, hours }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error (${response.status}): ${JSON.stringify(errorData)}`);
    }

    const result: ReviewResult = await response.json();

    // Display results
    console.log(`\n${'='.repeat(60)}`);
    console.log(`OVERALL STATUS: ${result.status}`);
    console.log(`${'='.repeat(60)}\n`);

    console.log('📊 CFO Agent Summary:');
    console.log(`   ${result.cfo.summary}`);
    console.log(`   Status: ${result.cfo.status}`);
    console.log(`   Issues Found: ${result.cfo.issues.length}`);
    console.log(`   Proposed Entries: ${result.cfo.proposed_entries.length}`);
    console.log('');

    if (result.cfo.issues.length > 0) {
      console.log('   Top Issues:');
      result.cfo.issues.slice(0, 3).forEach((issue) => {
        console.log(`   - [${issue.severity}] ${issue.type}: ${issue.explain}`);
      });
      console.log('');
    }

    console.log('🔎 Auditor Agent Assessment:');
    console.log(`   Risk Level: ${result.auditor.risk_level}`);
    console.log(`   Exceptions Raised: ${result.auditor.exceptions.length}`);
    console.log('');

    if (result.auditor.exceptions.length > 0) {
      console.log('   Top Exceptions:');
      result.auditor.exceptions.slice(0, 3).forEach((exc) => {
        console.log(`   - [${exc.risk}] ${exc.ref}: ${exc.recommendation}`);
      });
      console.log('');
    }

    if (result.auditor.comments.length > 0) {
      console.log('   Comments:');
      result.auditor.comments.forEach((comment) => {
        console.log(`   - ${comment}`);
      });
      console.log('');
    }

    console.log(`✅ Control Log ID: ${result.controlLogId}`);
    console.log('');

    // Exit with status code based on result
    if (result.status === 'RED') {
      console.error('⚠️  CRITICAL ISSUES FOUND - Manual review required');
      process.exit(1);
    } else if (result.status === 'AMBER') {
      console.warn('⚠️  Minor issues found - Review recommended');
      process.exit(0);
    } else {
      console.log('✅ No issues found - Close can proceed');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Daily review failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runDailyReview();
}

export { runDailyReview };
