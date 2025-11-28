/**
 * Continuous Learning & Improvement System
 * Phase 5: Agent Learning Pipeline
 */

import type { AgentExecution, FeedbackData, LearningExample } from '../types';

interface ImprovementSuggestion {
  type: 'prompt' | 'tool' | 'knowledge' | 'workflow';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: any[];
  estimatedImpact: number;
}

export class LearningSystem {
  private feedbackBuffer: Map<string, FeedbackData[]> = new Map();
  private learningExamples: Map<string, LearningExample[]> = new Map();
  private improvements: ImprovementSuggestion[] = [];
  
  /**
   * Collect feedback from agent execution
   */
  async collectFeedback(execution: AgentExecution, feedback: FeedbackData): Promise<void> {
    const agentId = execution.agentId;
    
    if (!this.feedbackBuffer.has(agentId)) {
      this.feedbackBuffer.set(agentId, []);
    }
    
    this.feedbackBuffer.get(agentId)!.push({
      ...feedback,
      executionId: execution.id,
      timestamp: new Date()
    });
    
    // Trigger analysis if we have enough feedback
    const buffer = this.feedbackBuffer.get(agentId)!;
    if (buffer.length >= 10) {
      await this.analyzeFeedbackBatch(agentId, buffer);
      this.feedbackBuffer.set(agentId, []); // Reset buffer
    }
  }
  
  /**
   * Analyze batch of feedback to identify patterns
   */
  private async analyzeFeedbackBatch(
    agentId: string,
    feedbackBatch: FeedbackData[]
  ): Promise<void> {
    // Calculate aggregate metrics
    const avgRating = feedbackBatch.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackBatch.length;
    const corrections = feedbackBatch.filter(f => f.correction);
    const complaints = feedbackBatch.filter(f => f.complaint);
    
    // Identify improvement opportunities
    if (avgRating < 4.0) {
      this.improvements.push({
        type: 'prompt',
        priority: 'high',
        description: `Agent ${agentId} has low satisfaction (${avgRating.toFixed(2)}/5)`,
        evidence: feedbackBatch,
        estimatedImpact: 0.8
      });
    }
    
    if (corrections.length > 3) {
      const correctionPatterns = this.identifyCommonCorrections(corrections);
      this.improvements.push({
        type: 'knowledge',
        priority: 'high',
        description: `Agent ${agentId} has recurring errors: ${correctionPatterns.join(', ')}`,
        evidence: corrections,
        estimatedImpact: 0.7
      });
    }
    
    // Create learning examples from successful executions
    const goodExamples = feedbackBatch.filter(f => (f.rating || 0) >= 4.5);
    for (const example of goodExamples) {
      await this.createLearningExample(agentId, example);
    }
  }
  
  /**
   * Create learning example from feedback
   */
  private async createLearningExample(
    agentId: string,
    feedback: FeedbackData
  ): Promise<void> {
    if (!feedback.executionId) return;
    
    const example: LearningExample = {
      agentId,
      input: feedback.input || '',
      output: feedback.output || '',
      feedback: feedback.rating || 0,
      approved: feedback.rating >= 4.5,
      tags: this.extractTags(feedback),
      createdAt: new Date()
    };
    
    if (!this.learningExamples.has(agentId)) {
      this.learningExamples.set(agentId, []);
    }
    
    this.learningExamples.get(agentId)!.push(example);
  }
  
