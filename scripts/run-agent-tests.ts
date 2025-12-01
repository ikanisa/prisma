#!/usr/bin/env ts-node

/**
 * Agent Test Runner Script
 * 
 * Runs automated agent tests and reports results.
 */

import { AgentTestRunner, RWANDA_TAX_TEST_SUITE, AUDIT_PLANNING_TEST_SUITE } from '../packages/lib/src/agent-testing';
import { RwandaTaxComplianceAgentRAG } from '../packages/tax/src/agents/tax-compliance-rw-035-rag';
import { AuditPlanningAgentRAG } from '../packages/audit/src/agents/planning-rag';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Agent Testing Framework');
  console.log('Started at:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════\n');

  const runner = new AgentTestRunner(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    process.env.OPENAI_API_KEY!
  );

  // Test 1: Rwanda Tax Agent
  console.log('\n🧪 Testing Rwanda Tax Agent...\n');
  const rwandaTaxAgent = new RwandaTaxComplianceAgentRAG({
    organizationId: 'test-org',
    userId: 'test-user',
    openaiApiKey: process.env.OPENAI_API_KEY!,
  });

  const rwandaResults = await runner.runTestSuite(RWANDA_TAX_TEST_SUITE, rwandaTaxAgent);
  
  console.log(`\n✅ Rwanda Tax Agent Results:`);
  console.log(`   Total Tests: ${rwandaResults.totalTests}`);
  console.log(`   Passed: ${rwandaResults.passed}`);
  console.log(`   Failed: ${rwandaResults.failed}`);
  console.log(`   Pass Rate: ${rwandaResults.passRate.toFixed(1)}%`);

  if (rwandaResults.failed > 0) {
    console.log('\n   Failed Tests:');
    rwandaResults.results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.testCaseId}: ${r.errors.join(', ')}`);
      });
  }

  // Test 2: Audit Planning Agent
  console.log('\n\n🧪 Testing Audit Planning Agent...\n');
  const auditAgent = new AuditPlanningAgentRAG(process.env.OPENAI_API_KEY!);

  const auditResults = await runner.runTestSuite(AUDIT_PLANNING_TEST_SUITE, auditAgent);

  console.log(`\n✅ Audit Planning Agent Results:`);
  console.log(`   Total Tests: ${auditResults.totalTests}`);
  console.log(`   Passed: ${auditResults.passed}`);
  console.log(`   Failed: ${auditResults.failed}`);
  console.log(`   Pass Rate: ${auditResults.passRate.toFixed(1)}%`);

  if (auditResults.failed > 0) {
    console.log('\n   Failed Tests:');
    auditResults.results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.testCaseId}: ${r.errors.join(', ')}`);
      });
  }

  // Overall summary
  const totalTests = rwandaResults.totalTests + auditResults.totalTests;
  const totalPassed = rwandaResults.passed + auditResults.passed;
  const overallPassRate = (totalPassed / totalTests) * 100;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Overall Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Total Passed: ${totalPassed}`);
  console.log(`Total Failed: ${totalTests - totalPassed}`);
  console.log(`Overall Pass Rate: ${overallPassRate.toFixed(1)}%`);
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Completed at:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════');

  // Exit with error if pass rate < 80%
  if (overallPassRate < 80) {
    console.error('\n❌ Tests failed! Pass rate below 80%');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

main();
