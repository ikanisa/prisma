/**
 * Agent Performance Optimizer
 * 
 * Optimizes agent performance through prompt engineering,
 * caching, and intelligent model selection.
 */

import { logger } from '@prisma-glow/logger';

export interface PromptVersion {
  id: string;
  agent_id: string;
  version: number;
  prompt_template: string;
  performance_metrics: {
    accuracy: number;
    avg_response_time_ms: number;
    user_satisfaction: number;
    cost_per_execution: number;
    token_usage: {
      input: number;
      output: number;
      total: number;
    };
  };
  created_at: Date;
  is_active: boolean;
}

export interface PromptAnalysis {
  current_performance: PerformanceMetrics;
  bottlenecks: Bottleneck[];
  optimization_suggestions: OptimizationSuggestion[];
  estimated_improvement: ImprovementEstimate;
}

export interface OptimizationGoal {
  type: 'reduce_cost' | 'improve_accuracy' | 'reduce_latency' | 'better_examples';
  priority: number;
  target_improvement: number;
}

export interface PromptVariation {
  name: string;
  prompt: string;
  expected_benefit: string;
  estimated_metrics: Partial<PerformanceMetrics>;
}

export class PromptOptimizer {
  constructor(
    private readonly db: any,
    private readonly metricsCollector: any
  ) {}

  async analyzePromptPerformance(
    agentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<PromptAnalysis> {
    logger.info('Analyzing prompt performance', { agentId, timeRange });

    const executions = await this.getExecutions(agentId, timeRange);
    
    const currentPerformance = this.calculateMetrics(executions);
    const bottlenecks = this.identifyBottlenecks(executions);
    const suggestions = this.generateSuggestions(executions, bottlenecks);
    const estimatedImprovement = this.estimateImpact(suggestions);
    
    return {
      current_performance: currentPerformance,
      bottlenecks,
      optimization_suggestions: suggestions,
      estimated_improvement: estimatedImprovement
    };
  }

  async generateVariations(
    basePrompt: string,
    optimizationGoals: OptimizationGoal[]
  ): Promise<PromptVariation[]> {
    logger.info('Generating prompt variations', { 
      promptLength: basePrompt.length,
      goals: optimizationGoals.map(g => g.type)
    });

    const variations: PromptVariation[] = [];
    
    if (optimizationGoals.some(g => g.type === 'reduce_cost')) {
      const compressed = await this.compressPrompt(basePrompt);
      variations.push({
        name: 'compressed',
        prompt: compressed,
        expected_benefit: 'Lower cost (~30%), faster response (~20%)',
        estimated_metrics: {
          cost_per_execution: this.estimateCost(compressed),
          avg_response_time_ms: this.estimateResponseTime(compressed)
        }
      });
    }
    
    if (optimizationGoals.some(g => g.type === 'improve_accuracy')) {
      const explicit = await this.addExplicitInstructions(basePrompt);
      variations.push({
        name: 'explicit',
        prompt: explicit,
        expected_benefit: 'Higher accuracy (~10%), better edge case handling',
        estimated_metrics: {
          accuracy: 0.97
        }
      });
    }
    
    if (optimizationGoals.some(g => g.type === 'better_examples')) {
      const fewShot = await this.addFewShotExamples(basePrompt);
      variations.push({
        name: 'few_shot',
        prompt: fewShot,
        expected_benefit: 'Better pattern recognition, more consistent outputs',
        estimated_metrics: {
          accuracy: 0.96,
          consistency_score: 0.95
        }
      });
    }
    
    return variations;
  }

  private async compressPrompt(prompt: string): Promise<string> {
    let compressed = prompt
      .replace(/\b(please|kindly)\b/gi, '')
      .replace(/\b(you must|you should|you need to)\b/gi, '')
      .replace(/\.\s+\./g, '.')
      .trim();
    
    const abbreviations = {
      'financial statements': 'FS',
      'International Financial Reporting Standards': 'IFRS',
      'Generally Accepted Accounting Principles': 'GAAP',
      'International Standards on Auditing': 'ISA'
    };
    
    for (const [full, abbr] of Object.entries(abbreviations)) {
      compressed = compressed.replace(new RegExp(full, 'gi'), abbr);
    }
    
    if (compressed.length > 3000) {
      compressed = compressed.replace(/Example:.*?(?=\n\n|\n[A-Z]|$)/gs, '');
    }
    
    return compressed;
  }

  private async addExplicitInstructions(prompt: string): Promise<string> {
    const explicitInstructions = `

CRITICAL REQUIREMENTS:
1. Always cite specific standards/regulations when making assertions
2. Flag any assumptions made explicitly
3. Provide confidence levels for uncertain conclusions
4. Show your reasoning step-by-step for complex decisions
5. If information is missing, state what's needed rather than guessing

ERROR PREVENTION:
- Double-check all calculations
- Verify dates are in correct format
- Ensure currency codes are specified
- Validate jurisdictional applicability
- Cross-reference with knowledge base before responding

OUTPUT FORMAT:
- Use clear headings and bullet points
- Separate facts from analysis
- Highlight key conclusions
- Include relevant references
`;
    
    return prompt + explicitInstructions;
  }

  private async addFewShotExamples(prompt: string): Promise<string> {
    const topExecutions = await this.db.agent_executions.findMany({
      where: {
        user_rating: { gte: 4 },
        accuracy_score: { gte: 0.95 }
      },
      orderBy: { user_rating: 'desc' },
      take: 3
    });
    
    const examples = topExecutions.map((exec: any, i: number) => `
Example ${i + 1}:
Input: ${this.truncate(exec.input, 200)}
Output: ${this.truncate(exec.output, 300)}
---
`).join('\n');
    
    return prompt + '\n\nEXAMPLES OF EXCELLENT RESPONSES:\n' + examples;
  }

  private calculateMetrics(executions: any[]): PerformanceMetrics {
    if (executions.length === 0) {
      throw new Error('No executions to analyze');
    }

    const accuracies = executions.map(e => e.accuracy_score).filter(Boolean);
    const responseTimes = executions.map(e => e.response_time_ms);
    const ratings = executions.map(e => e.user_rating).filter(Boolean);
    const costs = executions.map(e => e.cost);
    
    return {
      accuracy: this.average(accuracies),
      avg_response_time_ms: this.average(responseTimes),
      p95_response_time_ms: this.percentile(responseTimes, 95),
      user_satisfaction: this.average(ratings),
      cost_per_execution: this.average(costs),
      total_executions: executions.length,
      error_rate: executions.filter(e => e.status === 'error').length / executions.length
    };
  }

  private identifyBottlenecks(executions: any[]): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    const avgTokens = this.average(executions.map(e => e.token_usage?.total || 0));
    if (avgTokens > 4000) {
      bottlenecks.push({
        type: 'high_token_usage',
        severity: 'high',
        description: `Average token usage: ${avgTokens.toFixed(0)}`,
        impact: 'Increased cost and latency',
        suggestion: 'Compress prompt or use smaller model'
      });
    }
    
    const p95ResponseTime = this.percentile(
      executions.map(e => e.response_time_ms),
      95
    );
    if (p95ResponseTime > 5000) {
      bottlenecks.push({
        type: 'slow_response',
        severity: 'medium',
        description: `P95 response time: ${p95ResponseTime.toFixed(0)}ms`,
        impact: 'Poor user experience',
        suggestion: 'Optimize prompt or use faster model'
      });
    }
    
    const accuracies = executions.map(e => e.accuracy_score).filter(Boolean);
    if (accuracies.length > 0) {
      const avgAccuracy = this.average(accuracies);
      if (avgAccuracy < 0.9) {
        bottlenecks.push({
          type: 'low_accuracy',
          severity: 'critical',
          description: `Average accuracy: ${(avgAccuracy * 100).toFixed(1)}%`,
          impact: 'Unreliable outputs, high rework rate',
          suggestion: 'Add few-shot examples or use more powerful model'
        });
      }
    }
    
    return bottlenecks;
  }