  /**
   * Generate improvement suggestions
   */
  async generateImprovementSuggestions(): Promise<ImprovementSuggestion[]> {
    // Sort by priority and estimated impact
    return this.improvements.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.estimatedImpact - a.estimatedImpact;
    });
  }
  
  /**
   * A/B Testing Framework
   */
  async createABTest(
    agentId: string,
    variantA: any,
    variantB: any,
    testConfig: {
      trafficSplit: number; // 0-1, percentage to variant B
      sampleSize: number;
      successMetric: string;
    }
  ): Promise<string> {
    const testId = `ab-test-${agentId}-${Date.now()}`;
    
    // Store test configuration
    // In production, this would be persisted to database
    
    return testId;
  }
  
  async evaluateABTest(testId: string): Promise<{
    winner: 'A' | 'B' | 'inconclusive';
    confidence: number;
    metrics: any;
  }> {
    // Statistical analysis of A/B test results
    // Implementation would include t-test or similar
    
    return {
      winner: 'inconclusive',
      confidence: 0,
      metrics: {}
    };
  }
  
  /**
   * Fine-tuning data preparation
   */
  async prepareFineTuningDataset(
    agentId: string,
    minRating: number = 4.5
  ): Promise<Array<{ prompt: string; completion: string }>> {
    const examples = this.learningExamples.get(agentId) || [];
    
    const goodExamples = examples.filter(
      ex => ex.approved && ex.feedback >= minRating
    );
    
    return goodExamples.map(ex => ({
      prompt: ex.input,
      completion: ex.output
    }));
  }
  
  /**
   * Continuous monitoring
   */
  async monitorAgentDrift(agentId: string): Promise<{
    hasDrift: boolean;
    driftScore: number;
    recommendation: string;
  }> {
    const recentExamples = this.learningExamples.get(agentId) || [];
    
    if (recentExamples.length < 50) {
      return {
        hasDrift: false,
        driftScore: 0,
        recommendation: 'Insufficient data for drift detection'
      };
    }
    
    // Compare recent performance to baseline
    const recent = recentExamples.slice(-50);
    const baseline = recentExamples.slice(0, 50);
    
    const recentAvg = recent.reduce((sum, ex) => sum + ex.feedback, 0) / recent.length;
    const baselineAvg = baseline.reduce((sum, ex) => sum + ex.feedback, 0) / baseline.length;
    
    const driftScore = Math.abs(recentAvg - baselineAvg);
    
    if (driftScore > 0.5) {
      return {
        hasDrift: true,
        driftScore,
        recommendation: 'Consider retraining or prompt optimization'
      };
    }
    
    return {
      hasDrift: false,
      driftScore,
      recommendation: 'Performance stable'
    };
  }
  
  // Helper methods
  
  private identifyCommonCorrections(corrections: FeedbackData[]): string[] {
    const patterns: Map<string, number> = new Map();
    
    for (const correction of corrections) {
      const correctionText = correction.correction || '';
      const key = this.extractCorrectionPattern(correctionText);
      patterns.set(key, (patterns.get(key) || 0) + 1);
    }
    
    return Array.from(patterns.entries())
      .filter(([_, count]) => count >= 2)
      .map(([pattern]) => pattern);
  }
  
  private extractCorrectionPattern(correction: string): string {
    // Simple pattern extraction - in production, use NLP
    if (correction.toLowerCase().includes('incorrect')) return 'Factual error';
    if (correction.toLowerCase().includes('missing')) return 'Incomplete response';
    if (correction.toLowerCase().includes('format')) return 'Format issue';
    return 'Other';
  }
  
  private extractTags(feedback: FeedbackData): string[] {
    const tags: string[] = [];
    
    if (feedback.rating && feedback.rating >= 4.5) tags.push('high-quality');
    if (feedback.correction) tags.push('corrected');
    if (feedback.complaint) tags.push('complaint');
    
    return tags;
  }
}

/**
 * Improvement rollout manager
 */
export class ImprovementRollout {
  private activeRollouts: Map<string, any> = new Map();
  
  async createRollout(
    agentId: string,
    improvement: ImprovementSuggestion,
    strategy: 'immediate' | 'gradual' | 'canary'
  ): Promise<string> {
    const rolloutId = `rollout-${agentId}-${Date.now()}`;
    
    const rollout = {
      id: rolloutId,
      agentId,
      improvement,
      strategy,
      stage: 'testing',
      progress: 0,
      startedAt: new Date()
    };
    
    this.activeRollouts.set(rolloutId, rollout);
    
    // Start rollout process based on strategy
    if (strategy === 'immediate') {
      await this.immediateRollout(rolloutId);
    } else if (strategy === 'gradual') {
      await this.gradualRollout(rolloutId);
    } else if (strategy === 'canary') {
      await this.canaryRollout(rolloutId);
    }
    
    return rolloutId;
  }
  
  private async immediateRollout(rolloutId: string): Promise<void> {
    const rollout = this.activeRollouts.get(rolloutId);
    if (!rollout) return;
    
    // Apply improvement immediately to all instances
    rollout.progress = 100;
    rollout.stage = 'completed';
  }
  
  private async gradualRollout(rolloutId: string): Promise<void> {
    const rollout = this.activeRollouts.get(rolloutId);
    if (!rollout) return;
    
    // Gradually increase traffic over time
    // 10% -> 25% -> 50% -> 100%
    const stages = [10, 25, 50, 100];
    
    for (const percentage of stages) {
      rollout.progress = percentage;
      // Wait for monitoring period (e.g., 1 hour)
      await new Promise(resolve => setTimeout(resolve, 3600000));
      
      // Check metrics before proceeding
      const metricsOk = await this.checkRolloutMetrics(rolloutId);
      if (!metricsOk) {
        await this.rollbackRollout(rolloutId);
        return;
      }
    }
    
    rollout.stage = 'completed';
  }
  
  private async canaryRollout(rolloutId: string): Promise<void> {
    const rollout = this.activeRollouts.get(rolloutId);
    if (!rollout) return;
    
    // Deploy to small canary group first (5%)
    rollout.progress = 5;
    
    // Monitor for 24 hours
    await new Promise(resolve => setTimeout(resolve, 86400000));
    
    const canarySuccess = await this.checkRolloutMetrics(rolloutId);
    
    if (canarySuccess) {
      // Continue with gradual rollout
      await this.gradualRollout(rolloutId);
    } else {
      await this.rollbackRollout(rolloutId);
    }
  }
  
  private async checkRolloutMetrics(rolloutId: string): Promise<boolean> {
    // Check if metrics are acceptable during rollout
    // In production, would query actual metrics
    return true;
  }
  
  private async rollbackRollout(rolloutId: string): Promise<void> {
    const rollout = this.activeRollouts.get(rolloutId);
    if (!rollout) return;
    
    rollout.stage = 'rolled-back';
    rollout.progress = 0;
    // Revert changes
  }
}

export const learningSystem = new LearningSystem();
export const improvementRollout = new ImprovementRollout();
