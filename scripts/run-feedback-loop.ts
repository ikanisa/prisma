#!/usr/bin/env ts-node

/**
 * Feedback Loop Scheduler
 * 
 * Runs periodically to analyze agent performance and suggest improvements.
 * Can be run as a cron job or scheduled GitHub Action.
 */

import { runFeedbackLoopAnalysis, getFeedbackLoopEngine } from '../packages/lib/src/feedback-loop';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Agent Feedback Loop Analysis');
  console.log('Started at:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Run main analysis
    await runFeedbackLoopAnalysis();

    // Get summary of pending items
    const engine = getFeedbackLoopEngine();

    const pendingEvents = await engine.getPendingLearningEvents(10);
    const sourceSuggestions = await engine.getKnowledgeSourceSuggestions('pending');
    const classificationImprovements = await engine.getClassificationImprovements('pending');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Pending learning events: ${pendingEvents.length}`);
    console.log(`Knowledge source suggestions: ${sourceSuggestions.length}`);
    console.log(`Classification improvements: ${classificationImprovements.length}`);

    if (sourceSuggestions.length > 0) {
      console.log('\nTop Knowledge Source Suggestions:');
      sourceSuggestions.slice(0, 5).forEach((s, i) => {
        console.log(
          `  ${i + 1}. ${s.suggested_url} (${s.suggested_category}/${s.suggested_jurisdiction}) - confidence: ${s.confidence_score}`
        );
      });
    }

    if (classificationImprovements.length > 0) {
      console.log('\nTop Classification Improvements:');
      classificationImprovements.slice(0, 5).forEach((c, i) => {
        console.log(
          `  ${i + 1}. "${c.original_query.substring(0, 50)}..." ${c.original_category} → ${c.suggested_category}`
        );
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('Completed at:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════════');
  } catch (error: any) {
    console.error('Error running feedback loop analysis:', error.message);
    process.exit(1);
  }
}

main();