  private generateSuggestions(
    executions: any[],
    bottlenecks: Bottleneck[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    for (const bottleneck of bottlenecks) {
      switch (bottleneck.type) {
        case 'high_token_usage':
          suggestions.push({
            priority: 'high',
            action: 'compress_prompt',
            description: 'Compress prompt to reduce token usage',
            expected_improvement: '30% cost reduction, 20% faster',
            implementation_effort: 'medium'
          });
          break;
          
        case 'slow_response':
          suggestions.push({
            priority: 'medium',
            action: 'cache_common_queries',
            description: 'Cache responses for common queries',
            expected_improvement: '50% faster for cached queries',
            implementation_effort: 'low'
          });
          break;
          
        case 'low_accuracy':
          suggestions.push({
            priority: 'critical',
            action: 'add_few_shot_examples',
            description: 'Add few-shot examples from top executions',
            expected_improvement: '10-15% accuracy improvement',
            implementation_effort: 'low'
          });
          break;
      }
    }
    
    return suggestions;
  }

  private estimateImpact(suggestions: OptimizationSuggestion[]): ImprovementEstimate {
    let costReduction = 0;
    let speedImprovement = 0;
    let accuracyImprovement = 0;
    
    for (const suggestion of suggestions) {
      const improvements = suggestion.expected_improvement.match(/(\d+)%/g) || [];
      const values = improvements.map(s => parseInt(s));
      
      if (suggestion.action.includes('cost') || suggestion.action.includes('compress')) {
        costReduction = Math.max(costReduction, values[0] || 0);
      }
      if (suggestion.action.includes('cache') || suggestion.action.includes('faster')) {
        speedImprovement = Math.max(speedImprovement, values[0] || 0);
      }
      if (suggestion.action.includes('accuracy') || suggestion.action.includes('few_shot')) {
        accuracyImprovement = Math.max(accuracyImprovement, values[0] || 0);
      }
    }
    
    return {
      cost_reduction_percent: costReduction,
      speed_improvement_percent: speedImprovement,
      accuracy_improvement_percent: accuracyImprovement,
      estimated_timeline_days: 7,
      confidence: 0.8
    };
  }

  private average(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private percentile(numbers: number[], p: number): number {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  private estimateCost(prompt: string): number {
    const estimatedTokens = prompt.split(/\s+/).length * 1.3;
    return (estimatedTokens / 1000) * 0.03;
  }

  private estimateResponseTime(prompt: string): number {
    const estimatedTokens = prompt.split(/\s+/).length * 1.3;
    return (estimatedTokens / 1000) * 50;
  }

  private async getExecutions(agentId: string, timeRange: any): Promise<any[]> {
    return this.db.agent_executions.findMany({
      where: {
        agent_id: agentId,
        created_at: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      }
    });
  }
}

interface PerformanceMetrics {
  accuracy: number;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  user_satisfaction: number;
  cost_per_execution: number;
  total_executions: number;
  error_rate: number;
  consistency_score?: number;
}

interface Bottleneck {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  suggestion: string;
}

interface OptimizationSuggestion {
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  description: string;
  expected_improvement: string;
  implementation_effort: 'low' | 'medium' | 'high';
}

interface ImprovementEstimate {
  cost_reduction_percent: number;
  speed_improvement_percent: number;
  accuracy_improvement_percent: number;
  estimated_timeline_days: number;
  confidence: number;
}
